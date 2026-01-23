/**
 * User Faction Stats API
 * GET /api/user/faction-stats - Get current user's faction statistics
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's faction stats
    const { data: factionStats, error: dbError } = await supabase
      .from('user_faction_stats')
      .select(`
        *,
        faction:factions(name, color, icon, description)
      `)
      .eq('user_id', user.id)
      .order('total_xp', { ascending: false });

    if (dbError) {
      console.error('Failed to fetch faction stats:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch faction stats' },
        { status: 500 }
      );
    }

    return NextResponse.json(factionStats || []);
  } catch (error) {
    console.error('Faction stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch faction stats' },
      { status: 500 }
    );
  }
}
