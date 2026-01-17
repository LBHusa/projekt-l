import { createBrowserClient } from '@/lib/supabase';
import type { ActivityLog, ActivityType, FactionId } from '@/lib/database.types';

// ============================================
// ACTIVITY LOG DATA ACCESS
// ============================================

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// READ OPERATIONS
// ============================================

export async function getRecentActivity(
  limit: number = 10,
  userId: string = TEST_USER_ID
): Promise<ActivityLog[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity log:', error);
    throw error;
  }

  return data || [];
}

export async function getActivityByFaction(
  factionId: FactionId,
  userId: string = TEST_USER_ID,
  limit: number = 20
): Promise<ActivityLog[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .eq('faction_id', factionId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity by faction:', error);
    throw error;
  }

  return data || [];
}

export async function getActivityByType(
  activityType: ActivityType,
  userId: string = TEST_USER_ID,
  limit: number = 20
): Promise<ActivityLog[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_type', activityType)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity by type:', error);
    throw error;
  }

  return data || [];
}

export async function getActivityForDateRange(
  startDate: Date,
  endDate: Date,
  userId: string = TEST_USER_ID
): Promise<ActivityLog[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', userId)
    .gte('occurred_at', startDate.toISOString())
    .lte('occurred_at', endDate.toISOString())
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('Error fetching activity for date range:', error);
    throw error;
  }

  return data || [];
}

export async function getTodaysActivity(
  userId: string = TEST_USER_ID
): Promise<ActivityLog[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getActivityForDateRange(today, tomorrow, userId);
}

// ============================================
// WRITE OPERATIONS
// ============================================

export interface LogActivityInput {
  userId?: string;
  activityType: ActivityType;
  factionId?: FactionId | null;
  title: string;
  description?: string;
  xpAmount?: number;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: LogActivityInput): Promise<ActivityLog> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('activity_log')
    .insert({
      user_id: input.userId || TEST_USER_ID,
      activity_type: input.activityType,
      faction_id: input.factionId || null,
      title: input.title,
      description: input.description || null,
      xp_amount: input.xpAmount || 0,
      related_entity_type: input.relatedEntityType || null,
      related_entity_id: input.relatedEntityId || null,
      metadata: input.metadata || {},
      occurred_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging activity:', error);
    throw error;
  }

  return data;
}

// ============================================
// STATISTICS
// ============================================

export interface ActivitySummary {
  totalActivities: number;
  totalXpGained: number;
  byType: Record<string, number>;
  byFaction: Record<string, number>;
}

export async function getActivitySummary(
  daysBack: number = 7,
  userId: string = TEST_USER_ID
): Promise<ActivitySummary> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const activities = await getActivityForDateRange(startDate, new Date(), userId);

  const byType: Record<string, number> = {};
  const byFaction: Record<string, number> = {};
  let totalXpGained = 0;

  activities.forEach(activity => {
    // Count by type
    byType[activity.activity_type] = (byType[activity.activity_type] || 0) + 1;

    // Count by faction
    if (activity.faction_id) {
      byFaction[activity.faction_id] = (byFaction[activity.faction_id] || 0) + 1;
    }

    // Sum XP
    totalXpGained += activity.xp_amount;
  });

  return {
    totalActivities: activities.length,
    totalXpGained,
    byType,
    byFaction,
  };
}

export async function getDailyActivityCount(
  daysBack: number = 7,
  userId: string = TEST_USER_ID
): Promise<{ date: string; count: number; xp: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const activities = await getActivityForDateRange(startDate, new Date(), userId);

  // Group by date
  const byDate: Record<string, { count: number; xp: number }> = {};

  activities.forEach(activity => {
    const date = activity.occurred_at.split('T')[0];
    if (!byDate[date]) {
      byDate[date] = { count: 0, xp: 0 };
    }
    byDate[date].count++;
    byDate[date].xp += activity.xp_amount;
  });

  // Convert to array and fill in missing dates
  const result: { date: string; count: number; xp: number }[] = [];
  const current = new Date(startDate);

  while (current <= new Date()) {
    const dateStr = current.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      count: byDate[dateStr]?.count || 0,
      xp: byDate[dateStr]?.xp || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

// ============================================
// HELPER FUNCTIONS FOR SPECIFIC ACTIVITY TYPES
// ============================================

export async function logXpGained(
  title: string,
  xpAmount: number,
  factionId?: FactionId,
  relatedEntityType?: string,
  relatedEntityId?: string,
  userId: string = TEST_USER_ID
): Promise<ActivityLog> {
  return logActivity({
    userId,
    activityType: 'xp_gained',
    factionId,
    title,
    xpAmount,
    relatedEntityType,
    relatedEntityId,
  });
}

export async function logLevelUp(
  skillName: string,
  newLevel: number,
  factionId?: FactionId,
  skillId?: string,
  userId: string = TEST_USER_ID
): Promise<ActivityLog> {
  return logActivity({
    userId,
    activityType: 'level_up',
    factionId,
    title: `Level Up! ${skillName} ist jetzt Level ${newLevel}`,
    description: `${skillName} hat Level ${newLevel} erreicht!`,
    relatedEntityType: 'skill',
    relatedEntityId: skillId,
    metadata: { newLevel, skillName },
  });
}

export async function logWorkout(
  workoutName: string,
  durationMinutes: number,
  xpGained: number,
  workoutId: string,
  userId: string = TEST_USER_ID
): Promise<ActivityLog> {
  return logActivity({
    userId,
    activityType: 'workout_logged',
    factionId: 'koerper',
    title: `${workoutName} absolviert`,
    description: `${durationMinutes} Minuten Training`,
    xpAmount: xpGained,
    relatedEntityType: 'workout',
    relatedEntityId: workoutId,
    metadata: { durationMinutes },
  });
}

export async function logBookFinished(
  bookTitle: string,
  rating: number | null,
  xpGained: number,
  bookId: string,
  userId: string = TEST_USER_ID
): Promise<ActivityLog> {
  return logActivity({
    userId,
    activityType: 'book_finished',
    factionId: 'wissen',
    title: `"${bookTitle}" fertig gelesen`,
    description: rating ? `Bewertung: ${'⭐'.repeat(rating)}` : undefined,
    xpAmount: xpGained,
    relatedEntityType: 'book',
    relatedEntityId: bookId,
    metadata: { rating },
  });
}

export async function logCourseCompleted(
  courseTitle: string,
  platform: string | null,
  xpGained: number,
  courseId: string,
  userId: string = TEST_USER_ID
): Promise<ActivityLog> {
  return logActivity({
    userId,
    activityType: 'course_completed',
    factionId: 'wissen',
    title: `Kurs "${courseTitle}" abgeschlossen`,
    description: platform ? `auf ${platform}` : undefined,
    xpAmount: xpGained,
    relatedEntityType: 'course',
    relatedEntityId: courseId,
  });
}

export async function logJobStarted(
  company: string,
  position: string,
  jobId: string,
  userId: string = TEST_USER_ID
): Promise<ActivityLog> {
  return logActivity({
    userId,
    activityType: 'job_started',
    factionId: 'karriere',
    title: `Neuer Job: ${position} bei ${company}`,
    relatedEntityType: 'job',
    relatedEntityId: jobId,
  });
}

export async function logSalaryUpdate(
  amount: number,
  currency: string,
  jobId: string | null,
  userId: string = TEST_USER_ID
): Promise<ActivityLog> {
  return logActivity({
    userId,
    activityType: 'salary_updated',
    factionId: 'karriere',
    title: `Gehalt aktualisiert: ${amount.toLocaleString('de-DE')} ${currency}`,
    relatedEntityType: 'salary',
    relatedEntityId: jobId || undefined,
    metadata: { amount, currency },
  });
}

export async function logGoalAchieved(
  goalTitle: string,
  factionId: FactionId,
  goalId: string,
  userId: string = TEST_USER_ID
): Promise<ActivityLog> {
  return logActivity({
    userId,
    activityType: 'goal_achieved',
    factionId,
    title: `Ziel erreicht: ${goalTitle}`,
    xpAmount: 100, // Bonus XP for achieving goals
    relatedEntityType: 'goal',
    relatedEntityId: goalId,
  });
}

export async function logSocialEvent(
  eventTitle: string,
  participantCount: number,
  xpGained: number,
  eventId: string,
  userId: string = TEST_USER_ID
): Promise<ActivityLog> {
  return logActivity({
    userId,
    activityType: 'event_logged',
    factionId: 'soziales',
    title: eventTitle,
    description: `Mit ${participantCount} Person${participantCount === 1 ? '' : 'en'}`,
    xpAmount: xpGained,
    relatedEntityType: 'event',
    relatedEntityId: eventId,
  });
}
