import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { reminderId, habitId, action } = await request.json();

    if (!reminderId || !action) {
      return NextResponse.json(
        { error: 'reminderId and action are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update the most recent delivery log entry
    await supabase
      .from('reminder_delivery_log')
      .update({
        clicked: true,
        action_taken: action,
      })
      .eq('reminder_id', reminderId)
      .order('sent_at', { ascending: false })
      .limit(1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging reminder action:', error);
    return NextResponse.json(
      { error: 'Failed to log action' },
      { status: 500 }
    );
  }
}
