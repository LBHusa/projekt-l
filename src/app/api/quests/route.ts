/**
 * Quest Management API
 * GET /api/quests - List user's quests
 * POST /api/quests - Create a new quest
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { questCreateSchema, sanitizeHtml, sanitizeText } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const type = searchParams.get('type')

    // Build query
    let query = supabase
      .from('quests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by type
    if (type) {
      query = query.eq('type', type)
    }

    const { data: quests, error } = await query

    if (error) {
      throw error
    }

    // Calculate additional stats
    const activeCount = await supabase
      .from('quests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    const completedCount = await supabase
      .from('quests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed')

    return NextResponse.json({
      quests,
      stats: {
        active: activeCount.count || 0,
        completed: completedCount.count || 0,
      },
    })
  } catch (error) {
    console.error('Failed to fetch quests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Parse and validate input
    const body = await request.json()
    const validation = questCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Sanitize text fields
    const sanitized = {
      ...validation.data,
      title: sanitizeText(validation.data.title),
      description: validation.data.description
        ? sanitizeHtml(validation.data.description)
        : undefined,
    }

    // Insert to database
    const { data: quest, error: dbError } = await supabase
      .from('quests')
      .insert({
        user_id: user.id,
        title: sanitized.title,
        description: sanitized.description,
        xp_reward: sanitized.xp_reward,
        skill_id: sanitized.skill_id,
        faction_id: sanitized.faction_id,
        due_date: sanitized.due_date,
        status: 'active',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Failed to create quest:', dbError)
      return NextResponse.json(
        { error: 'Failed to create quest' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      quest,
    })
  } catch (error) {
    console.error('Quest creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create quest' },
      { status: 500 }
    )
  }
}
