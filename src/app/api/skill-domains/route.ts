/**
 * Skill Domains API
 * GET /api/skill-domains - List all skill domains
 */

import { NextResponse } from 'next/server'
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

    // Fetch all skill domains
    const { data: domains, error } = await supabase
      .from('skill_domains')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ domains: domains || [] })
  } catch (error) {
    console.error('Failed to fetch skill domains:', error)
    return NextResponse.json(
      { error: 'Failed to fetch skill domains' },
      { status: 500 }
    )
  }
}
