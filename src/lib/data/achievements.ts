'use client';

import { createBrowserClient } from '@/lib/supabase';
import type { Achievement, UserAchievement } from '@/lib/database.types';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';
import type { FactionId } from '@/lib/database.types';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// TYPES
// ============================================

export interface AchievementWithProgress extends Achievement {
  current_progress: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
}

export interface AchievementStats {
  total: number;
  unlocked: number;
  locked: number;
  recentUnlocks: AchievementWithProgress[];
  nextToUnlock: AchievementWithProgress[];
}

// ============================================
// READ OPERATIONS
// ============================================

export async function getAchievements(
  userId: string = TEST_USER_ID
): Promise<AchievementWithProgress[]> {
  const supabase = createBrowserClient();

  // Get all achievements with user progress
  const { data: achievements, error: achError } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (achError) {
    console.error('Error fetching achievements:', achError);
    throw achError;
  }

  // Get user progress for each achievement
  const { data: userProgress, error: progError } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId);

  if (progError) {
    console.error('Error fetching user achievements:', progError);
    throw progError;
  }

  // Merge achievements with user progress
  return achievements.map(ach => {
    const progress = userProgress?.find(p => p.achievement_id === ach.id);
    return {
      ...ach,
      current_progress: progress?.current_progress || 0,
      is_unlocked: progress?.is_unlocked || false,
      unlocked_at: progress?.unlocked_at || null,
    };
  });
}

export async function getAchievementsByCategory(
  category: string,
  userId: string = TEST_USER_ID
): Promise<AchievementWithProgress[]> {
  const all = await getAchievements(userId);
  return all.filter(a => a.category === category);
}

export async function getUnlockedAchievements(
  userId: string = TEST_USER_ID
): Promise<AchievementWithProgress[]> {
  const all = await getAchievements(userId);
  return all.filter(a => a.is_unlocked);
}

export async function getAchievementStats(
  userId: string = TEST_USER_ID
): Promise<AchievementStats> {
  const all = await getAchievements(userId);
  const unlocked = all.filter(a => a.is_unlocked);
  const locked = all.filter(a => !a.is_unlocked);

  // Sort locked by how close they are to completion
  const nextToUnlock = locked
    .filter(a => a.current_progress > 0)
    .sort((a, b) => {
      const aPercent = a.current_progress / a.requirement_value;
      const bPercent = b.current_progress / b.requirement_value;
      return bPercent - aPercent;
    })
    .slice(0, 3);

  // Recent unlocks (last 5)
  const recentUnlocks = unlocked
    .filter(a => a.unlocked_at)
    .sort((a, b) =>
      new Date(b.unlocked_at!).getTime() - new Date(a.unlocked_at!).getTime()
    )
    .slice(0, 5);

  return {
    total: all.length,
    unlocked: unlocked.length,
    locked: locked.length,
    recentUnlocks,
    nextToUnlock,
  };
}

// ============================================
// WRITE OPERATIONS
// ============================================

export async function unlockAchievement(
  achievementKey: string,
  userId: string = TEST_USER_ID
): Promise<AchievementWithProgress | null> {
  const supabase = createBrowserClient();

  // Get achievement definition
  const { data: achievement, error: achError } = await supabase
    .from('achievements')
    .select('*')
    .eq('achievement_key', achievementKey)
    .eq('is_active', true)
    .single();

  if (achError || !achievement) {
    console.error('Achievement not found:', achievementKey);
    return null;
  }

  // Check if already unlocked
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .eq('achievement_id', achievement.id)
    .eq('is_unlocked', true)
    .maybeSingle();

  if (existing) {
    console.log('Achievement already unlocked:', achievementKey);
    return null;
  }

  // Unlock achievement
  const { data: userAch, error: unlockError } = await supabase
    .from('user_achievements')
    .upsert({
      user_id: userId,
      achievement_id: achievement.id,
      current_progress: achievement.requirement_value,
      is_unlocked: true,
      unlocked_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (unlockError) {
    console.error('Error unlocking achievement:', unlockError);
    throw unlockError;
  }

  // Award XP to faction if specified
  if (achievement.xp_reward > 0 && achievement.faction_id) {
    try {
      await updateFactionStats(
        achievement.faction_id as FactionId,
        achievement.xp_reward,
        userId
      );
    } catch (err) {
      console.error('Error awarding achievement XP:', err);
    }
  }

  // Log activity
  try {
    await logActivity({
      userId,
      activityType: 'achievement_unlocked',
      factionId: achievement.faction_id as FactionId | null,
      title: `${achievement.icon} ${achievement.name} freigeschaltet!`,
      description: achievement.description,
      xpAmount: achievement.xp_reward,
      relatedEntityType: 'achievement',
      relatedEntityId: achievement.id,
      metadata: {
        achievement_key: achievementKey,
        rarity: achievement.rarity,
      },
    });
  } catch (err) {
    console.error('Error logging achievement activity:', err);
  }

  return {
    ...achievement,
    current_progress: userAch.current_progress,
    is_unlocked: userAch.is_unlocked,
    unlocked_at: userAch.unlocked_at,
  };
}

export async function updateAchievementProgress(
  achievementKey: string,
  newProgress: number,
  userId: string = TEST_USER_ID
): Promise<void> {
  const supabase = createBrowserClient();

  // Get achievement
  const { data: achievement } = await supabase
    .from('achievements')
    .select('*')
    .eq('achievement_key', achievementKey)
    .eq('is_active', true)
    .single();

  if (!achievement) return;

  // Update or create progress
  const { error } = await supabase
    .from('user_achievements')
    .upsert({
      user_id: userId,
      achievement_id: achievement.id,
      current_progress: newProgress,
      is_unlocked: false,
    });

  if (error) {
    console.error('Error updating achievement progress:', error);
  }

  // Auto-unlock if threshold reached
  if (newProgress >= achievement.requirement_value) {
    await unlockAchievement(achievementKey, userId);
  }
}

// ============================================
// ACHIEVEMENT CHECKING LOGIC
// ============================================

export async function checkAndAwardAchievements(
  userId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<AchievementWithProgress[]> {
  const supabase = createBrowserClient();
  const awarded: AchievementWithProgress[] = [];

  // Get all active achievements of this type
  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('is_active', true)
    .eq('requirement_type', eventType);

  if (!achievements) return awarded;

  // Check each achievement
  for (const achievement of achievements) {
    // Get current progress
    const { data: userAch } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', achievement.id)
      .maybeSingle();

    // Skip if already unlocked
    if (userAch?.is_unlocked) continue;

    // Check if condition is met
    const currentValue = eventData[eventType] as number || 0;

    if (currentValue >= achievement.requirement_value) {
      const unlocked = await unlockAchievement(achievement.achievement_key, userId);
      if (unlocked) {
        awarded.push(unlocked);
      }
    } else {
      // Update progress
      await updateAchievementProgress(
        achievement.achievement_key,
        currentValue,
        userId
      );
    }
  }

  return awarded;
}

// Export helper for common checks
export async function checkHabitAchievements(
  userId: string,
  habitCount: number,
  currentStreak: number
): Promise<void> {
  await checkAndAwardAchievements(userId, 'habit_count', { habit_count: habitCount });
  await checkAndAwardAchievements(userId, 'habit_streak', { habit_streak: currentStreak });
}

export async function checkBookAchievements(
  userId: string,
  booksRead: number
): Promise<void> {
  await checkAndAwardAchievements(userId, 'book_count', { book_count: booksRead });
}

export async function checkCourseAchievements(
  userId: string,
  coursesCompleted: number
): Promise<void> {
  await checkAndAwardAchievements(userId, 'course_count', { course_count: coursesCompleted });
}

export async function checkSavingsAchievements(
  userId: string,
  goalsAchieved: number
): Promise<void> {
  await checkAndAwardAchievements(userId, 'savings_goal', { savings_goal: goalsAchieved });
}

export async function checkXPAchievements(
  userId: string,
  factionId: string,
  factionXp: number,
  totalXp: number
): Promise<void> {
  await checkAndAwardAchievements(userId, 'faction_xp', { faction_xp: factionXp });
  await checkAndAwardAchievements(userId, 'total_xp', { total_xp: totalXp });
}
