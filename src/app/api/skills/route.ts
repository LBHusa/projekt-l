/**
 * Skills API
 * GET /api/skills - List all skills
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

    // Check for domain_id filter
    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domain_id')

    // Build query
    let query = supabase
      .from('skills')
      .select('*')
      .order('display_order', { ascending: true })

    if (domainId) {
      query = query.eq('domain_id', domainId)
    }

    const { data: skills, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ skills: skills || [] })
  } catch (error) {
    console.error('Failed to fetch skills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skills' },
      { status: 500 }
    )
  }
}
