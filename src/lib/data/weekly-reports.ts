// ============================================
// WEEKLY REPORTS DATA ACCESS
// Phase 4: Visuelle Belohnungen
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type { WeeklyReport } from '@/lib/database.types';

/**
 * Get user's weekly reports (most recent first)
 */
export async function getUserReports(
  options: { limit?: number; offset?: number } = {},
  userId?: string
): Promise<WeeklyReport[]> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  let query = supabase
    .from('weekly_reports')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('week_start', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching weekly reports:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get the latest weekly report
 */
export async function getLatestReport(userId?: string): Promise<WeeklyReport | null> {
  const reports = await getUserReports({ limit: 1 }, userId);
  return reports[0] || null;
}

/**
 * Get unread report count
 */
export async function getUnreadReportCount(userId?: string): Promise<number> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { count, error } = await supabase
    .from('weekly_reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', resolvedUserId)
    .is('read_at', null);

  if (error) {
    console.error('Error counting unread reports:', error);
    throw error;
  }

  return count || 0;
}

/**
 * Mark report as read
 */
export async function markReportAsRead(
  reportId: string,
  userId?: string
): Promise<void> {
  const supabase = createBrowserClient();
  const resolvedUserId = await getUserIdOrCurrent(userId);

  const { error } = await supabase
    .from('weekly_reports')
    .update({ read_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('user_id', resolvedUserId);

  if (error) {
    console.error('Error marking report as read:', error);
    throw error;
  }
}
