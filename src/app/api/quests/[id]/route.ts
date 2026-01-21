/**
 * Single Quest API
 * GET /api/quests/[id] - Get single quest by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SkillInfo {
  id: string
  name: string
  icon: string
}

interface FactionInfo {
  id: string
  name_de: string
  icon: string
  color: string
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const questId = params.id

    // Get quest with related skill and faction info
    const { data: quest, error } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
      }
      throw error
    }

    // Get related skills info if any
    let relatedSkills: SkillInfo[] = []
    if (quest.target_skill_ids && quest.target_skill_ids.length > 0) {
      const { data: skills } = await supabase
        .from('skills')
        .select('id, name, icon')
        .in('id', quest.target_skill_ids)
      relatedSkills = (skills || []) as SkillInfo[]
    }

    // Get related factions info if any
    let relatedFactions: FactionInfo[] = []
    if (quest.target_faction_ids && quest.target_faction_ids.length > 0) {
      const { data: factions } = await supabase
        .from('factions')
        .select('id, name_de, icon, color')
        .in('id', quest.target_faction_ids)
      relatedFactions = (factions || []) as FactionInfo[]
    }

    return NextResponse.json({
      quest: {
        ...quest,
        related_skills: relatedSkills,
        related_factions: relatedFactions,
      },
    })
  } catch (error) {
    console.error('Failed to fetch quest:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quest' },
      { status: 500 }
    )
  }
}
