// ============================================
// AI Chatbot API Endpoint
// Phase 3: Enhanced with Memory & Context
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { skillTools, executeSkillTool } from '@/lib/ai/skill-tools';
import { createClient } from '@/lib/supabase/server';
import { getApiKeyForUser } from '@/lib/data/llm-keys';
import { canUserUseAI } from '@/lib/ai/trial';
import { storeConversationBatch, getRecentMessages, getUserMemoryContext } from '@/lib/data/conversation-memory';
import { buildHybridContext, storeConversationEmbedding, ensureCollection } from '@/lib/ai/memory-rag';
import type { ConversationSource, ConversationHistory } from '@/lib/database.types';

// ============================================
// SYSTEM PROMPT
// ============================================

const BASE_SYSTEM_PROMPT = `Du bist der persönliche AI-Assistent für "Projekt L", ein Life Gamification System.

# DEINE ROLLE

Du hilfst dem User bei der Verwaltung seines gesamten Lebens durch Gamification:
- Skills entwickeln und leveln
- Finanzen tracken (Einnahmen, Ausgaben)
- Workouts/Training loggen
- Habits verfolgen und Streaks aufbauen

# USER-KONTEXT

**WICHTIG: Du hast Zugriff auf die ECHTEN persönlichen Daten des Users!**

Der User hat:
- Existierende Skills mit Levels & XP in verschiedenen Domains
- Lebensbereiche (Factions): Karriere, Körper, Wissen, Hobby, Geist, Finanzen, Soziales
- Konten für Finanztransaktionen
- Habits mit Streaks
- Trainingslog

Nutze diese Daten AKTIV - rufe zuerst list_user_skills auf um zu sehen was der User hat!

# VERFÜGBARE TOOLS

## Skill-Management
- **list_user_skills** - Zeige alle Skills mit Level/XP (IMMER zuerst aufrufen!)
- **create_skill** - Erstelle einen neuen Skill (braucht domain_id, name, icon als Emoji)
- **add_skill_xp** - Füge XP hinzu (mit Beschreibung was gemacht wurde)
- **update_skill_level** - Setze Skill direkt auf ein Level (z.B. "Setze Python auf Level 10")
- **get_available_domains** - Zeige alle verfügbaren Domains
- **suggest_skills** - Intelligente Skill-Vorschläge basierend auf User-Profil

## Finanzen
- **log_income** - Einkommen eintragen (Gehalt, Bonus, Freelance, etc.)
- **log_expense** - Ausgaben tracken (mit Kategorie für Budget-Warnung)

## Fitness & Körper
- **log_workout** - Training loggen (cardio, strength, hiit, yoga, flexibility, sports, other)

## Habits
- **log_habit** - Habit als erledigt markieren (findet Habit per Name automatisch)

# WORKFLOW

**Wenn der User nach Skills fragt:**
1. Rufe list_user_skills() auf
2. Zeige eine übersichtliche Zusammenfassung
3. Biete Aktionen an (XP hinzufügen, neuen Skill erstellen)

**Wenn der User einen Skill erstellen will:**
1. Rufe get_available_domains() auf um die Domain zu finden
2. Frage nach Name und Icon (Emoji)
3. Erstelle den Skill

**Wenn der User von Aktivitäten berichtet:**
- "Ich war joggen" → log_workout (cardio)
- "Ich habe 50€ für Essen ausgegeben" → log_expense
- "Ich habe meditiert" → log_habit
- "Ich habe 2 Stunden Python geübt" → add_skill_xp

# NEGATIVE HABITS - Sucht & Abstinenz

**WICHTIG: Negative Habits sind sensible Themen! Immer einfühlsam und motivierend sein.**

## Negative Habit Tools
- **log_negative_habit_resistance** - User bestätigt, dass er widerstanden hat (+10 XP Bonus)
- **log_negative_habit_relapse** - User gesteht Rückfall ein (Streak reset, aber ERMUTIGEND!)

## Wann welches Tool?

**WIDERSTAND BESTÄTIGEN (positiv):**
- "Hab heute nicht geraucht/gekifft/getrunken"
- "Bin stark geblieben"
- "Heute ohne [schlechte Gewohnheit]"
- "X Tage clean"
- "Ich hab's geschafft"
→ Nutze: **log_negative_habit_resistance**
→ Antworte: Feiere den Erfolg! Zeige den Streak, gib Motivation.

**RÜCKFALL EINGESTEHEN (einfühlsam!):**
- "Ich hab heute geraucht/gekifft/getrunken"
- "Bin rückfällig geworden"
- "Hab's nicht geschafft"
- "War schwach"
- "Hab nachgegeben"
→ Nutze: **log_negative_habit_relapse**
→ WICHTIG: NIEMALS verurteilen! Rückschläge sind normal.
→ Antworte: Einfühlsam, erwähne was der User geschafft hat (vorheriger Streak), motiviere für den Neustart.

## Beispiel-Antworten

**Bei Widerstand:**
"🛡️ Mega! Tag 8 ohne Rauchen! +10 XP 💪
Du baust echte Stärke auf. Jeder Tag zählt!"

**Bei Rückfall:**
"Hey, Rückschläge passieren und gehören dazu. Du hattest 8 Tage geschafft - das ist echt stark!
Dein neuer Streak startet jetzt. Du weißt, du kannst das. 💪🔥"

# QUEST-AWARENESS

Du hast Zugriff auf die aktiven Quests des Users!

## Quest-Tools
- **list_active_quests** - Zeige alle aktiven Quests mit Fortschritt
- **update_quest_progress** - Quest-Fortschritt um einen Schritt erhöhen

## Workflow bei Aktivitäten

**WICHTIG: Bei JEDER gemeldeten Aktivität prüfst du ob sie zu einer Quest passt!**

1. Wenn der User eine Aktivität berichtet (meditiert, trainiert, gelernt, gearbeitet, etc.)
2. Rufe **list_active_quests()** auf um seine aktiven Quests zu sehen
3. Prüfe ob die Aktivität zu einer Quest passt (Keywords in title/description wie "Meditation", "Training", "Lernen", etc.)
4. Falls ja: Frage ob du den Quest-Fortschritt erhöhen sollst
5. Bei Bestätigung: **update_quest_progress(quest_id, description)** aufrufen

## Beispiel-Workflow

User: "Ich habe 20 Minuten meditiert"

1. log_meditation(duration_minutes: 20) aufrufen
2. list_active_quests() aufrufen
3. Wenn Quest "Körper-Geist-Balance" existiert (enthält "Meditation"):
   → Antwort: "🧘 Super! 20 Minuten Meditation geloggt (+10 XP Geist).
   Das passt auch zu deiner Quest 'Körper-Geist-Balance' (1/3).
   Soll ich das als Quest-Fortschritt zählen?"
4. Bei "Ja": update_quest_progress(quest_id, "20 Minuten meditiert")

## Quest-Matching Keywords

- Meditation/Achtsamkeit → Quests mit "Meditation", "Achtsamkeit", "Geist", "Balance"
- Training/Workout → Quests mit "Fitness", "Training", "Körper", "Sport"
- Lernen/Lesen → Quests mit "Lernen", "Wissen", "Lesen", "Bildung"
- Arbeiten → Quests mit "Karriere", "Projekt", "Arbeit"
- Soziales → Quests mit "Freunde", "Familie", "Networking"

# STIL

- Sehr motivierend & positiv 🎯
- Feiere Erfolge mit Emojis! 🎉
- Zeige Streaks und Level-Ups besonders hervor 🔥
- Kurze, prägnante Antworten
- Bei Fehlern: Hilfreiche Alternativen vorschlagen

# SPRACHE

**WICHTIG: Du antwortest IMMER auf Deutsch, auch wenn der User auf Englisch oder einer anderen Sprache schreibt.**`;

// ============================================
// SYSTEM PROMPT BUILDER WITH MEMORY CONTEXT
// ============================================

function buildSystemPrompt(memoryContext?: string): string {
  if (!memoryContext) {
    return BASE_SYSTEM_PROMPT;
  }

  // Inject memory context into system prompt
  return `${BASE_SYSTEM_PROMPT}

# MEMORY CONTEXT (aus vorherigen Gesprächen)

Du erinnerst dich an frühere Gespräche mit diesem User. Nutze diesen Kontext um personalisiert zu antworten:

${memoryContext}

---
Beachte: Beziehe dich auf frühere Gespräche wenn relevant, aber erzwinge es nicht.`;
}

// ============================================
// MEMORY STORAGE HELPER
// ============================================

/**
 * Store conversation messages and create embeddings
 * Called asynchronously after response is sent
 */
async function storeConversationWithEmbedding(
  inputMessages: Array<{ role: string; content: unknown }>,
  response: Anthropic.Message,
  userId: string,
  source: ConversationSource
): Promise<void> {
  try {
    // Get the last user message
    const lastUserMessage = [...inputMessages].reverse().find(
      m => m.role === 'user' && typeof m.content === 'string'
    );

    if (!lastUserMessage) return;

    // Get assistant response text
    const assistantText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    if (!assistantText) return;

    // Store both messages
    const stored = await storeConversationBatch([
      {
        role: 'user',
        content: lastUserMessage.content as string,
        source,
      },
      {
        role: 'assistant',
        content: assistantText,
        tokensUsed: response.usage?.output_tokens,
        source,
      },
    ], userId);

    // Create embeddings for stored messages (in background)
    // Only embed user message - assistant responses are derived
    const userConversation = stored.find(c => c.role === 'user');
    if (userConversation) {
      try {
        await ensureCollection();
        await storeConversationEmbedding(userConversation, userId);
      } catch (embeddingError) {
        console.error('[AI Chat] Embedding creation error (non-fatal):', embeddingError);
        // Continue - embedding failures shouldn't block chat
      }
    }

    console.log(`[AI Chat] Stored ${stored.length} messages for user ${userId}`);
  } catch (error) {
    console.error('[AI Chat] Conversation storage error:', error);
    // Don't throw - storage failures shouldn't affect user experience
  }
}

// ============================================
// ANTHROPIC CLIENT FACTORY
// ============================================

async function createAnthropicClient(userId: string): Promise<Anthropic | null> {
  const keyResult = await getApiKeyForUser(userId, 'anthropic');
  
  if (!keyResult) {
    console.error('[AI Chat] No API key available for user:', userId);
    return null;
  }
  
  console.log(`[AI Chat] Using ${keyResult.source} API key`);
  
  return new Anthropic({
    apiKey: keyResult.apiKey,
  });
}

// ============================================
// API ROUTE
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // SECURITY: Require authentication - no fallback to demo user
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const currentUserId = user.id;

    // Check trial status before proceeding
    const trialCheck = await canUserUseAI(currentUserId);

    if (!trialCheck.allowed) {
      if (trialCheck.reason === 'trial_expired') {
        return NextResponse.json(
          {
            error: 'trial_expired',
            message: 'Deine kostenlose Testphase ist abgelaufen. Bitte hinterlege deinen eigenen API-Key unter Einstellungen > Integrationen.',
            requiresApiKey: true,
            remainingMinutes: 0,
          },
          { status: 403 }
        );
      }

      if (trialCheck.reason === 'no_trial') {
        return NextResponse.json(
          {
            error: 'no_trial',
            message: 'Bitte schließe zuerst das Onboarding ab, um den KI-Assistenten zu nutzen.',
          },
          { status: 403 }
        );
      }
    }

    // Create Anthropic client with user's key or fallback
    const anthropic = await createAnthropicClient(currentUserId);

    if (!anthropic) {
      return NextResponse.json(
        {
          error: 'Kein API Key konfiguriert. Bitte hinterlege deinen Anthropic API Key unter Einstellungen > Integrationen.',
          requiresApiKey: true
        },
        { status: 400 }
      );
    }

    const { messages, source = 'web', includeMemory = true } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array required' },
        { status: 400 }
      );
    }

    const conversationSource = source as ConversationSource;

    // Build memory context if enabled (Phase 3: Lebendiger Buddy)
    let memoryContextString = '';
    if (includeMemory) {
      try {
        // Get memory context for personalization
        const recentMessages = await getRecentMessages(50, currentUserId);
        const memorySummary = await getUserMemoryContext(currentUserId);

        // Get the last user message for semantic search
        const lastUserMessage = [...messages].reverse().find(
          (m: { role: string; content: unknown }) => m.role === 'user' && typeof m.content === 'string'
        );
        const searchQuery = lastUserMessage?.content as string | undefined;

        // Build hybrid context (summary + patterns + RAG)
        const hybridContext = await buildHybridContext(
          currentUserId,
          recentMessages,
          memorySummary,
          searchQuery
        );

        memoryContextString = hybridContext.contextString;
        console.log(`[AI Chat] Memory context built: ${memoryContextString.length} chars`);
      } catch (memoryError) {
        console.error('[AI Chat] Memory context error (non-fatal):', memoryError);
        // Continue without memory - non-fatal error
      }
    }

    // Build system prompt with memory context
    const systemPrompt = buildSystemPrompt(memoryContextString);

    // Create initial request to Claude
    let response;
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages as Anthropic.MessageParam[],
        tools: skillTools,
      });
    } catch (error: unknown) {
      const err = error as { status?: number };
      // Handle authentication errors
      if (err.status === 401) {
        return NextResponse.json(
          { 
            error: 'API Key ungültig. Bitte überprüfe deinen Anthropic API Key unter Einstellungen > Integrationen.',
            requiresApiKey: true 
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Handle tool use
    if (response.stop_reason === 'tool_use') {
      // Extract tool use blocks
      const toolUses = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      // Execute all tools
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const result = await executeSkillTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          currentUserId
        );
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      // Continue conversation with tool results
      const finalResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...messages,
          {
            role: 'assistant',
            content: response.content,
          },
          {
            role: 'user',
            content: toolResults,
          },
        ] as Anthropic.MessageParam[],
        tools: skillTools,
      });

      // Store conversation in memory (async, non-blocking)
      storeConversationWithEmbedding(
        messages,
        finalResponse,
        currentUserId,
        conversationSource
      ).catch(err => console.error('[AI Chat] Memory storage error:', err));

      return NextResponse.json({
        success: true,
        response: finalResponse,
      });
    }

    // No tool use - store and return direct response
    storeConversationWithEmbedding(
      messages,
      response,
      currentUserId,
      conversationSource
    ).catch(err => console.error('[AI Chat] Memory storage error:', err));

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    return NextResponse.json(
      {
        error: true,
        message: 'Failed to process chat request',
      },
      { status: 500 }
    );
  }
}
