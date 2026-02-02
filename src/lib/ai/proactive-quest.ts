/**
 * Proactive Quest Generation Service
 * Phase 3: Lebendiger Buddy
 *
 * Generates quest suggestions based on:
 * - Faction inactivity (7+ days)
 * - Morning quests (if no active quests)
 *
 * Respects:
 * - User's quest-free days (e.g., weekends)
 * - User's preferences (proactive_enabled)
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getApiKeyForUser } from '@/lib/data/llm-keys';
import { getUserMemoryContext } from '@/lib/data/conversation-memory';
import { buildHybridContext } from '@/lib/ai/memory-rag';

// ============================================
// TYPES
// ============================================

interface WeakFaction {
  faction_id: string;
  faction_name: string;
  days_inactive: number;
}

interface QuestSuggestion {
  userId: string;
  questType: 'daily' | 'weekly';
  difficulty: 'easy' | 'medium' | 'hard';
  title: string;
  description: string;
  motivation: string;
  targetFactionIds: string[];
  xpReward: number;
  requiredActions: number;
  triggerReason: 'inactivity' | 'morning' | 'balance';
  triggerFactionId?: string;
}

interface ProactiveCheckResult {
  shouldGenerate: boolean;
  reason?: string;
  weakFaction?: WeakFaction;
}

// ============================================
// SERVICE ROLE CLIENT
// ============================================

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// CHECKS
// ============================================

/**
 * Check if proactive generation should run for user
 */
export async function checkShouldGenerateProactive(
  userId: string
): Promise<ProactiveCheckResult> {
  const supabase = getServiceClient();

  // Check user preferences
  const { data: prefs } = await supabase
    .from('user_quest_preferences')
    .select('proactive_enabled, quest_free_days')
    .eq('user_id', userId)
    .single();

  // Default: proactive enabled
  const proactiveEnabled = prefs?.proactive_enabled ?? true;
  if (!proactiveEnabled) {
    return { shouldGenerate: false, reason: 'proactive_disabled' };
  }

  // Check if quest-free day
  const { data: isQuestFree } = await supabase.rpc('is_quest_free_day', {
    p_user_id: userId,
  });

  if (isQuestFree) {
    return { shouldGenerate: false, reason: 'quest_free_day' };
  }

  // Check for weak faction (7+ days inactive)
  const { data: weakFactions } = await supabase.rpc('get_weakest_faction', {
    p_user_id: userId,
  });

  if (weakFactions && weakFactions.length > 0) {
    return {
      shouldGenerate: true,
      reason: 'faction_inactivity',
      weakFaction: weakFactions[0],
    };
  }

  return { shouldGenerate: false, reason: 'no_weak_factions' };
}

/**
 * Check if morning quest should be generated
 */
export async function checkShouldGenerateMorningQuest(
  userId: string
): Promise<ProactiveCheckResult> {
  const supabase = getServiceClient();

  // Check user preferences
  const { data: prefs } = await supabase
    .from('user_quest_preferences')
    .select('morning_quests_enabled, quest_free_days')
    .eq('user_id', userId)
    .single();

  const morningEnabled = prefs?.morning_quests_enabled ?? true;
  if (!morningEnabled) {
    return { shouldGenerate: false, reason: 'morning_disabled' };
  }

  // Check if quest-free day
  const { data: isQuestFree } = await supabase.rpc('is_quest_free_day', {
    p_user_id: userId,
  });

  if (isQuestFree) {
    return { shouldGenerate: false, reason: 'quest_free_day' };
  }

  // Check if user has active quests
  const { data: hasActive } = await supabase.rpc('has_active_quests', {
    p_user_id: userId,
  });

  if (hasActive) {
    return { shouldGenerate: false, reason: 'has_active_quests' };
  }

  return { shouldGenerate: true, reason: 'no_active_quests' };
}

// ============================================
// QUEST GENERATION
// ============================================

/**
 * Generate a proactive quest suggestion
 */
export async function generateProactiveQuest(
  userId: string,
  triggerReason: 'inactivity' | 'morning' | 'balance',
  targetFaction?: WeakFaction
): Promise<QuestSuggestion | null> {
  // Get API key
  const keyResult = await getApiKeyForUser(userId, 'anthropic');
  if (!keyResult) {
    console.error('[Proactive Quest] No API key for user:', userId);
    return null;
  }

  // Get memory context for personalization
  let memoryContext = '';
  try {
    const summary = await getUserMemoryContext(userId);
    if (summary?.weekly_summary) {
      memoryContext = `## User Memory\n${summary.weekly_summary}`;
    }
  } catch (e) {
    console.error('[Proactive Quest] Memory context error:', e);
  }

  // Build prompt
  const prompt = buildProactiveQuestPrompt(triggerReason, targetFaction, memoryContext);

  // Generate quest
  const anthropic = new Anthropic({ apiKey: keyResult.apiKey });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = parseProactiveQuestResponse(text);

    if (!parsed) {
      console.error('[Proactive Quest] Failed to parse response');
      return null;
    }

    return {
      userId,
      questType: 'daily',
      difficulty: parsed.difficulty,
      title: parsed.title,
      description: parsed.description,
      motivation: parsed.motivation,
      targetFactionIds: targetFaction ? [targetFaction.faction_id] : [],
      xpReward: parsed.xpReward,
      requiredActions: parsed.requiredActions,
      triggerReason,
      triggerFactionId: targetFaction?.faction_id,
    };
  } catch (error) {
    console.error('[Proactive Quest] Generation error:', error);
    return null;
  }
}

/**
 * Save quest suggestion to database
 */
export async function saveQuestSuggestion(
  suggestion: QuestSuggestion
): Promise<string | null> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('quest_suggestions')
    .insert({
      user_id: suggestion.userId,
      quest_type: suggestion.questType,
      difficulty: suggestion.difficulty,
      title: suggestion.title,
      description: suggestion.description,
      motivation: suggestion.motivation,
      target_faction_ids: suggestion.targetFactionIds,
      xp_reward: suggestion.xpReward,
      required_actions: suggestion.requiredActions,
      trigger_reason: suggestion.triggerReason,
      trigger_faction_id: suggestion.triggerFactionId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Proactive Quest] Save error:', error);
    return null;
  }

  return data.id;
}

// ============================================
// PROMPT BUILDING
// ============================================

function buildProactiveQuestPrompt(
  triggerReason: string,
  targetFaction?: WeakFaction,
  memoryContext?: string
): string {
  const factionInfo = targetFaction
    ? `Der User war ${targetFaction.days_inactive} Tage im Bereich "${targetFaction.faction_name}" inaktiv.`
    : 'Der User hat keine aktiven Quests.';

  const reasonText = {
    inactivity: 'Du generierst eine Quest um einen vernachlässigten Lebensbereich wieder zu aktivieren.',
    morning: 'Du generierst eine motivierende Morgen-Quest um den Tag zu starten.',
    balance: 'Du generierst eine Quest für Balance zwischen den Lebensbereichen.',
  }[triggerReason];

  return `Du bist der Quest-Generator für "Projekt L", ein Life Gamification System.

${reasonText}

${factionInfo}

${memoryContext || ''}

# WICHTIG: TON DER NACHRICHT

Die Quest-Motivation muss NEUTRAL-WEISE sein:
- NICHT fordernd ("Du vernachlässigst...", "Du musst...")
- NICHT zu sanft ("Magst du vielleicht...")
- Objektiv, aber warmherzig

Beispiel:
"Dein Finanz-Bereich war 7 Tage ruhig. Hier ist eine kleine Quest um wieder einzusteigen."

# QUEST ANFORDERUNGEN

- Typ: Daily Quest
- Schwierigkeit: easy oder medium (nicht überfordernd!)
- Muss in einem Tag schaffbar sein
- 1-2 konkrete Aktionen
- XP: 30-80 (basierend auf Aufwand)

# OUTPUT FORMAT (JSON)

Antworte NUR mit diesem JSON:
{
  "title": "Quest-Titel (max 50 Zeichen)",
  "description": "Was genau zu tun ist (max 200 Zeichen)",
  "motivation": "Warum diese Quest? (neutral-weise, max 100 Zeichen)",
  "difficulty": "easy" | "medium",
  "requiredActions": 1 | 2,
  "xpReward": 30-80
}`;
}

// ============================================
// RESPONSE PARSING
// ============================================

interface ParsedQuest {
  title: string;
  description: string;
  motivation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  requiredActions: number;
  xpReward: number;
}

function parseProactiveQuestResponse(text: string): ParsedQuest | null {
  try {
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      title: String(parsed.title || '').slice(0, 100),
      description: String(parsed.description || '').slice(0, 500),
      motivation: String(parsed.motivation || '').slice(0, 200),
      difficulty: ['easy', 'medium', 'hard'].includes(parsed.difficulty)
        ? parsed.difficulty
        : 'medium',
      requiredActions: Math.max(1, Math.min(5, parseInt(parsed.requiredActions, 10) || 1)),
      xpReward: Math.max(20, Math.min(100, parseInt(parsed.xpReward, 10) || 50)),
    };
  } catch (error) {
    console.error('[Proactive Quest] Parse error:', error);
    return null;
  }
}

// ============================================
// FULL PROACTIVE CHECK (for scheduler)
// ============================================

/**
 * Run proactive quest check for a user
 * Returns suggestion ID if created, null otherwise
 */
export async function runProactiveQuestCheck(userId: string): Promise<string | null> {
  console.log(`[Proactive Quest] Checking user ${userId}`);

  // Check if should generate
  const check = await checkShouldGenerateProactive(userId);

  if (!check.shouldGenerate) {
    console.log(`[Proactive Quest] Skip: ${check.reason}`);
    return null;
  }

  // Generate quest
  const suggestion = await generateProactiveQuest(
    userId,
    check.reason === 'faction_inactivity' ? 'inactivity' : 'balance',
    check.weakFaction
  );

  if (!suggestion) {
    console.log('[Proactive Quest] Generation failed');
    return null;
  }

  // Save suggestion
  const suggestionId = await saveQuestSuggestion(suggestion);

  if (suggestionId) {
    console.log(`[Proactive Quest] Created suggestion ${suggestionId}`);
  }

  return suggestionId;
}

/**
 * Run morning quest check for a user
 */
export async function runMorningQuestCheck(userId: string): Promise<string | null> {
  console.log(`[Morning Quest] Checking user ${userId}`);

  const check = await checkShouldGenerateMorningQuest(userId);

  if (!check.shouldGenerate) {
    console.log(`[Morning Quest] Skip: ${check.reason}`);
    return null;
  }

  const suggestion = await generateProactiveQuest(userId, 'morning');

  if (!suggestion) {
    console.log('[Morning Quest] Generation failed');
    return null;
  }

  const suggestionId = await saveQuestSuggestion(suggestion);

  if (suggestionId) {
    console.log(`[Morning Quest] Created suggestion ${suggestionId}`);
  }

  return suggestionId;
}
