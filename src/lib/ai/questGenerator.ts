/**
 * AI Quest Generator Service
 * Generates personalized quests using Anthropic Claude API
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// Types for quest generation context
interface UserQuestContext {
  userId: string
  skills: Array<{
    id: string
    name: string
    domain: string
    level: number
    current_xp: number
    last_used: string | null
  }>
  factions: Array<{
    id: string
    name: string
    total_xp: number
    weekly_xp: number
    level: number
  }>
  preferences: {
    preferred_difficulty: string
    daily_quest_count: number
    weekly_quest_count: number
    enable_story_quests: boolean
    prefer_balanced_quests: boolean
    challenge_level: number
    focus_faction_ids: string[]
    focus_skill_ids: string[]
  }
  recentActivities: Array<{
    description: string
    xp_gained: number
    date: string
  }>
}

interface GeneratedQuest {
  type: 'daily' | 'weekly' | 'story'
  difficulty: 'easy' | 'medium' | 'hard' | 'epic'
  title: string
  description: string
  motivation: string
  target_skill_ids: string[]
  target_faction_ids: string[]
  xp_reward: number
  required_actions: number
  expires_at?: Date
}

// Anthropic Client Setup with timeout
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 25000, // 25 seconds timeout
})

const QUEST_GENERATION_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_RETRIES = 1

/**
 * Fetch user context for quest generation
 */
export async function getUserQuestContext(userId: string): Promise<UserQuestContext> {
  const supabase = await createClient()

  // Fetch user skills
  const { data: userSkills } = await supabase
    .from('user_skills')
    .select(`
      id,
      skill_id,
      level,
      current_xp,
      last_used,
      skills (
        id,
        name,
        skill_domains (
          name
        )
      )
    `)
    .eq('user_id', userId)
    .order('last_used', { ascending: false, nullsFirst: false })
    .limit(20)

  // Fetch faction stats
  const { data: factionStats } = await supabase
    .from('user_faction_stats')
    .select(`
      faction_id,
      total_xp,
      weekly_xp,
      level,
      factions (
        name
      )
    `)
    .eq('user_id', userId)

  // Fetch user preferences
  const { data: preferences } = await supabase
    .from('user_quest_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Fetch recent activities
  const { data: recentActivities } = await supabase
    .from('experiences')
    .select('description, xp_gained, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10)

  // Transform data for AI context
  const skills = (userSkills || []).map((us: any) => ({
    id: us.skills.id,
    name: us.skills.name,
    domain: us.skills.skill_domains?.name || 'Unknown',
    level: us.level,
    current_xp: us.current_xp,
    last_used: us.last_used,
  }))

  const factions = (factionStats || []).map((fs: any) => ({
    id: fs.faction_id,
    name: fs.factions.name,
    total_xp: fs.total_xp,
    weekly_xp: fs.weekly_xp,
    level: fs.level,
  }))

  return {
    userId,
    skills,
    factions,
    preferences: preferences || {
      preferred_difficulty: 'medium',
      daily_quest_count: 3,
      weekly_quest_count: 2,
      enable_story_quests: true,
      prefer_balanced_quests: true,
      challenge_level: 5,
      focus_faction_ids: [],
      focus_skill_ids: [],
    },
    recentActivities: recentActivities || [],
  }
}

/**
 * Generate AI quests using Claude with retry logic
 */
export async function generateQuests(
  context: UserQuestContext,
  questType: 'daily' | 'weekly' | 'story',
  count: number = 1
): Promise<GeneratedQuest[]> {
  const contextPrompt = buildContextPrompt(context, questType, count)

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await anthropic.messages.create({
        model: QUEST_GENERATION_MODEL,
        max_tokens: 4000,
        temperature: 0.8,
        messages: [{ role: 'user', content: contextPrompt }],
      })

      const responseText = message.content[0].type === 'text'
        ? message.content[0].text
        : ''

      return parseQuestResponse(responseText, questType, context)
    } catch (error: any) {
      lastError = error
      const isTimeout = error.message?.includes('timeout') ||
                       error.code === 'ETIMEDOUT' ||
                       error.code === 'ECONNABORTED'

      if (isTimeout && attempt < MAX_RETRIES) {
        console.warn(`[Quest Generator] Timeout on attempt ${attempt + 1}, retrying...`)
        continue
      }

      console.error(`[Quest Generator] Error on attempt ${attempt + 1}:`, error.message)
      throw error
    }
  }

  throw lastError || new Error('Quest generation failed after retries')
}

/**
 * Build context prompt for Claude
 */
function buildContextPrompt(context: UserQuestContext, questType: string, count: number = 1): string {
  return `Du bist der KI-Questmaster für "Projekt L", ein Life-Gamification-System.

**SPRACHE: Du antwortest IMMER auf Deutsch. Alle Quest-Titel, Beschreibungen und Motivationen müssen auf Deutsch sein - ohne Ausnahme.**

Deine Aufgabe ist es, personalisierte ${questType} Quests für den User zu generieren.

## USER-KONTEXT

### Skills (Top 10) - MIT IDs für target_skill_ids
${context.skills
  .slice(0, 10)
  .map((s) => `- [${s.id}] ${s.name} (${s.domain}): Level ${s.level}, ${s.current_xp} XP${s.last_used ? `, Zuletzt: ${s.last_used}` : ''}`)
  .join('\n')}

### Lebensbereiche (Factions) - MIT IDs für target_faction_ids
${context.factions.map((f) => `- [${f.id}] ${f.name}: Level ${f.level}, Gesamt-XP: ${f.total_xp}, Diese Woche: ${f.weekly_xp}`).join('\n')}

### Letzte Aktivitäten
${context.recentActivities.slice(0, 5).map((a) => `- ${a.date}: ${a.description} (+${a.xp_gained} XP)`).join('\n')}

### User-Präferenzen
- Bevorzugte Schwierigkeit: ${context.preferences.preferred_difficulty}
- Herausforderungs-Level: ${context.preferences.challenge_level}/10
- Balance bevorzugt: ${context.preferences.prefer_balanced_quests}
- Fokus-Bereiche: ${context.preferences.focus_faction_ids.join(', ') || 'Alle Bereiche'}

## QUEST-ANFORDERUNGEN

### Quest-Typ: ${questType.toUpperCase()}
${
  questType === 'daily'
    ? `- Muss an einem Tag abschließbar sein
- Läuft nach 24 Stunden ab
- 1-3 erforderliche Aktionen
- XP-Belohnung: 50-200`
    : questType === 'weekly'
      ? `- Muss innerhalb einer Woche abschließbar sein
- Läuft nach 7 Tagen ab
- 3-7 erforderliche Aktionen
- XP-Belohnung: 200-500`
      : `- Mehrteilige Story-Quest
- Kein Ablaufdatum
- 5-10 erforderliche Aktionen
- XP-Belohnung: 500-1000`
}

### Balance-Überlegungen
${
  context.preferences.prefer_balanced_quests
    ? `- Identifiziere die SCHWÄCHSTEN Lebensbereiche (niedrigste Wochen-XP)
- Erstelle Quests, die helfen das Leben auszubalancieren
- Fördere vernachlässigte Skills`
    : `- Fokussiere auf die stärksten Bereiche des Users
- Nutze das aktuelle Momentum`
}

### Schwierigkeitsgrad
- Ziel: ${context.preferences.preferred_difficulty}
- User Herausforderungs-Level: ${context.preferences.challenge_level}/10

## AUSGABE-FORMAT

Generiere ${count === 1 ? 'EINE Quest' : `${count} Quests`} im folgenden JSON-Format:

\`\`\`json
{
  "quests": [
    {
      "title": "Quest-Titel (motivierend und spezifisch)",
      "description": "Detaillierte Beschreibung was zu tun ist",
      "motivation": "Warum diese Quest gerade jetzt für den User wichtig ist",
      "difficulty": "easy|medium|hard|epic",
      "target_skill_ids": ["uuid-aus-skills-liste-oben"],
      "target_faction_ids": ["uuid-aus-factions-liste-oben"],
      "xp_reward": 150,
      "required_actions": 3
    }
  ]
}
\`\`\`

## WICHTIGE REGELN

1. **Mach es persönlich**: Nutze die echten Skills und letzten Aktivitäten des Users
2. **Sei spezifisch**: "30 Min Python üben" statt "Programmieren lernen"
3. **Passende Herausforderung**: Passe die Schwierigkeit an das challenge_level an
4. **Angemessene Belohnung**: Mehr XP für schwierigere/längere Quests
5. **Kontext geben**: Die Motivation sollte erklären WARUM diese Quest hilft
6. **ECHTE IDs VERWENDEN**: Nutze die UUIDs in eckigen Klammern [uuid] als target_skill_ids und target_faction_ids - NIEMALS erfundene IDs!
7. **Mehrere Ziele möglich**: Eine Quest kann mehreren Skills/Factions nützen
8. **IMMER auf Deutsch**: Titel, Beschreibung und Motivation müssen auf Deutsch sein!

Generiere jetzt die Quests!`
}

/**
 * Validate skill IDs against available skills
 */
function validateSkillIds(ids: string[] | undefined, skills: Array<{id: string}>): string[] {
  if (!ids || !Array.isArray(ids)) return []
  const validIds = new Set(skills.map(s => s.id))
  return ids.filter(id => validIds.has(id))
}

/**
 * Validate faction IDs against available factions
 */
function validateFactionIds(ids: string[] | undefined, factions: Array<{id: string}>): string[] {
  if (!ids || !Array.isArray(ids)) return []
  const validIds = new Set(factions.map(f => f.id))
  return ids.filter(id => validIds.has(id))
}

/**
 * Parse Claude's JSON response with multiple fallback strategies
 */
function parseQuestResponse(
  responseText: string,
  questType: 'daily' | 'weekly' | 'story',
  context: UserQuestContext
): GeneratedQuest[] {
  // Multiple parsing strategies for robustness
  const strategies = [
    // Strategy 1: Standard markdown JSON block
    () => {
      const match = responseText.match(/```json\n([\s\S]*?)\n```/)
      return match ? JSON.parse(match[1]) : null
    },
    // Strategy 2: Generic code block
    () => {
      const match = responseText.match(/```\n?([\s\S]*?)\n?```/)
      return match ? JSON.parse(match[1]) : null
    },
    // Strategy 3: Find JSON object with "quests" key
    () => {
      const match = responseText.match(/\{[\s\S]*"quests"[\s\S]*\}/)
      return match ? JSON.parse(match[0]) : null
    },
    // Strategy 4: Direct JSON parse
    () => JSON.parse(responseText),
  ]

  for (const strategy of strategies) {
    try {
      const parsed = strategy()
      if (parsed?.quests || Array.isArray(parsed)) {
        const quests = parsed.quests || parsed
        return quests.map((q: any) => ({
          type: questType,
          difficulty: q.difficulty || context.preferences.preferred_difficulty,
          title: q.title || 'Quest',
          description: q.description || '',
          motivation: q.motivation || '',
          // FIXED: Validate and use AI-generated IDs instead of empty array
          target_skill_ids: validateSkillIds(q.target_skill_ids, context.skills),
          target_faction_ids: validateFactionIds(q.target_faction_ids, context.factions),
          xp_reward: q.xp_reward || calculateDefaultXP(questType, q.difficulty),
          required_actions: q.required_actions || 1,
          expires_at: calculateExpiryDate(questType),
        }))
      }
    } catch {
      // Try next strategy
    }
  }

  console.error('[Quest Generator] Failed to parse response:', responseText.slice(0, 500))
  throw new Error('Failed to parse AI response. Please try again.')
}

/**
 * Calculate default XP based on quest type and difficulty
 */
function calculateDefaultXP(
  questType: 'daily' | 'weekly' | 'story',
  difficulty: string
): number {
  const baseXP = {
    daily: 100,
    weekly: 300,
    story: 600,
  }

  const difficultyMultiplier = {
    easy: 0.7,
    medium: 1.0,
    hard: 1.5,
    epic: 2.5,
  }

  return Math.round(
    baseXP[questType] * (difficultyMultiplier[difficulty as keyof typeof difficultyMultiplier] || 1)
  )
}

/**
 * Calculate expiry date based on quest type
 */
function calculateExpiryDate(questType: 'daily' | 'weekly' | 'story'): Date | undefined {
  if (questType === 'story') return undefined // Story quests don't expire

  const now = new Date()
  if (questType === 'daily') {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24 hours
  } else if (questType === 'weekly') {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 days
  }
}

/**
 * Save generated quests to database
 */
export async function saveQuests(quests: GeneratedQuest[], userId: string) {
  const supabase = await createClient()

  const questsToInsert = quests.map((q) => ({
    user_id: userId,
    type: q.type,
    status: 'active',
    difficulty: q.difficulty,
    title: q.title,
    description: q.description,
    motivation: q.motivation,
    // FIXED: Use validated skill IDs from quest generation
    target_skill_ids: q.target_skill_ids,
    target_faction_ids: q.target_faction_ids,
    xp_reward: q.xp_reward,
    required_actions: q.required_actions,
    expires_at: q.expires_at?.toISOString(),
    ai_model: QUEST_GENERATION_MODEL,
  }))

  const { data, error } = await supabase.from('quests').insert(questsToInsert).select()

  if (error) {
    console.error('Failed to save quests:', error)
    throw new Error('Failed to save quests to database')
  }

  return data
}
