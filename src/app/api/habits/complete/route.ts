// ============================================
// HABIT COMPLETE API ROUTE
// Authenticates user from session
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
    const { habitId, completed = true, notes } = await request.json();

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

    // Create log entry
    const { data: log, error: logError } = await adminClient
      .from('habit_logs')
      .insert({
        habit_id: habitId,
        user_id: userId,
        completed,
        notes: notes || null,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Error logging habit:', logError);
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    // Update streak in habit
    let newStreak = habit.current_streak;
    if (completed && habit.habit_type === 'positive') {
      newStreak = habit.current_streak + 1;
      const longestStreak = Math.max(newStreak, habit.longest_streak);
      
      const { error: updateError } = await adminClient
        .from('habits')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          total_completions: habit.total_completions + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', habitId);

      if (updateError) {
        console.error('Error updating habit streak:', updateError);
      }
    }

    // Calculate XP
    let xpGained = 0;
    let streakBonus = 0;

    if (completed && habit.habit_type === 'positive') {
      const baseXp = habit.xp_per_completion || 10;
      if (newStreak >= 7) {
        streakBonus = Math.floor(newStreak / 7) * 5;
      }
      xpGained = baseXp + streakBonus;
    }

    // Update faction stats if XP was gained
    if (xpGained > 0 && habit.faction_id) {
      console.log('[HABIT COMPLETE] Distributing XP:', { userId, factionId: habit.faction_id, xpGained });
      
      try {
        // Use the correct RPC function: update_faction_stats
        const { error: rpcError } = await adminClient.rpc('update_faction_stats', {
          p_user_id: userId,
          p_faction_id: habit.faction_id,
          p_xp_amount: xpGained,
        });

        if (rpcError) {
          console.error('[HABIT COMPLETE] RPC error:', rpcError);
          throw rpcError;
        }
        
        console.log('[HABIT COMPLETE] XP distributed successfully');
      } catch (err) {
        console.error('[HABIT COMPLETE] Error updating faction stats:', err);
        // Fallback: direct insert/update
        try {
          const { data: existing } = await adminClient
            .from('user_faction_stats')
            .select('total_xp, weekly_xp, monthly_xp')
            .eq('user_id', userId)
            .eq('faction_id', habit.faction_id)
            .single();

          if (existing) {
            await adminClient
              .from('user_faction_stats')
              .update({
                total_xp: existing.total_xp + xpGained,
                weekly_xp: existing.weekly_xp + xpGained,
                monthly_xp: existing.monthly_xp + xpGained,
                last_activity: new Date().toISOString(),
              })
              .eq('user_id', userId)
              .eq('faction_id', habit.faction_id);
          } else {
            await adminClient
              .from('user_faction_stats')
              .insert({
                user_id: userId,
                faction_id: habit.faction_id,
                total_xp: xpGained,
                weekly_xp: xpGained,
                monthly_xp: xpGained,
                level: 1,
                last_activity: new Date().toISOString(),
              });
          }
          console.log('[HABIT COMPLETE] Fallback XP distribution succeeded');
        } catch (fallbackErr) {
          console.error('[HABIT COMPLETE] Fallback faction update failed:', fallbackErr);
        }
      }
    }

    // Log activity
    try {
      await adminClient.from('activity_log').insert({
        user_id: userId,
        activity_type: 'habit_completed',
        faction_id: habit.faction_id || 'karriere',
        title: streakBonus > 0
          ? `${habit.icon} ${habit.name} erledigt (${newStreak} Tage Streak! +${streakBonus} Bonus)`
          : `${habit.icon} ${habit.name} erledigt`,
        description: `+${xpGained} XP`,
        xp_amount: xpGained,
        related_entity_type: 'habit',
        related_entity_id: habitId,
      });
    } catch (err) {
      console.error('Error logging activity:', err);
    }

    return NextResponse.json({
      success: true,
      log,
      habit: { ...habit, current_streak: newStreak },
      xpGained,
      newStreak,
    });
  } catch (error) {
    console.error('Habit complete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
