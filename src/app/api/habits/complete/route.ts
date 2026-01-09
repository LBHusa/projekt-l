import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logHabitCompletion } from '@/lib/data/habits';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function POST(request: NextRequest) {
  try {
    const { habitId, reminderId } = await request.json();

    if (!habitId) {
      return NextResponse.json(
        { error: 'habitId is required' },
        { status: 400 }
      );
    }

    // Log habit completion
    const result = await logHabitCompletion(habitId, true, 'Completed via notification', TEST_USER_ID);

    // Update reminder delivery log
    if (reminderId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase
        .from('reminder_delivery_log')
        .update({
          clicked: true,
          action_taken: 'completed',
        })
        .eq('reminder_id', reminderId)
        .order('sent_at', { ascending: false })
        .limit(1);
    }

    return NextResponse.json({
      success: true,
      xpGained: result.xpGained,
      newStreak: result.newStreak,
    });
  } catch (error) {
    console.error('Error completing habit:', error);
    return NextResponse.json(
      { error: 'Failed to complete habit' },
      { status: 500 }
    );
  }
}
