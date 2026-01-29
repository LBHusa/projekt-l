// ============================================
// HABIT RESIST API ROUTE
// For negative habits: Log daily resistance confirmation
// Awards bonus XP (once per day)
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

    const today = new Date().toISOString().split('T')[0];

    // Calculate current streak
    let currentStreak = 0;
    if (habit.streak_start_date) {
      const start = new Date(habit.streak_start_date);
      const todayDate = new Date();
      start.setHours(0, 0, 0, 0);
      todayDate.setHours(0, 0, 0, 0);
      currentStreak = Math.max(0, Math.floor((todayDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Check if already confirmed today
    const alreadyConfirmedToday = habit.last_resistance_at === today;

    let xpGained = 0;
    let isNewResistanceToday = false;
    let newResistanceCount = habit.resistance_count || 0;
    const unlockedAchievements: any[] = [];

    if (!alreadyConfirmedToday) {
      // First confirmation today - award bonus XP
      xpGained = 10;
      isNewResistanceToday = true;
      newResistanceCount += 1;

      // Update habit
      const { error: updateError } = await adminClient
        .from('habits')
        .update({
          resistance_count: newResistanceCount,
          last_resistance_at: today,
          current_streak: currentStreak,
          longest_streak: Math.max(currentStreak, habit.longest_streak || 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', habitId);

      if (updateError) {
        console.error('Error updating habit on resistance:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Award XP via RPC
      if (habit.faction_id) {
        try {
          await adminClient.rpc('update_faction_stats', {
            p_user_id: userId,
            p_faction_id: habit.faction_id,
            p_xp_amount: xpGained,
          });
        } catch (err) {
          console.error('[RESIST] Error updating faction stats:', err);
        }
      }

      // Log activity
      try {
        await adminClient.from('activity_log').insert({
          user_id: userId,
          activity_type: 'habit_completed',
          faction_id: habit.faction_id || 'geist',
          title: `${habit.icon} Heute stark geblieben! (Tag ${currentStreak})`,
          description: notes || `${currentStreak} Tage ohne ${habit.name}`,
          xp_amount: xpGained,
          related_entity_type: 'habit',
          related_entity_id: habitId,
          metadata: {
            is_resistance: true,
            current_streak: currentStreak,
          },
        });
      } catch (err) {
        console.error('Error logging activity:', err);
      }

      // Check and update habit-specific achievements
      const { data: habitAchievements } = await adminClient
        .from('habit_achievements')
        .select('*')
        .eq('habit_id', habitId)
        .eq('is_unlocked', false);

      if (habitAchievements) {
        for (const achievement of habitAchievements) {
          if (currentStreak >= achievement.target_value) {
            // Unlock achievement
            const { data: unlocked, error: unlockError } = await adminClient
              .from('habit_achievements')
              .update({
                current_progress: currentStreak,
                is_unlocked: true,
                unlocked_at: new Date().toISOString(),
              })
              .eq('id', achievement.id)
              .select()
              .single();

            if (!unlockError && unlocked) {
              unlockedAchievements.push(unlocked);

              // Award achievement XP
              if (achievement.xp_reward > 0 && habit.faction_id) {
                try {
                  await adminClient.rpc('update_faction_stats', {
                    p_user_id: userId,
                    p_faction_id: habit.faction_id,
                    p_xp_amount: achievement.xp_reward,
                  });
                } catch (err) {
                  console.error('[RESIST] Error awarding achievement XP:', err);
                }
              }

              // Log achievement
              try {
                await adminClient.from('activity_log').insert({
                  user_id: userId,
                  activity_type: 'achievement_unlocked',
                  faction_id: habit.faction_id || 'geist',
                  title: `${achievement.icon} ${achievement.name} freigeschaltet!`,
                  description: achievement.description || `${currentStreak} Tage geschafft`,
                  xp_amount: achievement.xp_reward,
                  related_entity_type: 'habit_achievement',
                  related_entity_id: achievement.id,
                });
              } catch (err) {
                console.error('Error logging achievement activity:', err);
              }
            }
          } else {
            // Update progress
            await adminClient
              .from('habit_achievements')
              .update({ current_progress: currentStreak })
              .eq('id', achievement.id);
          }
        }
      }
    }

    const updatedHabit = {
      ...habit,
      resistance_count: newResistanceCount,
      last_resistance_at: today,
      current_streak: currentStreak,
      longest_streak: Math.max(currentStreak, habit.longest_streak || 0),
    };

    return NextResponse.json({
      success: true,
      habit: updatedHabit,
      currentStreak,
      xpGained,
      isNewResistanceToday,
      unlockedAchievements,
      message: isNewResistanceToday
        ? `Super! Tag ${currentStreak} ohne ${habit.name}! +${xpGained} XP`
        : `Du hast heute bereits bestätigt. Aktueller Streak: ${currentStreak} Tage`,
    });
  } catch (error) {
    console.error('Habit resist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
