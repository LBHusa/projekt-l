import { createBrowserClient } from '@/lib/supabase';
import type {
  Habit,
  HabitLog,
  HabitWithLogs,
  HabitType,
  HabitFrequency,
  FactionId,
  HabitFaction,
  HabitFactionDisplay,
  HabitWithFactions,
  HabitAchievement,
} from '@/lib/database.types';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';
import { checkHabitAchievements, checkNegativeHabitAchievements } from './achievements';
import { getUserIdOrCurrent } from '@/lib/auth-helper';

// ============================================
// HABITS DATA ACCESS
// ============================================

// await getUserIdOrCurrent() removed - now using getUserIdOrCurrent()

// ============================================
// READ OPERATIONS
// ============================================

export async function getHabits(userId?: string): Promise<Habit[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  try {
    const response = await fetch(`/api/habits/list?userId=${userId}`);
    if (!response.ok) {
      console.error('Error fetching habits:', await response.text());
      return [];
    }
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching habits:', error);
    return [];
  }
}

export async function getHabit(habitId: string): Promise<Habit | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('id', habitId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching habit:', error);
    throw error;
  }

  return data;
}

export async function getHabitsWithLogs(
  userId?: string,
  daysBack: number = 7
): Promise<HabitWithLogs[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Get habits
  const habits = await getHabits(userId);

  // Get logs for these habits
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data: logs, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', resolvedUserId)
    .gte('logged_at', startDate.toISOString())
    .order('logged_at', { ascending: false });

  if (error) {
    console.error('Error fetching habit logs:', error);
    throw error;
  }

  // Check if completed today
  const today = new Date().toISOString().split('T')[0];

  return habits.map(habit => {
    const habitLogs = (logs || []).filter(log => log.habit_id === habit.id);
    const completedToday = habitLogs.some(
      log => log.logged_at.split('T')[0] === today && log.completed
    );

    return {
      ...habit,
      logs: habitLogs,
      completedToday,
    };
  });
}

export async function getTodaysHabits(userId?: string): Promise<HabitWithLogs[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const habits = await getHabitsWithLogs(userId, 1);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

  return habits.filter(habit => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'specific_days') {
      return habit.target_days.includes(today);
    }
    return true;
  });
}

export async function getHabitsByFaction(
  factionId: FactionId,
  userId?: string
): Promise<Habit[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', resolvedUserId)
    .eq('faction_id', factionId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching habits by faction:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// WRITE OPERATIONS
// ============================================

export interface CreateHabitInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  habit_type?: HabitType;
  frequency?: HabitFrequency;
  target_days?: string[];
  xp_per_completion?: number;
  faction_id?: FactionId; // Legacy - single faction (converted to 100% weight)
  factions?: { faction_id: FactionId; weight: number }[]; // Multi-faction support
}

/**
 * Create a new habit via API (bypasses RLS)
 */
export async function createHabit(
  input: CreateHabitInput,
  userId?: string
): Promise<Habit> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  // Transform factions to API format
  const factions = input.factions?.map(f => ({
    factionId: f.faction_id,
    weight: f.weight,
  })) || (input.faction_id ? [{ factionId: input.faction_id, weight: 100 }] : []);

  const response = await fetch('/api/habits/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      icon: input.icon,
      color: input.color,
      isNegative: input.habit_type === 'negative',
      frequency: input.frequency,
      frequencyDays: input.target_days,
      xpReward: input.xp_per_completion,
      factions,
      userId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error creating habit:', errorData);
    throw new Error(errorData.error || 'Failed to create habit');
  }

  const result = await response.json();
  return result.data;
}

export async function updateHabit(
  habitId: string,
  updates: Partial<CreateHabitInput>
): Promise<Habit> {
  const supabase = createBrowserClient();

  // Extract factions from updates (not part of habits table)
  const { factions, ...habitUpdates } = updates;

  // Determine primary faction_id for legacy column if factions provided
  let updateData: Record<string, unknown> = {
    ...habitUpdates,
    updated_at: new Date().toISOString(),
  };

  if (factions && factions.length > 0) {
    const sorted = [...factions].sort((a, b) => b.weight - a.weight);
    updateData.faction_id = sorted[0].faction_id;
  }

  const { data, error } = await supabase
    .from('habits')
    .update(updateData)
    .eq('id', habitId)
    .select()
    .single();

  if (error) {
    console.error('Error updating habit:', error);
    throw error;
  }

  // Update faction assignments if provided
  if (factions !== undefined) {
    if (factions.length > 0) {
      await setHabitFactions(habitId, factions);
    } else {
      // Empty array = remove all faction assignments
      await setHabitFactions(habitId, []);
    }
  }

  return data;
}

export async function deleteHabit(habitId: string): Promise<void> {
  const supabase = createBrowserClient();

  // Soft delete - just mark as inactive
  const { error } = await supabase
    .from('habits')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', habitId);

  if (error) {
    console.error('Error deleting habit:', error);
    throw error;
  }
}

// ============================================
// HABIT LOGGING
// ============================================

/**
 * Calculate streak bonus XP
 * @param streak Current streak days
 * @returns Bonus XP amount
 */
function calculateStreakBonus(streak: number): number {
  if (streak >= 30) return 200;  // 30-day milestone
  if (streak >= 7) return 50;     // 7-day milestone
  return 0;                        // No bonus yet
}

export interface LogHabitResult {
  log: HabitLog;
  habit: Habit;
  xpGained: number;
  newStreak: number;
}

export async function logHabitCompletion(
  habitId: string,
  completed: boolean = true,
  notes?: string,
  userId?: string
): Promise<LogHabitResult> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const response = await fetch('/api/habits/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habitId, completed, notes, userId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to complete habit');
  }

  const result = await response.json();
  return {
    log: result.log,
    habit: result.habit,
    xpGained: result.xpGained,
    newStreak: result.newStreak,
  };
}


export async function getHabitLogs(
  habitId: string,
  limit: number = 30,
  userId?: string
): Promise<HabitLog[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('habit_id', habitId)
    .eq('user_id', resolvedUserId)
    .order('logged_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching habit logs:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// STATISTICS
// ============================================

export interface HabitStats {
  totalHabits: number;
  activeHabits: number;
  completedToday: number;
  totalStreaks: number;
  longestStreak: number;
  totalCompletions: number;
}

export async function getHabitStats(userId?: string): Promise<HabitStats> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const habits = await getHabitsWithLogs(userId, 1);

  const positiveHabits = habits.filter(h => h.habit_type === 'positive');

  return {
    totalHabits: habits.length,
    activeHabits: habits.filter(h => h.is_active).length,
    completedToday: positiveHabits.filter(h => h.completedToday).length,
    totalStreaks: positiveHabits.reduce((sum, h) => sum + h.current_streak, 0),
    longestStreak: Math.max(...habits.map(h => h.longest_streak), 0),
    totalCompletions: habits.reduce((sum, h) => sum + h.total_completions, 0),
  };
}

export async function getHabitCompletionRate(
  habitId: string,
  daysBack: number = 30,
  userId?: string
): Promise<number> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data, error } = await supabase
    .from('habit_logs')
    .select('completed')
    .eq('habit_id', habitId)
    .eq('user_id', resolvedUserId)
    .gte('logged_at', startDate.toISOString());

  if (error) {
    console.error('Error calculating completion rate:', error);
    return 0;
  }

  if (!data || data.length === 0) return 0;

  const completed = data.filter(log => log.completed).length;
  return Math.round((completed / daysBack) * 100);
}

// ============================================
// MULTI-FACTION SUPPORT
// ============================================

/**
 * Get all faction assignments for a habit
 */
export async function getHabitFactions(habitId: string): Promise<HabitFactionDisplay[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habit_factions')
    .select(`
      faction_id,
      weight,
      factions (
        name_de,
        icon,
        color
      )
    `)
    .eq('habit_id', habitId)
    .order('weight', { ascending: false });

  if (error) {
    console.error('Error fetching habit factions:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((hf: any) => ({
    faction_id: hf.faction_id as FactionId,
    faction_name: hf.factions?.name_de ?? '',
    faction_icon: hf.factions?.icon ?? '',
    faction_color: hf.factions?.color ?? '',
    weight: hf.weight,
  }));
}

/**
 * Get habit with all its faction assignments
 */
export async function getHabitWithFactions(habitId: string): Promise<HabitWithFactions | null> {
  const habit = await getHabit(habitId);
  if (!habit) return null;

  const factions = await getHabitFactions(habitId);

  return {
    ...habit,
    factions,
  };
}

/**
 * Set faction assignments for a habit (replaces existing)
 */
export interface SetHabitFactionsInput {
  faction_id: FactionId;
  weight: number;
}

export async function setHabitFactions(
  habitId: string,
  factions: SetHabitFactionsInput[]
): Promise<void> {
  const supabase = createBrowserClient();

  console.log('[setHabitFactions] Called with habitId:', habitId);
  console.log('[setHabitFactions] Factions received:', factions);

  // Validate weights sum to 100
  const totalWeight = factions.reduce((sum, f) => sum + f.weight, 0);
  console.log('[setHabitFactions] Total weight:', totalWeight);
  if (factions.length > 0 && totalWeight !== 100) {
    console.error('[setHabitFactions] Weight validation failed!', totalWeight);
    throw new Error(`Faction weights must sum to 100, got ${totalWeight}`);
  }

  // Delete existing assignments
  const { error: deleteError } = await supabase
    .from('habit_factions')
    .delete()
    .eq('habit_id', habitId);

  if (deleteError) {
    console.error('Error deleting habit factions:', deleteError);
    throw deleteError;
  }

  // Insert new assignments
  if (factions.length > 0) {
    const inserts = factions.map(f => ({
      habit_id: habitId,
      faction_id: f.faction_id,
      weight: f.weight,
    }));

    console.log('[setHabitFactions] Inserting:', inserts);
    const { error: insertError } = await supabase
      .from('habit_factions')
      .insert(inserts);

    if (insertError) {
      console.error('[setHabitFactions] Insert error:', insertError);
      throw insertError;
    }
    console.log('[setHabitFactions] Successfully inserted', inserts.length, 'faction assignments');
  }
}

/**
 * Add a single faction to a habit
 */
export async function addHabitFaction(
  habitId: string,
  factionId: FactionId,
  weight: number = 100
): Promise<HabitFaction> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habit_factions')
    .insert({
      habit_id: habitId,
      faction_id: factionId,
      weight,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding habit faction:', error);
    throw error;
  }

  return data;
}

/**
 * Remove a faction from a habit
 */
export async function removeHabitFaction(
  habitId: string,
  factionId: FactionId
): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('habit_factions')
    .delete()
    .eq('habit_id', habitId)
    .eq('faction_id', factionId);

  if (error) {
    console.error('Error removing habit faction:', error);
    throw error;
  }
}

/**
 * Distribute XP to all factions based on weights
 * Called when habit is completed
 */
export async function distributeHabitXpToFactions(
  habitId: string,
  totalXp: number,
  userId?: string
): Promise<void> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const factions = await getHabitFactions(habitId);

  for (const faction of factions) {
    const factionXp = Math.round((totalXp * faction.weight) / 100);
    if (factionXp > 0) {
      try {
        await updateFactionStats(faction.faction_id, factionXp, userId);
      } catch (err) {
        console.error(`Error updating faction ${faction.faction_id}:`, err);
      }
    }
  }
}

// ============================================
// TIME TRACKING
// ============================================

export async function logHabitWithTime(
  habitId: string,
  durationMinutes: number,
  notes?: string,
  trigger?: string,
  context?: string,
  userId?: string
): Promise<void> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('habit_logs')
    .insert({
      habit_id: habitId,
      user_id: resolvedUserId,
      completed: true,
      duration_minutes: durationMinutes,
      notes,
      trigger,
      context,
      logged_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error logging habit with time:', error);
    throw error;
  }

  // Award XP for positive habits
  const habit = await getHabit(habitId);
  if (habit && habit.habit_type === 'positive' && habit.xp_per_completion > 0) {
    await distributeHabitXpToFactions(habitId, habit.xp_per_completion, userId);
  }

  // Check achievements
  const totalHabits = await getHabits(resolvedUserId);
  const habitStats = await getHabitStats(resolvedUserId);
  await checkHabitAchievements(totalHabits.length, habitStats.longestStreak, resolvedUserId);

  // Log activity
  await logActivity({
    userId,
    activityType: 'habit_completed',
    factionId: 'geist', // Default to Geist for habit tracking
    title: `${habit?.name || 'Habit'} geloggt`,
    description: `${durationMinutes} Minuten`,
    xpAmount: habit?.xp_per_completion || 0,
    relatedEntityType: 'habit',
    relatedEntityId: habitId,
  });
}

export async function getTodayTimeStats(
  userId?: string
): Promise<any[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .rpc('get_today_time_summary', { p_user_id: resolvedUserId });

  if (error) {
    // PGRST116 = no rows found, or RPC returns empty - graceful degradation
    if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
      return [];
    }
    console.error('Error fetching today time stats:', error);
    return []; // Return empty array instead of throwing
  }

  return data || [];
}

export async function getDailyTimeStats(
  date: Date,
  userId?: string
): Promise<any[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('daily_time_stats')
    .select('*')
    .eq('user_id', resolvedUserId)
    .eq('log_date', date.toISOString().split('T')[0]);

  if (error) {
    console.error('Error fetching daily time stats:', error);
    throw error;
  }

  return data || [];
}

export async function getWeeklyTimeStats(
  weekStart: Date,
  userId?: string
): Promise<any[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('weekly_time_stats')
    .select('*')
    .eq('user_id', resolvedUserId)
    .eq('week_start', weekStart.toISOString());

  if (error) {
    console.error('Error fetching weekly time stats:', error);
    throw error;
  }

  return data || [];
}

export async function getActivityCategories(): Promise<any[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('activity_categories')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Error fetching activity categories:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// NEGATIVE HABIT FUNCTIONS
// ============================================

/**
 * Calculate the "days clean" streak for a negative habit
 * Streak is calculated from streak_start_date to today
 */
export function calculateNegativeHabitStreak(habit: Habit): number {
  if (habit.habit_type !== 'negative' || !habit.streak_start_date) {
    return 0;
  }
  const start = new Date(habit.streak_start_date);
  const today = new Date();
  // Reset time components to compare just dates
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Get all habit-specific achievements for a habit
 */
export async function getHabitAchievements(habitId: string): Promise<HabitAchievement[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habit_achievements')
    .select('*')
    .eq('habit_id', habitId)
    .order('target_value', { ascending: true });

  if (error) {
    console.error('Error fetching habit achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all unlocked habit achievements for a user
 */
export async function getUnlockedHabitAchievements(
  userId?: string
): Promise<HabitAchievement[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habit_achievements')
    .select('*')
    .eq('user_id', resolvedUserId)
    .eq('is_unlocked', true)
    .order('unlocked_at', { ascending: false });

  if (error) {
    console.error('Error fetching unlocked habit achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Update habit achievement progress based on current streak
 */
export async function updateHabitAchievementProgress(
  habitId: string,
  currentStreak: number,
  userId?: string
): Promise<HabitAchievement[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();
  const unlockedAchievements: HabitAchievement[] = [];

  // Get all achievements for this habit
  const achievements = await getHabitAchievements(habitId);

  for (const achievement of achievements) {
    // Skip already unlocked
    if (achievement.is_unlocked) continue;

    // Check if target reached
    if (currentStreak >= achievement.target_value) {
      // Unlock achievement
      const { data, error } = await supabase
        .from('habit_achievements')
        .update({
          current_progress: currentStreak,
          is_unlocked: true,
          unlocked_at: new Date().toISOString(),
        })
        .eq('id', achievement.id)
        .select()
        .single();

      if (!error && data) {
        unlockedAchievements.push(data);

        // Award XP
        if (achievement.xp_reward > 0) {
          await updateFactionStats('geist', achievement.xp_reward, userId);
        }

        // Log activity
        await logActivity({
          userId,
          activityType: 'achievement_unlocked',
          factionId: 'geist',
          title: `${achievement.icon} ${achievement.name} freigeschaltet!`,
          description: achievement.description || `${currentStreak} Tage geschafft`,
          xpAmount: achievement.xp_reward,
          relatedEntityType: 'habit_achievement',
          relatedEntityId: achievement.id,
        });
      }
    } else {
      // Update progress
      await supabase
        .from('habit_achievements')
        .update({ current_progress: currentStreak })
        .eq('id', achievement.id);
    }
  }

  return unlockedAchievements;
}

export interface LogRelapseResult {
  habit: Habit;
  previousStreak: number;
  xpLost: number;
  message: string;
}

/**
 * Log a relapse for a negative habit
 * - Resets streak_start_date to today
 * - Increments total_completions (relapse counter)
 * - Applies XP penalty
 * - Logs activity
 */
export async function logHabitRelapse(
  habitId: string,
  notes?: string,
  userId?: string
): Promise<LogRelapseResult> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Get current habit
  const habit = await getHabit(habitId);
  if (!habit) {
    throw new Error('Habit not found');
  }

  if (habit.habit_type !== 'negative') {
    throw new Error('This function is only for negative habits');
  }

  // Calculate previous streak before reset
  const previousStreak = calculateNegativeHabitStreak(habit);
  const today = new Date().toISOString().split('T')[0];

  // XP penalty (base XP or default 10)
  const xpPenalty = habit.xp_per_completion || 10;

  // Reset streak and update habit
  const { error: updateError } = await supabase
    .from('habits')
    .update({
      streak_start_date: today,
      current_streak: 0,
      total_completions: habit.total_completions + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', habitId);

  if (updateError) {
    console.error('Error updating habit on relapse:', updateError);
    throw updateError;
  }

  // Create log entry
  const { error: logError } = await supabase.from('habit_logs').insert({
    habit_id: habitId,
    user_id: resolvedUserId,
    completed: true, // For negative habits, "completed" means relapse
    notes: notes || `Rückfall nach ${previousStreak} Tagen`,
    logged_at: new Date().toISOString(),
  });

  if (logError) {
    console.error('Error creating relapse log:', logError);
  }

  // Apply XP penalty
  if (habit.faction_id) {
    await updateFactionStats(habit.faction_id, -xpPenalty, userId);
  }

  // Log activity
  const activityTitle = previousStreak > 0
    ? `${habit.icon} ${habit.name} - Rückfall nach ${previousStreak} Tagen`
    : `${habit.icon} ${habit.name} - Rückfall geloggt`;

  await logActivity({
    userId,
    activityType: 'habit_completed', // Using existing type for compatibility
    factionId: habit.faction_id || 'geist',
    title: activityTitle,
    description: notes || 'Neuer Start! Du schaffst das 💪',
    xpAmount: -xpPenalty,
    relatedEntityType: 'habit',
    relatedEntityId: habitId,
    metadata: {
      is_relapse: true,
      previous_streak: previousStreak,
    },
  });

  // Check global negative habit achievements
  await checkNegativeHabitAchievements(0, habit.resistance_count, userId);

  return {
    habit: { ...habit, streak_start_date: today, current_streak: 0 },
    previousStreak,
    xpLost: xpPenalty,
    message: previousStreak > 0
      ? `Du hattest ${previousStreak} Tage geschafft. Dein neuer Streak startet jetzt!`
      : 'Dein Streak startet jetzt neu. Du schaffst das!',
  };
}

export interface LogResistanceResult {
  habit: Habit;
  currentStreak: number;
  xpGained: number;
  isNewResistanceToday: boolean;
  unlockedAchievements: HabitAchievement[];
  message: string;
}

/**
 * Log that user resisted temptation today (optional daily confirmation)
 * - Awards bonus XP
 * - Increments resistance_count
 * - Updates habit achievements progress
 * - Only counts once per day
 */
export async function logHabitResistance(
  habitId: string,
  notes?: string,
  userId?: string
): Promise<LogResistanceResult> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Get current habit
  const habit = await getHabit(habitId);
  if (!habit) {
    throw new Error('Habit not found');
  }

  if (habit.habit_type !== 'negative') {
    throw new Error('This function is only for negative habits');
  }

  const today = new Date().toISOString().split('T')[0];
  const currentStreak = calculateNegativeHabitStreak(habit);

  // Check if already confirmed today
  const alreadyConfirmedToday = habit.last_resistance_at === today;

  let xpGained = 0;
  let isNewResistanceToday = false;
  let newResistanceCount = habit.resistance_count;

  if (!alreadyConfirmedToday) {
    // First confirmation today - award bonus XP
    xpGained = 10; // Bonus XP for active confirmation
    isNewResistanceToday = true;
    newResistanceCount += 1;

    // Update habit
    const { error: updateError } = await supabase
      .from('habits')
      .update({
        resistance_count: newResistanceCount,
        last_resistance_at: today,
        current_streak: currentStreak, // Update current_streak with calculated value
        longest_streak: Math.max(currentStreak, habit.longest_streak),
        updated_at: new Date().toISOString(),
      })
      .eq('id', habitId);

    if (updateError) {
      console.error('Error updating habit on resistance:', updateError);
      throw updateError;
    }

    // Award XP
    if (habit.faction_id) {
      await updateFactionStats(habit.faction_id, xpGained, userId);
    }

    // Log activity
    await logActivity({
      userId,
      activityType: 'habit_completed',
      factionId: habit.faction_id || 'geist',
      title: `${habit.icon} Heute stark geblieben! (Tag ${currentStreak})`,
      description: notes || `${currentStreak} Tage ohne ${habit.name} 💪`,
      xpAmount: xpGained,
      relatedEntityType: 'habit',
      relatedEntityId: habitId,
      metadata: {
        is_resistance: true,
        current_streak: currentStreak,
      },
    });
  }

  // Update habit-specific achievement progress
  const unlockedAchievements = await updateHabitAchievementProgress(
    habitId,
    currentStreak,
    userId
  );

  // Check global achievements
  await checkNegativeHabitAchievements(currentStreak, newResistanceCount, userId);

  const updatedHabit: Habit = {
    ...habit,
    resistance_count: newResistanceCount,
    last_resistance_at: today,
    current_streak: currentStreak,
    longest_streak: Math.max(currentStreak, habit.longest_streak),
  };

  return {
    habit: updatedHabit,
    currentStreak,
    xpGained,
    isNewResistanceToday,
    unlockedAchievements,
    message: isNewResistanceToday
      ? `🛡️ Super! Tag ${currentStreak} ohne ${habit.name}! +${xpGained} XP`
      : `Du hast heute bereits bestätigt. Aktueller Streak: ${currentStreak} Tage`,
  };
}

/**
 * Get max "days clean" streak across all negative habits for a user
 */
export async function getMaxNegativeHabitStreak(userId?: string): Promise<number> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const habits = await getHabits(userId);

  const negativeHabits = habits.filter(h => h.habit_type === 'negative');
  if (negativeHabits.length === 0) return 0;

  const streaks = negativeHabits.map(h => calculateNegativeHabitStreak(h));
  return Math.max(...streaks, 0);
}

/**
 * Get total resistance count across all negative habits for a user
 */
export async function getTotalResistanceCount(userId?: string): Promise<number> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const habits = await getHabits(userId);

  const negativeHabits = habits.filter(h => h.habit_type === 'negative');
  return negativeHabits.reduce((sum, h) => sum + (h.resistance_count || 0), 0);
}
