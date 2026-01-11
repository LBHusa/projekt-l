// ============================================
// SLEEP DATA ACCESS LAYER
// Functions for sleep logs and statistics
// ============================================

import { createBrowserClient } from '@/lib/supabase';

export interface SleepLog {
  id: string;
  user_id: string;
  sleep_date: string;
  sleep_start: string;
  sleep_end: string;
  duration_minutes: number;
  quality_score: number | null;
  deep_sleep_minutes: number | null;
  rem_sleep_minutes: number | null;
  light_sleep_minutes: number | null;
  awake_minutes: number | null;
  heart_rate_avg: number | null;
  hrv_avg: number | null;
  import_source: string;
  external_id: string | null;
  notes: string | null;
  xp_gained: number;
  created_at: string;
}

export interface SleepStats {
  avgDuration: number;
  avgQuality: number | null;
  avgDeepSleep: number | null;
  avgRemSleep: number | null;
  totalLogs: number;
  trend: 'improving' | 'declining' | 'stable';
}

// ============================================
// GET SLEEP LOGS
// ============================================

export async function getSleepLogs(
  userId: string,
  limit: number = 7
): Promise<SleepLog[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .order('sleep_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching sleep logs:', error);
    return [];
  }

  return data || [];
}

// ============================================
// GET TODAY'S SLEEP
// ============================================

export async function getTodaySleep(userId: string): Promise<SleepLog | null> {
  const supabase = createBrowserClient();

  // Get yesterday's date (sleep logged for the night before)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('sleep_date', yesterdayStr)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching today sleep:', error);
  }

  return data || null;
}

// ============================================
// GET SLEEP STATS
// ============================================

export async function getSleepStats(
  userId: string,
  days: number = 7
): Promise<SleepStats> {
  const supabase = createBrowserClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('sleep_date', startDateStr)
    .order('sleep_date', { ascending: false });

  if (error || !data || data.length === 0) {
    return {
      avgDuration: 0,
      avgQuality: null,
      avgDeepSleep: null,
      avgRemSleep: null,
      totalLogs: 0,
      trend: 'stable',
    };
  }

  // Calculate averages
  const avgDuration =
    data.reduce((sum, log) => sum + log.duration_minutes, 0) / data.length;

  const qualityLogs = data.filter((log) => log.quality_score !== null);
  const avgQuality =
    qualityLogs.length > 0
      ? qualityLogs.reduce((sum, log) => sum + (log.quality_score || 0), 0) /
        qualityLogs.length
      : null;

  const deepSleepLogs = data.filter((log) => log.deep_sleep_minutes !== null);
  const avgDeepSleep =
    deepSleepLogs.length > 0
      ? deepSleepLogs.reduce(
          (sum, log) => sum + (log.deep_sleep_minutes || 0),
          0
        ) / deepSleepLogs.length
      : null;

  const remSleepLogs = data.filter((log) => log.rem_sleep_minutes !== null);
  const avgRemSleep =
    remSleepLogs.length > 0
      ? remSleepLogs.reduce((sum, log) => sum + (log.rem_sleep_minutes || 0), 0) /
        remSleepLogs.length
      : null;

  // Calculate trend (compare first half vs second half)
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (data.length >= 4) {
    const midpoint = Math.floor(data.length / 2);
    const recentAvg =
      data.slice(0, midpoint).reduce((sum, log) => sum + log.duration_minutes, 0) /
      midpoint;
    const olderAvg =
      data.slice(midpoint).reduce((sum, log) => sum + log.duration_minutes, 0) /
      (data.length - midpoint);

    if (recentAvg > olderAvg * 1.05) trend = 'improving';
    else if (recentAvg < olderAvg * 0.95) trend = 'declining';
  }

  return {
    avgDuration,
    avgQuality,
    avgDeepSleep,
    avgRemSleep,
    totalLogs: data.length,
    trend,
  };
}

// ============================================
// CREATE SLEEP LOG (for manual entries)
// ============================================

export async function createSleepLog(
  userId: string,
  sleepData: {
    sleepDate: string;
    sleepStart: string;
    sleepEnd: string;
    durationMinutes: number;
    qualityScore?: number;
    notes?: string;
  }
): Promise<{ success: boolean; log?: SleepLog; error?: string }> {
  const supabase = createBrowserClient();

  // Calculate XP based on duration
  let xpGained = 0;
  const hours = sleepData.durationMinutes / 60;
  if (hours >= 7 && hours <= 9) xpGained = 15; // Optimal
  else if (hours >= 6) xpGained = 10;
  else if (hours >= 5) xpGained = 5;

  const { data, error } = await supabase
    .from('sleep_logs')
    .insert({
      user_id: userId,
      sleep_date: sleepData.sleepDate,
      sleep_start: sleepData.sleepStart,
      sleep_end: sleepData.sleepEnd,
      duration_minutes: sleepData.durationMinutes,
      quality_score: sleepData.qualityScore || null,
      notes: sleepData.notes || null,
      import_source: 'manual',
      xp_gained: xpGained,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating sleep log:', error);
    return { success: false, error: error.message };
  }

  return { success: true, log: data };
}

// ============================================
// FORMAT HELPERS
// ============================================

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export function formatSleepQuality(score: number | null): string {
  if (score === null) return 'Keine Daten';
  if (score >= 80) return 'Ausgezeichnet';
  if (score >= 60) return 'Gut';
  if (score >= 40) return 'Mittel';
  return 'Schlecht';
}

export function getSleepQualityColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}
