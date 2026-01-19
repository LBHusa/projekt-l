// ============================================
// HABIT COMPLETE API ROUTE
// Authenticates user from session
// Supports both positive and negative habits
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

    // Calculate XP and update streak
    let xpGained = 0;
    let streakBonus = 0;
    let newStreak = habit.current_streak;
    let activityTitle = '';
    let activityDescription = '';

    if (completed) {
      if (habit.habit_type === 'positive') {
        // POSITIVE HABIT: Build streak, gain XP
        newStreak = habit.current_streak + 1;
        const longestStreak = Math.max(newStreak, habit.longest_streak);
        
        const baseXp = habit.xp_per_completion || 10;
        if (newStreak >= 7) {
          streakBonus = Math.floor(newStreak / 7) * 5;
        }
        xpGained = baseXp + streakBonus;

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

        activityTitle = streakBonus > 0
          ? `${habit.icon} ${habit.name} erledigt (${newStreak} Tage Streak! +${streakBonus} Bonus)`
          : `${habit.icon} ${habit.name} erledigt`;
        activityDescription = `+${xpGained} XP`;

      } else if (habit.habit_type === 'negative') {
        // NEGATIVE HABIT: Reset streak (relapse), lose XP
        const baseXpPenalty = habit.xp_per_completion || 10;
        xpGained = -baseXpPenalty; // NEGATIVE XP!
        
        // Track how many days clean before relapse (for stats)
        const daysCleanBefore = habit.current_streak;
        newStreak = 0; // Reset streak on relapse

        const { error: updateError } = await adminClient
          .from('habits')
          .update({
            current_streak: 0, // Reset on relapse
            total_completions: habit.total_completions + 1, // Track total relapses
            updated_at: new Date().toISOString(),
          })
          .eq('id', habitId);

        if (updateError) {
          console.error('Error updating negative habit:', updateError);
        }

        activityTitle = daysCleanBefore > 0
          ? `${habit.icon} ${habit.name} - Rückfall nach ${daysCleanBefore} Tagen`
          : `${habit.icon} ${habit.name} - Rückfall geloggt`;
        activityDescription = `${xpGained} XP`;
      }
    }

    // Update faction stats if XP changed (positive OR negative)
    if (xpGained !== 0 && habit.faction_id) {
      console.log('[HABIT COMPLETE] Distributing XP:', { 
        userId, 
        factionId: habit.faction_id, 
        xpGained,
        habitType: habit.habit_type 
      });
      
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
        
        console.log('[HABIT COMPLETE] XP distributed successfully:', xpGained);
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
                total_xp: Math.max(0, existing.total_xp + xpGained), // Don't go below 0
                weekly_xp: Math.max(0, existing.weekly_xp + xpGained),
                monthly_xp: Math.max(0, existing.monthly_xp + xpGained),
                last_activity: new Date().toISOString(),
              })
              .eq('user_id', userId)
              .eq('faction_id', habit.faction_id);
          } else {
            // Only insert if positive XP (can't start with negative)
            if (xpGained > 0) {
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
        activity_type: habit.habit_type === 'negative' ? 'habit_relapse' : 'habit_completed',
        faction_id: habit.faction_id || 'karriere',
        title: activityTitle,
        description: activityDescription,
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
      isNegative: habit.habit_type === 'negative',
    });
  } catch (error) {
    console.error('Habit complete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
