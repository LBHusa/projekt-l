/**
 * Complete Quest API
 * POST /api/quests/[id]/complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const questId = params.id

    // Use Supabase function to complete quest (handles XP rewards)
    const { error } = await supabase.rpc('complete_quest', {
      p_quest_id: questId,
      p_user_id: user.id,
    })

    if (error) {
      throw error
    }

    // Fetch updated quest
    const { data: quest } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Quest completed successfully!',
      quest,
    })
  } catch (error) {
    console.error('Failed to complete quest:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to complete quest' },
      { status: 500 }
    )
  }
}
