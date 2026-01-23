import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check - user must be logged in
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reminderId, habitId, action } = await request.json();

    if (!reminderId || !action) {
      return NextResponse.json(
        { error: 'reminderId and action are required' },
        { status: 400 }
      );
    }

    // 2. Update the most recent delivery log entry
    // Note: Using authenticated client - RLS will ensure user owns the reminder
    const { error: updateError } = await supabase
      .from('reminder_delivery_log')
      .update({
        clicked: true,
        action_taken: action,
      })
      .eq('reminder_id', reminderId)
      .order('sent_at', { ascending: false })
      .limit(1);

    if (updateError) {
      console.error('[Reminder Log Action] Error:', updateError);
      return NextResponse.json({ error: 'Failed to log action' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Reminder Log Action] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
