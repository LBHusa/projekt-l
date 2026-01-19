import { createBrowserClient } from '@/lib/supabase';
import type { JobHistory, SalaryEntry, CareerGoal, CareerSource } from '@/lib/database.types';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';
import { getUserIdOrCurrent } from '@/lib/auth-helper';

// ============================================
// KARRIERE DATA ACCESS
// ============================================

// await getUserIdOrCurrent() removed - now using getUserIdOrCurrent()

// ============================================
// JOB HISTORY
// ============================================

export async function getJobHistory(
  userId?: string
): Promise<JobHistory[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('job_history')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching job history:', error);
    throw error;
  }

  return data || [];
}

export async function getJobWithSalaries(
  jobId: string
): Promise<JobHistory & { salaries: SalaryEntry[] } | null> {
  const supabase = createBrowserClient();

  const { data: job, error: jobError } = await supabase
    .from('job_history')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (jobError) {
    if (jobError.code === 'PGRST116') return null;
    throw jobError;
  }

  const { data: salaries, error: salaryError } = await supabase
    .from('salary_entries')
    .select('*')
    .eq('job_id', jobId)
    .order('effective_date', { ascending: false });

  if (salaryError) {
    console.error('Error fetching salaries:', salaryError);
  }

  return {
    ...job,
    salaries: salaries || [],
  };
}

export async function getCurrentJob(
  userId?: string
): Promise<JobHistory | null> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('job_history')
    .select('*')
    .eq('user_id', resolvedUserId)
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export interface CreateJobInput {
  company: string;
  position: string;
  start_date: string;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  employment_type?: string;
  location?: string | null;
}

export async function createJob(
  input: CreateJobInput,
  userId?: string
): Promise<JobHistory> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // If marking as current, unset other current jobs
  if (input.is_current) {
    await supabase
      .from('job_history')
      .update({ is_current: false })
      .eq('user_id', resolvedUserId)
      .eq('is_current', true);
  }

  const { data, error } = await supabase
    .from('job_history')
    .insert({
      ...input,
      user_id: resolvedUserId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating job:', error);
    throw error;
  }

  return data;
}

export async function updateJob(
  jobId: string,
  input: Partial<CreateJobInput>
): Promise<JobHistory> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('job_history')
    .update(input)
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    console.error('Error updating job:', error);
    throw error;
  }

  return data;
}

export async function deleteJob(jobId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('job_history')
    .delete()
    .eq('id', jobId);

  if (error) {
    console.error('Error deleting job:', error);
    throw error;
  }
}

// ============================================
// SALARY ENTRIES
// ============================================

export async function getSalaryHistory(
  userId?: string
): Promise<(SalaryEntry & {
  job?: JobHistory })[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data: jobs } = await supabase
    .from('job_history')
    .select('id')
    .eq('user_id', resolvedUserId);

  if (!jobs || jobs.length === 0) return [];

  const jobIds = jobs.map(j => j.id);

  const { data: salaries, error } = await supabase
    .from('salary_entries')
    .select('*, job:job_history(*)')
    .in('job_id', jobIds)
    .order('effective_date', { ascending: false });

  if (error) {
    console.error('Error fetching salary history:', error);
    throw error;
  }

  return salaries || [];
}

export async function getCurrentSalary(
  userId?: string
): Promise<SalaryEntry | null> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const currentJob = await getCurrentJob(userId);
  if (!currentJob) return null;

  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('salary_entries')
    .select('*')
    .eq('job_id', currentJob.id)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export interface CreateSalaryInput {
  job_id: string;
  amount: number;
  currency?: string;
  effective_date: string;
  period?: string;
  notes?: string | null;
}

export async function createSalaryEntry(
  input: CreateSalaryInput,
  userId?: string
): Promise<SalaryEntry> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('salary_entries')
    .insert({
      ...input,
      user_id: resolvedUserId,
      currency: input.currency || 'EUR',
      period: input.period || 'monthly',
      bonus: 0,
      equity_value: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating salary entry:', error);
    throw error;
  }

  return data;
}

export async function updateSalaryEntry(
  salaryId: string,
  input: Partial<CreateSalaryInput>
): Promise<SalaryEntry> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('salary_entries')
    .update(input)
    .eq('id', salaryId)
    .select()
    .single();

  if (error) {
    console.error('Error updating salary entry:', error);
    throw error;
  }

  return data;
}

export async function deleteSalaryEntry(salaryId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('salary_entries')
    .delete()
    .eq('id', salaryId);

  if (error) {
    console.error('Error deleting salary entry:', error);
    throw error;
  }
}

// ============================================
// CAREER GOALS
// ============================================

export async function getCareerGoals(
  userId?: string
): Promise<CareerGoal[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('career_goals')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('target_date', { ascending: true });

  if (error) {
    console.error('Error fetching career goals:', error);
    throw error;
  }

  return data || [];
}

export interface CreateCareerGoalInput {
  title: string;
  description?: string | null;
  target_date?: string | null;
  progress?: number; // 0-100
}

export async function createCareerGoal(
  input: CreateCareerGoalInput,
  userId?: string
): Promise<CareerGoal> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('career_goals')
    .insert({
      ...input,
      user_id: resolvedUserId,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating career goal:', error);
    throw error;
  }

  return data;
}

// Calculate XP based on goal complexity and duration
function calculateCareerGoalXp(goal: CareerGoal): number {
  let xp = 75; // Base XP for completing a career goal

  // Bonus for long-term goals
  if (goal.target_date && goal.created_at) {
    const monthsDuration = Math.floor(
      (new Date(goal.target_date).getTime() - new Date(goal.created_at).getTime())
      / (1000 * 60 * 60 * 24 * 30)
    );
    if (monthsDuration >= 12) xp += 50;      // 1+ Jahr: +50 XP (125 total)
    else if (monthsDuration >= 6) xp += 25;  // 6+ Monate: +25 XP (100 total)
  }

  return xp;
}

export async function updateCareerGoal(
  goalId: string,
  input: Partial<CreateCareerGoalInput & { status: string }>,
  userId?: string
): Promise<CareerGoal> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  // Fetch current goal state BEFORE updating
  const { data: currentGoal } = await supabase
    .from('career_goals')
    .select('*')
    .eq('id', goalId)
    .single();

  const { data, error } = await supabase
    .from('career_goals')
    .update(input)
    .eq('id', goalId)
    .select()
    .single();

  if (error) {
    console.error('Error updating career goal:', error);
    throw error;
  }

  // XP Integration: Award XP when status changes to "achieved"
  if (
    input.status === 'achieved' &&
    currentGoal &&
    currentGoal.status !== 'achieved'
  ) {
    const xpGained = calculateCareerGoalXp(data);

    // Update Faction Stats
    if (xpGained > 0) {
      try {
        await updateFactionStats('karriere', xpGained, userId);
      } catch (err) {
        console.error('Error updating faction stats for career goal:', err);
      }
    }

    // Log Activity for Feed
    try {
      await logActivity({
        userId,
        activityType: 'goal_achieved',
        factionId: 'karriere',
        title: `Karriereziel erreicht: "${data.title}"`,
        description: data.description || undefined,
        xpAmount: xpGained,
        relatedEntityType: 'career_goal',
        relatedEntityId: goalId,
        metadata: {
          progress: data.progress,
          target_date: data.target_date
        },
      });
    } catch (err) {
      console.error('Error logging career goal activity:', err);
    }
  }

  return data;
}

export async function deleteCareerGoal(
  goalId: string
): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('career_goals')
    .delete()
    .eq('id', goalId);

  if (error) {
    console.error('Error deleting career goal:', error);
    throw error;
  }
}

// ============================================
// KARRIERE STATS
// ============================================

export interface KarriereStats {
  totalJobs: number;
  currentJob: JobHistory | null;
  currentSalary: SalaryEntry | null;
  yearsExperience: number;
  activeGoals: number;
  completedGoals: number;
  salaryGrowth: number; // % growth from first to current
}

export async function getKarriereStats(
  userId?: string
): Promise<KarriereStats> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const [jobs, currentJob, currentSalary, goals, salaryHistory] = await Promise.all([
    getJobHistory(userId),
    getCurrentJob(userId),
    getCurrentSalary(userId),
    getCareerGoals(userId),
    getSalaryHistory(userId),
  ]);

  // Calculate years of experience
  let yearsExperience = 0;
  if (jobs.length > 0) {
    const firstJobDate = new Date(jobs[jobs.length - 1].start_date);
    yearsExperience = Math.floor(
      (Date.now() - firstJobDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    );
  }

  // Calculate salary growth
  let salaryGrowth = 0;
  if (salaryHistory.length >= 2) {
    const firstSalary = salaryHistory[salaryHistory.length - 1].amount;
    const latestSalary = salaryHistory[0].amount;
    if (firstSalary > 0) {
      salaryGrowth = Math.round(((latestSalary - firstSalary) / firstSalary) * 100);
    }
  }

  return {
    totalJobs: jobs.length,
    currentJob,
    currentSalary,
    yearsExperience,
    activeGoals: goals.filter(g => g.status === 'active').length,
    completedGoals: goals.filter(g => g.status === 'achieved').length,
    salaryGrowth,
  };
}
