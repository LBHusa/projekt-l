// ============================================
// Use Streak Insurance Token API
// POST /api/streak-insurance/use
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { habitId } = body;

    if (!habitId) {
      return NextResponse.json(
        { error: 'habitId is required' },
        { status: 400 }
      );
    }

    // Verify habit belongs to user
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, name')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .single();

    if (habitError || !habit) {
      return NextResponse.json(
        { error: 'Habit not found' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Find the oldest available token
    const { data: availableTokens, error: findError } = await supabase
      .from('streak_insurance_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_used', false)
      .gt('expires_at', now)
      .order('expires_at', { ascending: true })
      .limit(1);

    if (findError) {
      console.error('[Streak Insurance Use API] Error finding token:', findError);
      return NextResponse.json(
        { error: 'Failed to find available token' },
        { status: 500 }
      );
    }

    if (!availableTokens || availableTokens.length === 0) {
      return NextResponse.json(
        { error: 'No tokens available' },
        { status: 400 }
      );
    }

    // Use the token
    const { data: token, error: updateError } = await supabase
      .from('streak_insurance_tokens')
      .update({
        is_used: true,
        used_at: now,
        used_for_habit_id: habitId,
      })
      .eq('id', availableTokens[0].id)
      .select()
      .single();

    if (updateError) {
      console.error('[Streak Insurance Use API] Error using token:', updateError);
      return NextResponse.json(
        { error: 'Failed to use token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      token,
      message: `Streak protected for "${habit.name}"`,
    });
  } catch (error) {
    console.error('[Streak Insurance Use API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
