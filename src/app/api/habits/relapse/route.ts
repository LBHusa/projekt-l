// ============================================
// HABIT RELAPSE API ROUTE
// For negative habits: Log a relapse, reset streak
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
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
    const { habitId, notes } = await request.json();

    if (!habitId) {
      return NextResponse.json({ error: 'habitId is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Get habit
    const { data: habit, error: habitError } = await adminClient
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .single();

    if (habitError || !habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    // Verify ownership
    if (habit.user_id !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Verify it's a negative habit
    if (habit.habit_type !== 'negative') {
      return NextResponse.json({ error: 'This endpoint is only for negative habits' }, { status: 400 });
    }

    // Calculate previous streak
    let previousStreak = 0;
    if (habit.streak_start_date) {
      const start = new Date(habit.streak_start_date);
      const today = new Date();
      start.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      previousStreak = Math.max(0, Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const today = new Date().toISOString().split('T')[0];
    const xpPenalty = habit.xp_per_completion || 10;

    // Reset streak and update habit
    const { error: updateError } = await adminClient
      .from('habits')
      .update({
        streak_start_date: today,
        current_streak: 0,
        total_completions: habit.total_completions + 1, // Track total relapses
        updated_at: new Date().toISOString(),
      })
      .eq('id', habitId);

    if (updateError) {
      console.error('Error updating habit on relapse:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create log entry
    const { data: log, error: logError } = await adminClient
      .from('habit_logs')
      .insert({
        habit_id: habitId,
        user_id: userId,
        completed: true, // For negative habits, "completed" = relapse occurred
        notes: notes || `Rückfall nach ${previousStreak} Tagen`,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating relapse log:', logError);
    }

    // Apply XP penalty via RPC
    if (habit.faction_id) {
      try {
        await adminClient.rpc('update_faction_stats', {
          p_user_id: userId,
          p_faction_id: habit.faction_id,
          p_xp_amount: -xpPenalty,
        });
      } catch (err) {
        console.error('[RELAPSE] Error updating faction stats:', err);
      }
    }

    // Log activity
    const activityTitle = previousStreak > 0
      ? `${habit.icon} ${habit.name} - Rückfall nach ${previousStreak} Tagen`
      : `${habit.icon} ${habit.name} - Rückfall geloggt`;

    try {
      await adminClient.from('activity_log').insert({
        user_id: userId,
        activity_type: 'habit_relapse',
        faction_id: habit.faction_id || 'geist',
        title: activityTitle,
        description: notes || 'Neuer Start! Du schaffst das!',
        xp_amount: -xpPenalty,
        related_entity_type: 'habit',
        related_entity_id: habitId,
        metadata: {
          is_relapse: true,
          previous_streak: previousStreak,
        },
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }

    return NextResponse.json({
      success: true,
      log,
      habit: { ...habit, streak_start_date: today, current_streak: 0 },
      previousStreak,
      xpLost: xpPenalty,
      message: previousStreak > 0
        ? `Du hattest ${previousStreak} Tage geschafft. Dein neuer Streak startet jetzt!`
        : 'Dein Streak startet jetzt neu. Du schaffst das!',
    });
  } catch (error) {
    console.error('Habit relapse API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
