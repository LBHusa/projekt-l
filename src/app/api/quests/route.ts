/**
 * Quest Management API
 * GET /api/quests - List user's quests
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
