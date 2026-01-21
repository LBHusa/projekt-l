/**
 * Quest Preferences API
 * GET /api/settings/quest-preferences - Get user's quest preferences
 * POST /api/settings/quest-preferences - Update user's quest preferences
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get preferences
    const { data: preferences, error } = await supabase
      .from('user_quest_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Get all factions for selection
    const { data: factions } = await supabase
      .from('factions')
      .select('id, name, name_de, icon, color')
      .order('name')

    // Get user's skills for selection
    const { data: userSkills } = await supabase
      .from('user_skills_full')
      .select('skill_id, skill_name, skill_icon, domain_name')
      .eq('user_id', user.id)
      .order('skill_name')

    // Default preferences if none exist
    const defaultPreferences = {
      preferred_difficulty: 'medium',
      daily_quest_count: 3,
      weekly_quest_count: 2,
      enable_story_quests: true,
      prefer_balanced_quests: true,
      challenge_level: 5,
      focus_faction_ids: [],
      focus_skill_ids: [],
    }

    return NextResponse.json({
      preferences: preferences || defaultPreferences,
      factions: factions || [],
      skills: userSkills || [],
    })
  } catch (error) {
    console.error('Failed to fetch quest preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      preferred_difficulty,
      daily_quest_count,
      weekly_quest_count,
      enable_story_quests,
      prefer_balanced_quests,
      challenge_level,
      focus_faction_ids,
      focus_skill_ids,
    } = body

    // Validate inputs
    if (preferred_difficulty && !['easy', 'medium', 'hard', 'epic'].includes(preferred_difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level' },
        { status: 400 }
      )
    }

    if (challenge_level !== undefined && (challenge_level < 1 || challenge_level > 10)) {
      return NextResponse.json(
        { error: 'Challenge level must be between 1 and 10' },
        { status: 400 }
      )
    }

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('user_quest_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single()

    const preferencesData = {
      user_id: user.id,
      preferred_difficulty: preferred_difficulty || 'medium',
      daily_quest_count: daily_quest_count ?? 3,
      weekly_quest_count: weekly_quest_count ?? 2,
      enable_story_quests: enable_story_quests ?? true,
      prefer_balanced_quests: prefer_balanced_quests ?? true,
      challenge_level: challenge_level ?? 5,
      focus_faction_ids: focus_faction_ids || [],
      focus_skill_ids: focus_skill_ids || [],
      updated_at: new Date().toISOString(),
    }

    let result
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('user_quest_preferences')
        .update(preferencesData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('user_quest_preferences')
        .insert({
          ...preferencesData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      success: true,
      preferences: result,
      message: 'Quest-Einstellungen gespeichert',
    })
  } catch (error) {
    console.error('Failed to update quest preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
