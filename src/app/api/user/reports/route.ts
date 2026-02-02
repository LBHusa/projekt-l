/**
 * User Reports API
 * GET /api/user/reports - Returns user's weekly reports
 * PATCH /api/user/reports - Marks a report as read
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserReports, markReportAsRead } from '@/lib/data/weekly-reports';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const reports = await getUserReports({ limit, offset }, user.id);

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('[Reports API] Error:', error);
    return NextResponse.json({ error: 'Failed to get reports' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { report_id } = await request.json();

    if (!report_id) {
      return NextResponse.json({ error: 'report_id required' }, { status: 400 });
    }

    await markReportAsRead(report_id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Reports API] Error:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
