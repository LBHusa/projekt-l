/**
 * User Activity API
 * GET /api/user/activity - Get current user's activity log
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const activityType = searchParams.get('type');

    // Build query
    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', user.id)
      .order('occurred_at', { ascending: false })
      .limit(Math.min(limit, 100));

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    const { data: activities, error: dbError } = await query;

    if (dbError) {
      console.error('Failed to fetch activity log:', dbError);
      return NextResponse.json(
        { error: 'Failed to fetch activity log' },
        { status: 500 }
      );
    }

    return NextResponse.json(activities || []);
  } catch (error) {
    console.error('Activity log fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity log' },
      { status: 500 }
    );
  }
}
