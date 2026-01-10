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

// Anthropic Client Setup
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const QUEST_GENERATION_MODEL = 'claude-3-5-sonnet-20241022'

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
 * Generate AI quests using Claude
 */
export async function generateQuests(
  context: UserQuestContext,
  questType: 'daily' | 'weekly' | 'story',
  count: number = 1
): Promise<GeneratedQuest[]> {
  // Build context prompt
  const contextPrompt = buildContextPrompt(context, questType, count)

  const message = await anthropic.messages.create({
    model: QUEST_GENERATION_MODEL,
    max_tokens: 4000,
    temperature: 0.8, // More creative for quest generation
    messages: [
      {
        role: 'user',
        content: contextPrompt,
      },
    ],
  })

  // Parse Claude's response
  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : ''

  return parseQuestResponse(responseText, questType, context)
}

/**
 * Build context prompt for Claude
 */
function buildContextPrompt(context: UserQuestContext, questType: string, count: number = 1): string {
  const difficultyMap = {
    easy: 1,
    medium: 3,
    hard: 5,
    epic: 8,
  }

  return `You are an AI Quest Generator for "Projekt L", a life gamification system. Your task is to generate personalized ${questType} quests for the user.

## USER CONTEXT

### Skills (Top 10)
${context.skills
  .slice(0, 10)
  .map((s) => `- ${s.name} (${s.domain}): Level ${s.level}, ${s.current_xp} XP${s.last_used ? `, Last used: ${s.last_used}` : ''}`)
  .join('\n')}

### Life Balance (Factions)
${context.factions.map((f) => `- ${f.name}: Level ${f.level}, Total XP: ${f.total_xp}, Weekly: ${f.weekly_xp}`).join('\n')}

### Recent Activities
${context.recentActivities.slice(0, 5).map((a) => `- ${a.date}: ${a.description} (+${a.xp_gained} XP)`).join('\n')}

### User Preferences
- Preferred Difficulty: ${context.preferences.preferred_difficulty}
- Challenge Level: ${context.preferences.challenge_level}/10
- Prefer Balanced Quests: ${context.preferences.prefer_balanced_quests}
- Focus Areas: ${context.preferences.focus_faction_ids.join(', ') || 'All factions'}

## QUEST GENERATION REQUIREMENTS

### Quest Type: ${questType.toUpperCase()}
${
  questType === 'daily'
    ? `- Should be completable in one day
- Expires in 24 hours
- 1-3 required actions
- XP: 50-200`
    : questType === 'weekly'
      ? `- Should be completable within a week
- Expires in 7 days
- 3-7 required actions
- XP: 200-500`
      : `- Multi-chapter story quest
- No expiration
- 5-10 required actions
- XP: 500-1000`
}

### Balance Considerations
${
  context.preferences.prefer_balanced_quests
    ? `- Identify the WEAKEST factions (lowest weekly XP)
- Create quests that help balance life areas
- Encourage neglected skills`
    : `- Focus on user's strongest areas
- Double down on current momentum`
}

### Difficulty Level
- Target: ${context.preferences.preferred_difficulty}
- User Challenge Level: ${context.preferences.challenge_level}/10

## OUTPUT FORMAT

Generate ${count === 1 ? 'ONE quest' : `${count} quests`} in the following JSON format:

\`\`\`json
{
  "quests": [
    {
      "title": "Quest title (motivating and specific)",
      "description": "Detailed description of what to do",
      "motivation": "Why this quest matters for the user right now",
      "difficulty": "easy|medium|hard|epic",
      "target_skill_ids": ["skill_id_1", "skill_id_2"],
      "target_faction_ids": ["faction_id_1"],
      "xp_reward": 150,
      "required_actions": 3
    }
  ]
}
\`\`\`

## IMPORTANT GUIDELINES

1. **Make it personal**: Use user's actual skills and recent activities
2. **Be specific**: "Practice Python for 30min" not "Learn programming"
3. **Balance challenge**: Match user's challenge_level preference
4. **Reward appropriately**: More XP for harder/longer quests
5. **Add context**: The motivation field should explain WHY this quest helps
6. **Use real IDs**: Only use skill IDs and faction IDs from the context above
7. **Multiple targets**: A quest can benefit multiple skills/factions

Generate the quests now!`
}

/**
 * Parse Claude's JSON response into quest objects
 */
function parseQuestResponse(
  responseText: string,
  questType: 'daily' | 'weekly' | 'story',
  context: UserQuestContext
): GeneratedQuest[] {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/)
    const jsonText = jsonMatch ? jsonMatch[1] : responseText

    const parsed = JSON.parse(jsonText)
    const quests = parsed.quests || []

    return quests.map((q: any) => ({
      type: questType,
      difficulty: q.difficulty || context.preferences.preferred_difficulty,
      title: q.title,
      description: q.description,
      motivation: q.motivation || '',
      target_skill_ids: q.target_skill_ids || [],
      target_faction_ids: q.target_faction_ids || [],
      xp_reward: q.xp_reward || calculateDefaultXP(questType, q.difficulty),
      required_actions: q.required_actions || 1,
      expires_at: calculateExpiryDate(questType),
    }))
  } catch (error) {
    console.error('Failed to parse quest response:', error)
    console.error('Response text:', responseText)
    throw new Error('Failed to generate quests. Please try again.')
  }
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
