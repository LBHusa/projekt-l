import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logHabitCompletion } from '@/lib/data/habits';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId, reminderId } = await request.json();

    if (!habitId) {
      return NextResponse.json(
        { error: 'habitId is required' },
        { status: 400 }
      );
    }

    // Log habit completion
    const result = await logHabitCompletion(habitId, true, 'Completed via notification', user.id);

    // Update reminder delivery log
    if (reminderId) {
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
