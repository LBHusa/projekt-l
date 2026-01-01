/**
 * Koerper (Body/Health) Data Layer
 * CRUD operations for workouts and body metrics
 */

import { createBrowserClient } from '@/lib/supabase';
import type {
  Workout,
  WorkoutType,
  WorkoutIntensity,
  WorkoutExercise,
  BodyMetric,
  MetricType,
} from '@/lib/database.types';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const FACTION_ID = 'koerper';

// =============================================
// FORM DATA TYPES
// =============================================

export interface WorkoutFormData {
  name: string;
  workout_type: WorkoutType;
  duration_minutes?: number;
  calories_burned?: number;
  intensity?: WorkoutIntensity;
  exercises?: WorkoutExercise[];
  occurred_at: string;
  notes?: string;
}

export interface BodyMetricFormData {
  metric_type: MetricType;
  value: number;
  unit: string;
  measured_at: string;
  notes?: string;
}

// =============================================
// WORKOUT STATS
// =============================================

export interface WorkoutStats {
  totalWorkouts: number;
  totalMinutes: number;
  totalCalories: number;
  byType: Record<WorkoutType, number>;
  avgDuration: number;
  streak: number;
}

// =============================================
// WORKOUTS - READ
// =============================================

/**
 * Get workouts with optional limit and offset
 */
export async function getWorkouts(
  limit: number = 30,
  offset: number = 0
): Promise<Workout[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching workouts:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single workout by ID
 */
export async function getWorkout(id: string): Promise<Workout | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .eq('user_id', TEST_USER_ID)
    .single();

  if (error) {
    console.error('Error fetching workout:', error);
    return null;
  }

  return data;
}

/**
 * Get workouts from the last N days
 */
export async function getRecentWorkouts(days: number = 30): Promise<Workout[]> {
  const supabase = createBrowserClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .gte('occurred_at', startDate.toISOString())
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('Error fetching recent workouts:', error);
    return [];
  }

  return data || [];
}

/**
 * Get workouts by type
 */
export async function getWorkoutsByType(type: WorkoutType): Promise<Workout[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('workout_type', type)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('Error fetching workouts by type:', error);
    return [];
  }

  return data || [];
}

/**
 * Calculate workout statistics for a given period
 */
export async function getWorkoutStats(days: number = 30): Promise<WorkoutStats> {
  const workouts = await getRecentWorkouts(days);

  const byType: Record<WorkoutType, number> = {
    strength: 0,
    cardio: 0,
    flexibility: 0,
    sports: 0,
    hiit: 0,
    yoga: 0,
    other: 0,
  };

  let totalMinutes = 0;
  let totalCalories = 0;

  workouts.forEach(w => {
    byType[w.workout_type]++;
    totalMinutes += w.duration_minutes || 0;
    totalCalories += w.calories_burned || 0;
  });

  // Calculate streak (consecutive days with workouts)
  const streak = calculateWorkoutStreak(workouts);

  return {
    totalWorkouts: workouts.length,
    totalMinutes,
    totalCalories,
    byType,
    avgDuration: workouts.length > 0 ? Math.round(totalMinutes / workouts.length) : 0,
    streak,
  };
}

/**
 * Calculate current workout streak
 */
function calculateWorkoutStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get unique workout dates
  const workoutDates = new Set(
    workouts.map(w => new Date(w.occurred_at).toDateString())
  );

  let streak = 0;
  const checkDate = new Date(today);

  // Check today first
  if (workoutDates.has(checkDate.toDateString())) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive days going back
  while (workoutDates.has(checkDate.toDateString())) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

// =============================================
// WORKOUTS - WRITE
// =============================================

/**
 * Calculate XP for a workout based on duration and intensity
 */
function calculateWorkoutXP(data: WorkoutFormData): number {
  let baseXP = 15; // Base XP for any workout

  // Duration bonus
  if (data.duration_minutes) {
    if (data.duration_minutes >= 60) baseXP += 20;
    else if (data.duration_minutes >= 30) baseXP += 10;
    else if (data.duration_minutes >= 15) baseXP += 5;
  }

  // Intensity bonus
  if (data.intensity === 'high') baseXP += 10;
  else if (data.intensity === 'medium') baseXP += 5;

  // Type bonus for demanding workouts
  if (['hiit', 'strength'].includes(data.workout_type)) baseXP += 5;

  return baseXP;
}

/**
 * Create a new workout
 */
export async function createWorkout(
  data: WorkoutFormData
): Promise<Workout | null> {
  const supabase = createBrowserClient();

  const xpGained = calculateWorkoutXP(data);

  const { data: workout, error } = await supabase
    .from('workouts')
    .insert({
      user_id: TEST_USER_ID,
      name: data.name,
      workout_type: data.workout_type,
      duration_minutes: data.duration_minutes || null,
      calories_burned: data.calories_burned || null,
      intensity: data.intensity || null,
      exercises: data.exercises || [],
      occurred_at: data.occurred_at,
      notes: data.notes || null,
      xp_gained: xpGained,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workout:', error);
    return null;
  }

  // Log activity and update faction XP
  if (workout) {
    await logWorkoutActivity(workout, xpGained);
  }

  return workout;
}

/**
 * Update an existing workout
 */
export async function updateWorkout(
  id: string,
  data: Partial<WorkoutFormData>
): Promise<Workout | null> {
  const supabase = createBrowserClient();

  const { data: workout, error } = await supabase
    .from('workouts')
    .update({
      ...data,
      // Recalculate XP if relevant fields changed
      ...(data.duration_minutes !== undefined || data.intensity !== undefined
        ? { xp_gained: calculateWorkoutXP(data as WorkoutFormData) }
        : {}),
    })
    .eq('id', id)
    .eq('user_id', TEST_USER_ID)
    .select()
    .single();

  if (error) {
    console.error('Error updating workout:', error);
    return null;
  }

  return workout;
}

/**
 * Delete a workout
 */
export async function deleteWorkout(id: string): Promise<boolean> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id)
    .eq('user_id', TEST_USER_ID);

  if (error) {
    console.error('Error deleting workout:', error);
    return false;
  }

  return true;
}

/**
 * Log workout activity and update faction XP
 */
async function logWorkoutActivity(workout: Workout, xpGained: number): Promise<void> {
  const supabase = createBrowserClient();

  // Log to activity_log
  await supabase.from('activity_log').insert({
    user_id: TEST_USER_ID,
    activity_type: 'workout_logged',
    title: `${workout.name} absolviert`,
    description: workout.duration_minutes
      ? `${workout.duration_minutes} Minuten ${workout.workout_type}`
      : workout.workout_type,
    xp_amount: xpGained,
    faction_id: FACTION_ID,
    related_entity_type: 'workout',
    related_entity_id: workout.id,
  });

  // Update faction stats
  const { data: currentStats } = await supabase
    .from('user_faction_stats')
    .select('total_xp')
    .eq('user_id', TEST_USER_ID)
    .eq('faction_id', FACTION_ID)
    .single();

  if (currentStats) {
    const newXP = (currentStats.total_xp || 0) + xpGained;
    await supabase
      .from('user_faction_stats')
      .update({
        total_xp: newXP,
        level: Math.floor(newXP / 100) + 1,
      })
      .eq('user_id', TEST_USER_ID)
      .eq('faction_id', FACTION_ID);
  }
}

// =============================================
// BODY METRICS - READ
// =============================================

/**
 * Get body metrics with optional limit
 */
export async function getBodyMetrics(limit: number = 50): Promise<BodyMetric[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('measured_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching body metrics:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single body metric by ID
 */
export async function getBodyMetric(id: string): Promise<BodyMetric | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('id', id)
    .eq('user_id', TEST_USER_ID)
    .single();

  if (error) {
    console.error('Error fetching body metric:', error);
    return null;
  }

  return data;
}

/**
 * Get the latest value for each metric type
 */
export async function getLatestMetrics(): Promise<Record<MetricType, BodyMetric | null>> {
  const supabase = createBrowserClient();

  const metricTypes: MetricType[] = [
    'weight', 'body_fat', 'muscle_mass', 'bmi',
    'height', 'waist', 'chest', 'arms'
  ];

  const result: Record<string, BodyMetric | null> = {};

  for (const type of metricTypes) {
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', TEST_USER_ID)
      .eq('metric_type', type)
      .order('measured_at', { ascending: false })
      .limit(1)
      .single();

    result[type] = error ? null : data;
  }

  return result as Record<MetricType, BodyMetric | null>;
}

/**
 * Get history for a specific metric type
 */
export async function getMetricHistory(
  type: MetricType,
  days: number = 90
): Promise<BodyMetric[]> {
  const supabase = createBrowserClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('metric_type', type)
    .gte('measured_at', startDate.toISOString().split('T')[0])
    .order('measured_at', { ascending: true });

  if (error) {
    console.error('Error fetching metric history:', error);
    return [];
  }

  return data || [];
}

// =============================================
// BODY METRICS - WRITE
// =============================================

/**
 * Get default unit for a metric type
 */
export function getDefaultUnit(type: MetricType): string {
  const units: Record<MetricType, string> = {
    weight: 'kg',
    body_fat: '%',
    muscle_mass: 'kg',
    bmi: '',
    height: 'cm',
    waist: 'cm',
    chest: 'cm',
    arms: 'cm',
  };
  return units[type] || '';
}

/**
 * Create a new body metric entry
 */
export async function createBodyMetric(
  data: BodyMetricFormData
): Promise<BodyMetric | null> {
  const supabase = createBrowserClient();

  const { data: metric, error } = await supabase
    .from('body_metrics')
    .insert({
      user_id: TEST_USER_ID,
      metric_type: data.metric_type,
      value: data.value,
      unit: data.unit || getDefaultUnit(data.metric_type),
      measured_at: data.measured_at,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating body metric:', error);
    return null;
  }

  // Log activity (smaller XP for tracking)
  if (metric) {
    await logMetricActivity(metric);
  }

  return metric;
}

/**
 * Update an existing body metric
 */
export async function updateBodyMetric(
  id: string,
  data: Partial<BodyMetricFormData>
): Promise<BodyMetric | null> {
  const supabase = createBrowserClient();

  const { data: metric, error } = await supabase
    .from('body_metrics')
    .update(data)
    .eq('id', id)
    .eq('user_id', TEST_USER_ID)
    .select()
    .single();

  if (error) {
    console.error('Error updating body metric:', error);
    return null;
  }

  return metric;
}

/**
 * Delete a body metric
 */
export async function deleteBodyMetric(id: string): Promise<boolean> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('body_metrics')
    .delete()
    .eq('id', id)
    .eq('user_id', TEST_USER_ID);

  if (error) {
    console.error('Error deleting body metric:', error);
    return false;
  }

  return true;
}

/**
 * Log body metric tracking activity
 */
async function logMetricActivity(metric: BodyMetric): Promise<void> {
  const supabase = createBrowserClient();

  const labels: Record<MetricType, string> = {
    weight: 'Gewicht',
    body_fat: 'Koerperfett',
    muscle_mass: 'Muskelmasse',
    bmi: 'BMI',
    height: 'Groesse',
    waist: 'Taillenumfang',
    chest: 'Brustumfang',
    arms: 'Armumfang',
  };

  await supabase.from('activity_log').insert({
    user_id: TEST_USER_ID,
    activity_type: 'xp_gained',
    title: `${labels[metric.metric_type]} erfasst`,
    description: `${metric.value} ${metric.unit}`,
    xp_amount: 5, // Small XP for tracking
    faction_id: FACTION_ID,
    related_entity_type: 'body_metric',
    related_entity_id: metric.id,
  });
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Workout type labels and icons (German)
 */
export const WORKOUT_TYPE_CONFIG: Record<WorkoutType, { label: string; icon: string; color: string }> = {
  strength: { label: 'Kraft', icon: '💪', color: 'text-red-400' },
  cardio: { label: 'Cardio', icon: '🏃', color: 'text-blue-400' },
  flexibility: { label: 'Flexibilitaet', icon: '🧘', color: 'text-purple-400' },
  sports: { label: 'Sport', icon: '⚽', color: 'text-green-400' },
  hiit: { label: 'HIIT', icon: '🔥', color: 'text-orange-400' },
  yoga: { label: 'Yoga', icon: '🧘‍♀️', color: 'text-pink-400' },
  other: { label: 'Andere', icon: '🎯', color: 'text-gray-400' },
};

/**
 * Body metric type labels (German)
 */
export const METRIC_TYPE_CONFIG: Record<MetricType, { label: string; unit: string }> = {
  weight: { label: 'Gewicht', unit: 'kg' },
  body_fat: { label: 'Koerperfett', unit: '%' },
  muscle_mass: { label: 'Muskelmasse', unit: 'kg' },
  bmi: { label: 'BMI', unit: '' },
  height: { label: 'Groesse', unit: 'cm' },
  waist: { label: 'Taillenumfang', unit: 'cm' },
  chest: { label: 'Brustumfang', unit: 'cm' },
  arms: { label: 'Armumfang', unit: 'cm' },
};
