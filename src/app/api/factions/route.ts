/**
 * Factions API
 * GET /api/factions - List all factions
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

    // Get all factions
    const { data: factions, error: dbError } = await supabase
      .from('factions')
      .select('*')
      .order('display_order', { ascending: true });

    if (dbError) {
      console.error('Failed to fetch factions:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch factions' },
        { status: 500 }
      );
    }

    return NextResponse.json(factions || []);
  } catch (error) {
    console.error('Factions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch factions' },
      { status: 500 }
    );
  }
}
