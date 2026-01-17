import { createBrowserClient } from '@/lib/supabase';
import type { HobbyProject, HobbyTimeLog, HobbyProjectStatus } from '@/lib/database.types';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';

// ============================================
// HOBBYS DATA ACCESS
// ============================================

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// HOBBY PROJECTS
// ============================================

export async function getHobbyProjects(
  userId: string = TEST_USER_ID
): Promise<HobbyProject[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('hobby_projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching hobby projects:', error);
    throw error;
  }

  return data || [];
}

export async function getHobbyProject(
  projectId: string
): Promise<HobbyProject | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('hobby_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getActiveHobbyProjects(
  userId: string = TEST_USER_ID
): Promise<HobbyProject[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('hobby_projects')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching active hobby projects:', error);
    throw error;
  }

  return data || [];
}

export interface CreateHobbyProjectInput {
  name: string;
  description?: string | null;
  category?: string | null;
  icon?: string;
  status?: HobbyProjectStatus;
  progress?: number;
  started_at?: string | null;
}

export async function createHobbyProject(
  input: CreateHobbyProjectInput,
  userId: string = TEST_USER_ID
): Promise<HobbyProject> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('hobby_projects')
    .insert({
      ...input,
      user_id: userId,
      icon: input.icon || '🎨',
      status: input.status || 'active',
      progress: input.progress || 0,
      total_hours: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating hobby project:', error);
    throw error;
  }

  return data;
}

export async function updateHobbyProject(
  projectId: string,
  input: Partial<CreateHobbyProjectInput & { completed_at?: string | null }>,
  userId: string = TEST_USER_ID
): Promise<HobbyProject> {
  const supabase = createBrowserClient();

  // Fetch current project BEFORE updating to detect status change
  const { data: currentProject } = await supabase
    .from('hobby_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  // Auto-set completed_at when status becomes "completed"
  const updateData = { ...input };
  if (input.status === 'completed' && currentProject?.status !== 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  // Perform the update
  const { data, error } = await supabase
    .from('hobby_projects')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating hobby project:', error);
    throw error;
  }

  // XP Integration: Award XP when status transitions to "completed"
  if (
    input.status === 'completed' &&
    currentProject &&
    currentProject.status !== 'completed'
  ) {
    const xpGained = calculateProjectXp(data);

    // Update Faction Stats (adds XP to 'hobby' faction)
    if (xpGained > 0) {
      try {
        await updateFactionStats('hobby', xpGained, userId);
      } catch (err) {
        console.error('Error updating faction stats for hobby project:', err);
      }
    }

    // Log Activity to Feed
    try {
      await logActivity({
        userId,
        activityType: 'project_completed',
        factionId: 'hobby',
        title: `Projekt abgeschlossen: "${data.name}"`,
        description: `${data.total_hours || 0} Stunden investiert`,
        xpAmount: xpGained,
        relatedEntityType: 'hobby_project',
        relatedEntityId: projectId,
        metadata: {
          category: data.category,
          total_hours: data.total_hours,
        },
      });
    } catch (err) {
      console.error('Error logging hobby project activity:', err);
    }
  }

  return data;
}

export async function deleteHobbyProject(projectId: string): Promise<void> {
  const supabase = createBrowserClient();

  // First delete all time logs for this project
  await supabase
    .from('hobby_time_logs')
    .delete()
    .eq('project_id', projectId);

  // Then delete the project
  const { error } = await supabase
    .from('hobby_projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting hobby project:', error);
    throw error;
  }
}

// ============================================
// XP CALCULATIONS
// ============================================

function calculateProjectXp(project: HobbyProject): number {
  // Base XP for completing a hobby project
  let xp = 50;

  // Bonus based on total hours invested
  const hours = project.total_hours || 0;
  if (hours >= 100) xp += 100;      // 100+ hours: +100 XP (total: 150)
  else if (hours >= 50) xp += 75;   // 50+ hours: +75 XP (total: 125)
  else if (hours >= 20) xp += 50;   // 20+ hours: +50 XP (total: 100)
  else if (hours >= 10) xp += 25;   // 10+ hours: +25 XP (total: 75)

  return xp;
}

// ============================================
// HOBBY TIME LOGS
// ============================================

export async function getTimeLogsForProject(
  projectId: string
): Promise<HobbyTimeLog[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('hobby_time_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('logged_at', { ascending: false });

  if (error) {
    console.error('Error fetching time logs:', error);
    throw error;
  }

  return data || [];
}

export async function getRecentTimeLogs(
  userId: string = TEST_USER_ID,
  limit: number = 10
): Promise<(HobbyTimeLog & { project?: HobbyProject })[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('hobby_time_logs')
    .select('*, project:hobby_projects(*)')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent time logs:', error);
    throw error;
  }

  return data || [];
}

export interface LogHobbyTimeInput {
  project_id: string;
  duration_minutes: number;
  logged_at?: string;
  notes?: string | null;
}

export async function logHobbyTime(
  input: LogHobbyTimeInput,
  userId: string = TEST_USER_ID
): Promise<HobbyTimeLog> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('hobby_time_logs')
    .insert({
      ...input,
      user_id: userId,
      logged_at: input.logged_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging hobby time:', error);
    throw error;
  }

  // Update project's total hours
  await updateProjectTotalHours(input.project_id);

  return data;
}

export async function deleteTimeLog(timeLogId: string): Promise<void> {
  const supabase = createBrowserClient();

  // Get the time log first to know which project to update
  const { data: timeLog } = await supabase
    .from('hobby_time_logs')
    .select('project_id')
    .eq('id', timeLogId)
    .single();

  const { error } = await supabase
    .from('hobby_time_logs')
    .delete()
    .eq('id', timeLogId);

  if (error) {
    console.error('Error deleting time log:', error);
    throw error;
  }

  // Update project's total hours if we found the project
  if (timeLog?.project_id) {
    await updateProjectTotalHours(timeLog.project_id);
  }
}

// ============================================
// STATS & AGGREGATIONS
// ============================================

export async function updateProjectTotalHours(projectId: string): Promise<void> {
  const supabase = createBrowserClient();

  // Calculate total minutes from all time logs
  const { data: timeLogs } = await supabase
    .from('hobby_time_logs')
    .select('duration_minutes')
    .eq('project_id', projectId);

  const totalMinutes = (timeLogs || []).reduce(
    (sum, log) => sum + (log.duration_minutes || 0),
    0
  );

  const totalHours = Math.round((totalMinutes / 60) * 100) / 100; // Round to 2 decimals

  // Update the project
  await supabase
    .from('hobby_projects')
    .update({ total_hours: totalHours, updated_at: new Date().toISOString() })
    .eq('id', projectId);
}

export interface HobbyStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalHoursAllTime: number;
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  mostActiveProject: HobbyProject | null;
}

export async function getHobbyStats(
  userId: string = TEST_USER_ID
): Promise<HobbyStats> {
  const supabase = createBrowserClient();

  // Get all projects
  const { data: projects } = await supabase
    .from('hobby_projects')
    .select('*')
    .eq('user_id', userId);

  const allProjects = projects || [];
  const activeProjects = allProjects.filter(p => p.status === 'active');
  const completedProjects = allProjects.filter(p => p.status === 'completed');

  // Calculate total hours
  const totalHoursAllTime = allProjects.reduce(
    (sum, p) => sum + (p.total_hours || 0),
    0
  );

  // Find most active project (by total hours)
  const mostActiveProject = allProjects.length > 0
    ? allProjects.reduce((max, p) =>
        (p.total_hours || 0) > (max.total_hours || 0) ? p : max
      )
    : null;

  // Get time logs for this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: weekLogs } = await supabase
    .from('hobby_time_logs')
    .select('duration_minutes')
    .eq('user_id', userId)
    .gte('logged_at', weekAgo.toISOString());

  const totalMinutesThisWeek = (weekLogs || []).reduce(
    (sum, log) => sum + (log.duration_minutes || 0),
    0
  );

  // Get time logs for this month
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const { data: monthLogs } = await supabase
    .from('hobby_time_logs')
    .select('duration_minutes')
    .eq('user_id', userId)
    .gte('logged_at', monthAgo.toISOString());

  const totalMinutesThisMonth = (monthLogs || []).reduce(
    (sum, log) => sum + (log.duration_minutes || 0),
    0
  );

  return {
    totalProjects: allProjects.length,
    activeProjects: activeProjects.length,
    completedProjects: completedProjects.length,
    totalHoursAllTime: Math.round(totalHoursAllTime * 10) / 10,
    totalHoursThisWeek: Math.round((totalMinutesThisWeek / 60) * 10) / 10,
    totalHoursThisMonth: Math.round((totalMinutesThisMonth / 60) * 10) / 10,
    mostActiveProject: mostActiveProject?.total_hours > 0 ? mostActiveProject : null,
  };
}

// ============================================
// CATEGORY HELPERS
// ============================================

export const HOBBY_CATEGORIES = [
  { id: 'art', name: 'Kunst', icon: '🎨' },
  { id: 'music', name: 'Musik', icon: '🎵' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'crafts', name: 'Handwerk', icon: '🔨' },
  { id: 'sports', name: 'Sport', icon: '⚽' },
  { id: 'tech', name: 'Technik', icon: '💻' },
  { id: 'cooking', name: 'Kochen', icon: '🍳' },
  { id: 'gardening', name: 'Garten', icon: '🌱' },
  { id: 'photography', name: 'Fotografie', icon: '📷' },
  { id: 'writing', name: 'Schreiben', icon: '✍️' },
  { id: 'other', name: 'Sonstiges', icon: '✨' },
] as const;

export function getCategoryInfo(categoryId: string | null) {
  return HOBBY_CATEGORIES.find(c => c.id === categoryId) || HOBBY_CATEGORIES[HOBBY_CATEGORIES.length - 1];
}
