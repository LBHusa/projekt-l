/**
 * Single Quest API
 * GET /api/quests/[id] - Get single quest by ID
 * PATCH /api/quests/[id] - Update quest by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { questUpdateSchema, sanitizeHtml, sanitizeText } from '@/lib/validation'

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const questId = params.id

    // Parse and validate input
    const body = await request.json()
    const validation = questUpdateSchema.safeParse({ ...body, id: questId })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Sanitize text fields if present
    const updateData: Record<string, unknown> = {}

    if (validation.data.title !== undefined) {
      updateData.title = sanitizeText(validation.data.title)
    }

    if (validation.data.description !== undefined) {
      updateData.description = sanitizeHtml(validation.data.description)
    }

    if (validation.data.xp_reward !== undefined) {
      updateData.xp_reward = validation.data.xp_reward
    }

    if (validation.data.skill_id !== undefined) {
      updateData.skill_id = validation.data.skill_id
    }

    if (validation.data.faction_id !== undefined) {
      updateData.faction_id = validation.data.faction_id
    }

    if (validation.data.due_date !== undefined) {
      updateData.due_date = validation.data.due_date
    }

    if (validation.data.status !== undefined) {
      updateData.status = validation.data.status
    }

    // Update quest (ensure user owns it)
    const { data: quest, error: dbError } = await supabase
      .from('quests')
      .update(updateData)
      .eq('id', questId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (dbError) {
      if (dbError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Quest not found or access denied' },
          { status: 404 }
        )
      }
      console.error('Failed to update quest:', dbError)
      return NextResponse.json(
        { error: 'Failed to update quest' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      quest,
    })
  } catch (error) {
    console.error('Quest update error:', error)
    return NextResponse.json(
      { error: 'Failed to update quest' },
      { status: 500 }
    )
  }
}
