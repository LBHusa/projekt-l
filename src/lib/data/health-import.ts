// ============================================
// HEALTH IMPORT DATA ACCESS
// Apple Health Integration for Workout, Sleep, Steps Import
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';
import { getUserIdOrCurrent } from '@/lib/auth-helper';

// await getUserIdOrCurrent() removed - now using getUserIdOrCurrent()

// ============================================
// TEMPORARY TYPES (until migration is ready)
// ============================================

export interface HealthWorkout {
  workoutType: string; // e.g., "running", "cycling", "strength_training"
  startDate: string;
  endDate: string;
  duration: number; // in minutes
  caloriesBurned?: number;
  distance?: number; // in km
  heartRateAvg?: number;
  externalId: string; // Apple Health UUID
}

export interface HealthBodyMetric {
  type: 'weight' | 'body_fat' | 'height';
  value: number;
  unit: string;
  date: string;
  externalId: string;
}

export interface HealthSteps {
  date: string;
  steps: number;
  distance?: number; // in km
  externalId: string;
}

export interface HealthSleep {
  startDate: string;
  endDate: string;
  duration: number; // in minutes
  quality?: 'deep' | 'light' | 'rem' | 'awake';
  externalId: string;
}

export interface HealthImportData {
  workouts?: HealthWorkout[];
  bodyMetrics?: HealthBodyMetric[];
  steps?: HealthSteps[];
  sleep?: HealthSleep[];
}

export interface ImportResult {
  success: boolean;
  imported: {
    workouts: number;
    bodyMetrics: number;
    steps: number;
    sleep: number;
  };
  skipped: {
    workouts: number;
    bodyMetrics: number;
    steps: number;
    sleep: number;
  };
  totalXP: number;
  errors: string[];
}

// ============================================
// MAIN IMPORT ORCHESTRATOR
// ============================================

/**
 * Main function to orchestrate health data import
 * Called by webhook endpoint
 */
export async function importHealthData(
  userId: string,
  data: HealthImportData
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: { workouts: 0, bodyMetrics: 0, steps: 0, sleep: 0 },
    skipped: { workouts: 0, bodyMetrics: 0, steps: 0, sleep: 0 },
    totalXP: 0,
    errors: [],
  };

  try {
    // Import Workouts
    if (data.workouts && data.workouts.length > 0) {
      const workoutResult = await importWorkouts(userId, data.workouts);
      result.imported.workouts = workoutResult.imported;
      result.skipped.workouts = workoutResult.skipped;
      result.totalXP += workoutResult.xp;
      result.errors.push(...workoutResult.errors);
    }

    // Import Body Metrics
    if (data.bodyMetrics && data.bodyMetrics.length > 0) {
      const metricsResult = await importBodyMetrics(userId, data.bodyMetrics);
      result.imported.bodyMetrics = metricsResult.imported;
      result.skipped.bodyMetrics = metricsResult.skipped;
      result.totalXP += metricsResult.xp;
      result.errors.push(...metricsResult.errors);
    }

    // Import Steps
    if (data.steps && data.steps.length > 0) {
      const stepsResult = await importSteps(userId, data.steps);
      result.imported.steps = stepsResult.imported;
      result.skipped.steps = stepsResult.skipped;
      result.totalXP += stepsResult.xp;
      result.errors.push(...stepsResult.errors);
    }

    // Import Sleep
    if (data.sleep && data.sleep.length > 0) {
      const sleepResult = await importSleep(userId, data.sleep);
      result.imported.sleep = sleepResult.imported;
      result.skipped.sleep = sleepResult.skipped;
      result.totalXP += sleepResult.xp;
      result.errors.push(...sleepResult.errors);
    }

    // Log the import
    await logImport(userId, result);

    // If we got any XP, update faction stats
    if (result.totalXP > 0) {
      await updateFactionStats('koerper', result.totalXP, userId);
    }

    return result;
  } catch (error) {
    console.error('Error in importHealthData:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

// ============================================
// WORKOUT IMPORT
// ============================================

interface ImportSubResult {
  imported: number;
  skipped: number;
  xp: number;
  errors: string[];
}

async function importWorkouts(
  userId: string,
  workouts: HealthWorkout[]
): Promise<ImportSubResult> {
  const result: ImportSubResult = {
    imported: 0,
    skipped: 0,
    xp: 0,
    errors: [],
  };

  const supabase = createBrowserClient();

  for (const workout of workouts) {
    try {
      // Check for duplicate
      const isDuplicate = await checkDuplicate(userId, workout.externalId, 'workout');
      if (isDuplicate) {
        result.skipped++;
        continue;
      }

      // Map workout type
      const mappedType = mapWorkoutType(workout.workoutType);

      // Calculate XP
      const xp = calculateWorkoutXP(workout);

      // Insert workout (using trainingslog table as proxy until migration)
      const { error } = await supabase.from('trainingslog').insert({
        user_id: userId,
        workout_type: mappedType,
        start_time: workout.startDate,
        end_time: workout.endDate,
        duration_minutes: workout.duration,
        calories_burned: workout.caloriesBurned,
        notes: `Imported from Apple Health (${workout.externalId})`,
      });

      if (error) {
        result.errors.push(`Workout import failed: ${error.message}`);
        continue;
      }

      result.imported++;
      result.xp += xp;

      // Log activity
      await logActivity({
        userId,
        activityType: 'workout_completed' as any, // Using workout_completed as proxy
        factionId: 'koerper',
        title: `Workout imported from Apple Health`,
        description: `${mappedType} - ${workout.duration} minutes`,
        xpAmount: xp,
        metadata: {
          source: 'apple_health',
          externalId: workout.externalId,
          workoutType: mappedType,
          duration: workout.duration,
        },
      });
    } catch (error) {
      result.errors.push(
        `Workout processing error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  return result;
}

// ============================================
// BODY METRICS IMPORT
// ============================================

async function importBodyMetrics(
  userId: string,
  metrics: HealthBodyMetric[]
): Promise<ImportSubResult> {
  const result: ImportSubResult = {
    imported: 0,
    skipped: 0,
    xp: 0,
    errors: [],
  };

  // Body metrics give fixed 2 XP each
  const XP_PER_METRIC = 2;

  for (const metric of metrics) {
    try {
      // Check for duplicate
      const isDuplicate = await checkDuplicate(userId, metric.externalId, 'body_metric');
      if (isDuplicate) {
        result.skipped++;
        continue;
      }

      // Note: Actual implementation will insert into health_body_metrics table
      // For now, just log the activity
      await logActivity({
        userId,
        activityType: 'workout_completed' as any, // Using as proxy
        factionId: 'koerper',
        title: `Body metric imported from Apple Health`,
        description: `${metric.type}: ${metric.value} ${metric.unit}`,
        xpAmount: XP_PER_METRIC,
        metadata: {
          source: 'apple_health',
          externalId: metric.externalId,
          type: metric.type,
          value: metric.value,
          unit: metric.unit,
          date: metric.date,
        },
      });

      result.imported++;
      result.xp += XP_PER_METRIC;
    } catch (error) {
      result.errors.push(
        `Body metric processing error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  return result;
}

// ============================================
// STEPS IMPORT
// ============================================

async function importSteps(
  userId: string,
  steps: HealthSteps[]
): Promise<ImportSubResult> {
  const result: ImportSubResult = {
    imported: 0,
    skipped: 0,
    xp: 0,
    errors: [],
  };

  for (const step of steps) {
    try {
      // Check for duplicate
      const isDuplicate = await checkDuplicate(userId, step.externalId, 'steps');
      if (isDuplicate) {
        result.skipped++;
        continue;
      }

      // Calculate XP based on step count
      const xp = calculateStepsXP(step.steps);

      // Note: Actual implementation will insert into health_steps table
      // For now, just log the activity
      await logActivity({
        userId,
        activityType: 'workout_completed' as any, // Using as proxy
        factionId: 'koerper',
        title: `Steps imported from Apple Health`,
        description: `${step.steps} steps on ${step.date}`,
        xpAmount: xp,
        metadata: {
          source: 'apple_health',
          externalId: step.externalId,
          date: step.date,
          steps: step.steps,
          distance: step.distance,
        },
      });

      result.imported++;
      result.xp += xp;
    } catch (error) {
      result.errors.push(
        `Steps processing error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  return result;
}

// ============================================
// SLEEP IMPORT
// ============================================

async function importSleep(
  userId: string,
  sleep: HealthSleep[]
): Promise<ImportSubResult> {
  const result: ImportSubResult = {
    imported: 0,
    skipped: 0,
    xp: 0,
    errors: [],
  };

  for (const sleepData of sleep) {
    try {
      // Check for duplicate
      const isDuplicate = await checkDuplicate(userId, sleepData.externalId, 'sleep');
      if (isDuplicate) {
        result.skipped++;
        continue;
      }

      // Calculate XP based on sleep duration
      const xp = calculateSleepXP(sleepData.duration);

      // Note: Actual implementation will insert into health_sleep table
      // For now, just log the activity
      await logActivity({
        userId,
        activityType: 'workout_completed' as any, // Using as proxy
        factionId: 'koerper',
        title: `Sleep imported from Apple Health`,
        description: `${(sleepData.duration / 60).toFixed(1)} hours of sleep`,
        xpAmount: xp,
        metadata: {
          source: 'apple_health',
          externalId: sleepData.externalId,
          startDate: sleepData.startDate,
          endDate: sleepData.endDate,
          duration: sleepData.duration,
          quality: sleepData.quality,
        },
      });

      result.imported++;
      result.xp += xp;
    } catch (error) {
      result.errors.push(
        `Sleep processing error: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }

  return result;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Apple Health workout types to Projekt L workout types
 */
function mapWorkoutType(healthKitType: string): string {
  const mapping: Record<string, string> = {
    running: 'running',
    cycling: 'cycling',
    walking: 'walking',
    hiking: 'hiking',
    swimming: 'swimming',
    strength_training: 'strength',
    yoga: 'yoga',
    pilates: 'pilates',
    martial_arts: 'martial_arts',
    rowing: 'rowing',
    elliptical: 'cardio',
    stair_climbing: 'cardio',
    functional_strength_training: 'strength',
    traditional_strength_training: 'strength',
    cross_training: 'cross_training',
    mixed_cardio: 'cardio',
    high_intensity_interval_training: 'hiit',
    jump_rope: 'cardio',
    stairs: 'cardio',
    step_training: 'cardio',
    fitness_gaming: 'other',
    barre: 'other',
    core_training: 'core',
    flexibility: 'stretching',
    cooldown: 'stretching',
    // Add more mappings as needed
  };

  return mapping[healthKitType.toLowerCase()] || 'other';
}

/**
 * Calculate XP for a workout based on duration and intensity
 */
function calculateWorkoutXP(workout: HealthWorkout): number {
  const { duration, caloriesBurned, distance } = workout;

  // Base XP: 15 XP minimum
  let xp = 15;

  // Duration bonus: +1 XP per 3 minutes (max +20 XP)
  const durationBonus = Math.min(Math.floor(duration / 3), 20);
  xp += durationBonus;

  // Calories bonus: +1 XP per 50 calories (max +15 XP)
  if (caloriesBurned) {
    const caloriesBonus = Math.min(Math.floor(caloriesBurned / 50), 15);
    xp += caloriesBonus;
  }

  // Distance bonus: +1 XP per km (max +10 XP)
  if (distance) {
    const distanceBonus = Math.min(Math.floor(distance), 10);
    xp += distanceBonus;
  }

  // Cap at 50 XP per workout
  return Math.min(xp, 50);
}

/**
 * Calculate XP for daily steps
 */
function calculateStepsXP(steps: number): number {
  // 0-3000 steps: 5 XP
  // 3001-6000 steps: 10 XP
  // 6001-10000 steps: 15 XP
  // 10000+ steps: 20 XP

  if (steps >= 10000) return 20;
  if (steps >= 6001) return 15;
  if (steps >= 3001) return 10;
  return 5;
}

/**
 * Calculate XP for sleep based on duration
 */
function calculateSleepXP(durationMinutes: number): number {
  const hours = durationMinutes / 60;

  // Less than 5 hours: 5 XP
  // 5-6 hours: 8 XP
  // 6-7 hours: 10 XP
  // 7-8 hours: 15 XP (ideal)
  // 8+ hours: 12 XP

  if (hours >= 8) return 12;
  if (hours >= 7) return 15; // Ideal range
  if (hours >= 6) return 10;
  if (hours >= 5) return 8;
  return 5;
}

/**
 * Check if data with this external ID has already been imported
 */
async function checkDuplicate(
  userId: string,
  externalId: string,
  dataType: 'workout' | 'body_metric' | 'steps' | 'sleep'
): Promise<boolean> {
  // Note: This will use health_import_dedupe table once migration is ready
  // For now, we'll use a simple check in activity_log
  const supabase = createBrowserClient();

  const { data } = await supabase
    .from('activity_log')
    .select('id')
    .eq('user_id', userId)
    .eq('activity_type', `${dataType}_imported`)
    .contains('details', { externalId });

  return (data && data.length > 0) || false;
}

/**
 * Log the import result for tracking
 */
async function logImport(userId: string, result: ImportResult): Promise<void> {
  const totalImported =
    result.imported.workouts +
    result.imported.bodyMetrics +
    result.imported.steps +
    result.imported.sleep;

  await logActivity({
    userId,
    activityType: 'workout_completed' as any, // Using as proxy
    factionId: 'koerper',
    title: `Health data import completed`,
    description: `Imported ${totalImported} items from Apple Health`,
    xpAmount: result.totalXP,
    metadata: {
      source: 'apple_health',
      imported: result.imported,
      skipped: result.skipped,
      totalXP: result.totalXP,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Validate API key for webhook authentication
 */
export async function validateApiKey(apiKey: string): Promise<string | null> {
  const supabase = createBrowserClient();

  // Note: This will query health_api_keys table once migration is ready
  // For now, we'll check against environment variable
  if (process.env.HEALTH_IMPORT_API_KEY && apiKey === process.env.HEALTH_IMPORT_API_KEY) {
    return await getUserIdOrCurrent();
  }

  // When migration is ready, use this:
  /*
  const { data, error } = await supabase
    .from('health_api_keys')
    .select('user_id, is_active, last_used_at')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  // Update last_used_at
  await supabase
    .from('health_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('api_key', apiKey);

  return data.user_id;
  */

  return null;
}
