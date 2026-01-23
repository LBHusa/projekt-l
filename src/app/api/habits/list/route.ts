// ============================================
// HABIT LIST API ROUTE
// Authenticates user from session
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user from session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please login' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Habits List] Error fetching habits:', error);
      return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Habits list API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
