/**
 * Quest Progress API
 * POST /api/quests/[id]/progress
 * Allows users to increment/decrement quest progress or complete the quest
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addXp, levelFromXp } from '@/lib/xp'
import { z } from 'zod'

const progressSchema = z.object({
  action: z.enum(['increment', 'decrement', 'complete']),
  description: z.string().max(500).optional(),
  habit_log_id: z.string().uuid().optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user from session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      )
    }

    const userId = user.id
    const adminClient = createAdminClient()
    const params = await context.params
    const questId = params.id

    // Parse and validate input
    const body = await request.json()
    const validation = progressSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { action, description, habit_log_id } = validation.data

    // Get quest details first
    const { data: quest, error: questError } = await adminClient
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single()

    if (questError || !quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
    }

    // Verify ownership
    if (quest.user_id !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (quest.status !== 'active') {
      return NextResponse.json(
        { error: 'Quest is not active' },
        { status: 400 }
      )
    }

    // Check if expired
    if (quest.expires_at && new Date(quest.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Quest has expired' },
        { status: 400 }
      )
    }

    let newCompletedActions = quest.completed_actions || 0
    let questCompleted = false
    let xpAwarded = 0

    if (action === 'increment') {
      newCompletedActions = Math.min(
        newCompletedActions + 1,
        quest.required_actions || 1
      )
    } else if (action === 'decrement') {
      newCompletedActions = Math.max(newCompletedActions - 1, 0)
    } else if (action === 'complete') {
      newCompletedActions = quest.required_actions || 1
    }

    // Calculate new progress percentage
    const newProgress = Math.round(
      (newCompletedActions / (quest.required_actions || 1)) * 100
    )

    // Check if quest is now complete
    questCompleted = newCompletedActions >= (quest.required_actions || 1)

    // Log the action to quest_actions table
    if (action === 'increment' || action === 'complete') {
      try {
        await adminClient.from('quest_actions').insert({
          quest_id: questId,
          user_id: userId,
          description: description || `Schritt ${newCompletedActions} von ${quest.required_actions}`,
          habit_log_id: habit_log_id || null,
        })
      } catch (err) {
        console.error('Error logging quest action:', err)
        // Non-critical, continue
      }
    }

    // Update quest
    const updateData: Record<string, unknown> = {
      completed_actions: newCompletedActions,
      progress: newProgress,
    }

    if (questCompleted) {
      updateData.status = 'completed'
      updateData.completed_at = new Date().toISOString()
      xpAwarded = quest.xp_reward || 50

      // Award XP to user profile
      try {
        const { data: profile } = await adminClient
          .from('user_profiles')
          .select('total_xp')
          .eq('user_id', userId)
          .single()

        if (profile) {
          await adminClient
            .from('user_profiles')
            .update({ total_xp: (profile.total_xp || 0) + xpAwarded })
            .eq('user_id', userId)
        }
      } catch (err) {
        console.error('Error updating user XP:', err)
      }

      // Update faction stats
      const targetFactionIds = quest.target_faction_ids || []
      if (targetFactionIds.length > 0) {
        const xpPerFaction = Math.round(xpAwarded / targetFactionIds.length)
        for (const factionId of targetFactionIds) {
          try {
            const { data: factionStats } = await adminClient
              .from('user_faction_stats')
              .select('total_xp, weekly_xp, monthly_xp, level')
              .eq('user_id', userId)
              .eq('faction_id', factionId)
              .single()

            const oldTotalXp = factionStats?.total_xp || 0
            const newTotalXp = oldTotalXp + xpPerFaction
            const newLevel = levelFromXp(newTotalXp)

            if (factionStats) {
              await adminClient
                .from('user_faction_stats')
                .update({
                  total_xp: newTotalXp,
                  weekly_xp: (factionStats.weekly_xp || 0) + xpPerFaction,
                  monthly_xp: (factionStats.monthly_xp || 0) + xpPerFaction,
                  level: newLevel,
                })
                .eq('user_id', userId)
                .eq('faction_id', factionId)
            } else {
              await adminClient
                .from('user_faction_stats')
                .insert({
                  user_id: userId,
                  faction_id: factionId,
                  total_xp: xpPerFaction,
                  weekly_xp: xpPerFaction,
                  monthly_xp: xpPerFaction,
                  level: newLevel,
                })
            }
          } catch (err) {
            console.error('Error updating faction stats:', err)
          }
        }
      }

      // Award XP to target skills
      const targetSkillIds = quest.target_skill_ids || []
      if (targetSkillIds.length > 0) {
        const xpPerSkill = Math.round(xpAwarded / targetSkillIds.length)
        for (const skillId of targetSkillIds) {
          try {
            await adminClient.from('experiences').insert({
              user_id: userId,
              skill_id: skillId,
              description: `Quest abgeschlossen: ${quest.title}`,
              xp_gained: xpPerSkill,
              date: new Date().toISOString().split('T')[0],
            })

            const { data: userSkill } = await adminClient
              .from('user_skills')
              .select('current_xp, level')
              .eq('user_id', userId)
              .eq('skill_id', skillId)
              .single()

            if (userSkill) {
              const result = addXp(
                userSkill.level || 1,
                userSkill.current_xp || 0,
                xpPerSkill
              )
              await adminClient
                .from('user_skills')
                .update({
                  current_xp: result.newXp,
                  level: result.newLevel,
                  last_used: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('skill_id', skillId)
            }
          } catch (err) {
            console.error('Error updating skill XP:', err)
          }
        }
      }

      // Log activity
      try {
        const primaryFactionId = targetFactionIds[0] || 'karriere'
        await adminClient.from('activity_log').insert({
          user_id: userId,
          activity_type: 'quest_completed',
          faction_id: primaryFactionId,
          title: 'Quest abgeschlossen: ' + quest.title,
          description: '+' + xpAwarded + ' XP',
          xp_amount: xpAwarded,
          related_entity_type: 'quest',
          related_entity_id: questId,
        })
      } catch (err) {
        console.error('Error logging activity:', err)
      }
    }

    // Update the quest
    const { data: updatedQuest, error: updateError } = await adminClient
      .from('quests')
      .update(updateData)
      .eq('id', questId)
      .select('*')
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      quest: updatedQuest,
      completed: questCompleted,
      xp_awarded: questCompleted ? xpAwarded : undefined,
      message: questCompleted
        ? `Quest abgeschlossen! +${xpAwarded} XP`
        : `Fortschritt: ${newCompletedActions}/${quest.required_actions}`,
    })
  } catch (error) {
    console.error('Failed to update quest progress:', error)
    return NextResponse.json(
      { error: 'Failed to update quest progress' },
      { status: 500 }
    )
  }
}

// GET /api/quests/[id]/progress - Get quest actions history
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const questId = params.id

    // Verify ownership via quest
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('id, user_id')
      .eq('id', questId)
      .eq('user_id', user.id)
      .single()

    if (questError || !quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
    }

    // Get quest actions
    const { data: actions, error: actionsError } = await supabase
      .from('quest_actions')
      .select('*')
      .eq('quest_id', questId)
      .order('created_at', { ascending: true })

    if (actionsError) {
      throw actionsError
    }

    return NextResponse.json({
      actions: actions || [],
    })
  } catch (error) {
    console.error('Failed to fetch quest actions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quest actions' },
      { status: 500 }
    )
  }
}
