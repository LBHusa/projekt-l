/**
 * Trainingslog Data Layer
 * Advanced workout tracking with exercises, sets, and reps
 */

import { createBrowserClient } from '@/lib/supabase';
import { getUserIdOrCurrent } from '@/lib/auth-helper';
import type {
  Exercise,
  WorkoutSession,
  WorkoutExerciseRecord,
  ExerciseSet,
  WorkoutWithDetails,
  WorkoutExerciseWithDetails,
  PersonalRecord,
  MuscleGroup,
  Equipment,
  WorkoutSessionType,
  SetType,
} from '@/lib/database.types';

// await getUserIdOrCurrent() removed - now using getUserIdOrCurrent()
const FACTION_ID = 'koerper';

// =============================================
// EXERCISES LIBRARY
// =============================================

/**
 * Get all exercises (standard + custom for user)
 */
export async function getExercises(): Promise<Exercise[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .or(`is_custom.eq.false,created_by.eq.${await getUserIdOrCurrent()}`)
    .order('muscle_group', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }

  return data || [];
}

/**
 * Get exercises filtered by muscle group
 */
export async function getExercisesByMuscleGroup(
  muscleGroup: MuscleGroup
): Promise<Exercise[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('muscle_group', muscleGroup)
    .or(`is_custom.eq.false,created_by.eq.${await getUserIdOrCurrent()}`)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching exercises by muscle group:', error);
    return [];
  }

  return data || [];
}

/**
 * Create custom exercise
 */
export async function createCustomExercise(data: {
  name: string;
  muscle_group: MuscleGroup;
  equipment?: Equipment;
  description?: string;
}): Promise<Exercise | null> {
  const supabase = createBrowserClient();

  const { data: exercise, error } = await supabase
    .from('exercises')
    .insert({
      name: data.name,
      muscle_group: data.muscle_group,
      equipment: data.equipment || null,
      description: data.description || null,
      is_custom: true,
      created_by: await getUserIdOrCurrent(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom exercise:', error);
    return null;
  }

  return exercise;
}

// =============================================
// WORKOUT SESSIONS
// =============================================

/**
 * Start a new workout session
 */
export async function startWorkoutSession(data: {
  name?: string;
  workout_type: WorkoutSessionType;
}): Promise<WorkoutSession | null> {
  const supabase = createBrowserClient();

  const { data: session, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: await getUserIdOrCurrent(),
      name: data.name || null,
      workout_type: data.workout_type,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error starting workout session:', error);
    return null;
  }

  return session;
}

/**
 * End workout session and calculate XP
 */
export async function endWorkoutSession(
  workoutId: string
): Promise<{ xp_earned: number } | null> {
  const supabase = createBrowserClient();

  // Call stored function to end session and calculate XP
  const { data, error } = await supabase.rpc('end_workout_session', {
    p_workout_id: workoutId,
  });

  if (error) {
    console.error('Error ending workout session:', error);
    return null;
  }

  const result = data[0];

  // Log activity and update faction XP
  if (result?.xp_earned > 0) {
    await logWorkoutSessionActivity(workoutId, result.xp_earned);
  }

  return { xp_earned: result?.xp_earned || 0 };
}

/**
 * Get recent workout sessions
 */
export async function getWorkoutSessions(
  limit: number = 30
): Promise<WorkoutSession[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', await getUserIdOrCurrent())
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching workout sessions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get workout session with full details (exercises and sets)
 */
export async function getWorkoutWithDetails(
  workoutId: string
): Promise<WorkoutWithDetails | null> {
  const supabase = createBrowserClient();

  // Get workout session
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (sessionError || !session) {
    console.error('Error fetching workout session:', sessionError);
    return null;
  }

  // Get workout exercises with exercise details
  const { data: workoutExercises, error: exercisesError } = await supabase
    .from('workout_exercises')
    .select(`
      *,
      exercise:exercises(*)
    `)
    .eq('workout_id', workoutId)
    .order('exercise_order', { ascending: true });

  if (exercisesError) {
    console.error('Error fetching workout exercises:', exercisesError);
    return { ...session, exercises: [], total_sets: 0, total_volume_kg: 0 };
  }

  // Get sets for each exercise
  const exercisesWithSets: WorkoutExerciseWithDetails[] = await Promise.all(
    (workoutExercises || []).map(async (we) => {
      const { data: sets } = await supabase
        .from('exercise_sets')
        .select('*')
        .eq('workout_exercise_id', we.id)
        .order('set_number', { ascending: true });

      return {
        ...we,
        exercise: we.exercise as Exercise,
        sets: sets || [],
      };
    })
  );

  // Calculate totals
  const total_sets = exercisesWithSets.reduce((sum, ex) => sum + ex.sets.length, 0);
  const total_volume_kg = exercisesWithSets.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce(
        (setSum, set) => setSum + (set.reps || 0) * (set.weight_kg || 0),
        0
      ),
    0
  );

  return {
    ...session,
    exercises: exercisesWithSets,
    total_sets,
    total_volume_kg,
  };
}

// =============================================
// WORKOUT EXERCISES (Junction)
// =============================================

/**
 * Add exercise to workout session
 */
export async function addExerciseToWorkout(data: {
  workout_id: string;
  exercise_id: string;
  exercise_order?: number;
  notes?: string;
}): Promise<WorkoutExerciseRecord | null> {
  const supabase = createBrowserClient();

  const { data: workoutExercise, error } = await supabase
    .from('workout_exercises')
    .insert({
      workout_id: data.workout_id,
      exercise_id: data.exercise_id,
      exercise_order: data.exercise_order || 0,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding exercise to workout:', error);
    return null;
  }

  return workoutExercise;
}

/**
 * Remove exercise from workout
 */
export async function removeExerciseFromWorkout(
  workoutExerciseId: string
): Promise<boolean> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('id', workoutExerciseId);

  if (error) {
    console.error('Error removing exercise from workout:', error);
    return false;
  }

  return true;
}

// =============================================
// EXERCISE SETS
// =============================================

/**
 * Add set to workout exercise
 */
export async function addSetToExercise(data: {
  workout_exercise_id: string;
  set_number: number;
  set_type?: SetType;
  reps?: number;
  weight_kg?: number;
  duration_seconds?: number;
  distance_meters?: number;
  rest_seconds?: number;
  notes?: string;
}): Promise<ExerciseSet | null> {
  const supabase = createBrowserClient();

  const { data: set, error } = await supabase
    .from('exercise_sets')
    .insert({
      workout_exercise_id: data.workout_exercise_id,
      set_number: data.set_number,
      set_type: data.set_type || 'working',
      reps: data.reps || null,
      weight_kg: data.weight_kg || null,
      duration_seconds: data.duration_seconds || null,
      distance_meters: data.distance_meters || null,
      rest_seconds: data.rest_seconds || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding set:', error);
    return null;
  }

  return set;
}

/**
 * Update an exercise set
 */
export async function updateSet(
  setId: string,
  data: Partial<{
    reps: number;
    weight_kg: number;
    duration_seconds: number;
    distance_meters: number;
    rest_seconds: number;
    set_type: SetType;
    notes: string;
  }>
): Promise<ExerciseSet | null> {
  const supabase = createBrowserClient();

  const { data: set, error } = await supabase
    .from('exercise_sets')
    .update(data)
    .eq('id', setId)
    .select()
    .single();

  if (error) {
    console.error('Error updating set:', error);
    return null;
  }

  return set;
}

/**
 * Delete a set
 */
export async function deleteSet(setId: string): Promise<boolean> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('exercise_sets')
    .delete()
    .eq('id', setId);

  if (error) {
    console.error('Error deleting set:', error);
    return false;
  }

  return true;
}

// =============================================
// PERSONAL RECORDS
// =============================================

/**
 * Get personal records for user
 */
export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', await getUserIdOrCurrent())
    .order('max_weight', { ascending: false });

  if (error) {
    console.error('Error fetching personal records:', error);
    return [];
  }

  return data || [];
}

/**
 * Get PR for specific exercise
 */
export async function getExercisePR(
  exerciseId: string
): Promise<PersonalRecord | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', await getUserIdOrCurrent())
    .eq('exercise_id', exerciseId)
    .single();

  if (error) {
    console.error('Error fetching exercise PR:', error);
    return null;
  }

  return data;
}

// =============================================
// ACTIVITY LOGGING
// =============================================

async function logWorkoutSessionActivity(
  workoutId: string,
  xpEarned: number
): Promise<void> {
  const supabase = createBrowserClient();

  // Get workout session details
  const { data: session } = await supabase
    .from('workout_sessions')
    .select('name, workout_type, duration_minutes')
    .eq('id', workoutId)
    .single();

  if (!session) return;

  // Log to activity_log
  await supabase.from('activity_log').insert({
    user_id: await getUserIdOrCurrent(),
    activity_type: 'workout_logged',
    title: session.name || `${session.workout_type} Training`,
    description: session.duration_minutes
      ? `${session.duration_minutes} Minuten Training absolviert`
      : 'Training abgeschlossen',
    xp_amount: xpEarned,
    faction_id: FACTION_ID,
    related_entity_type: 'workout_session',
    related_entity_id: workoutId,
  });

  // Update faction stats
  const { data: currentStats } = await supabase
    .from('user_faction_stats')
    .select('total_xp')
    .eq('user_id', await getUserIdOrCurrent())
    .eq('faction_id', FACTION_ID)
    .single();

  if (currentStats) {
    const newXP = (currentStats.total_xp || 0) + xpEarned;
    await supabase
      .from('user_faction_stats')
      .update({
        total_xp: newXP,
        level: Math.floor(newXP / 100) + 1,
      })
      .eq('user_id', await getUserIdOrCurrent())
      .eq('faction_id', FACTION_ID);
  }
}

// =============================================
// UTILITY CONSTANTS
// =============================================

export const MUSCLE_GROUP_CONFIG: Record<
  MuscleGroup,
  { label: string; icon: string; color: string }
> = {
  chest: { label: 'Brust', icon: '💪', color: 'text-red-400' },
  back: { label: 'Rücken', icon: '🦾', color: 'text-blue-400' },
  legs: { label: 'Beine', icon: '🦵', color: 'text-green-400' },
  shoulders: { label: 'Schultern', icon: '🏋️', color: 'text-yellow-400' },
  arms: { label: 'Arme', icon: '💪', color: 'text-purple-400' },
  core: { label: 'Core', icon: '🧘', color: 'text-orange-400' },
  full_body: { label: 'Ganzkörper', icon: '🏃', color: 'text-pink-400' },
  cardio: { label: 'Cardio', icon: '🏃‍♂️', color: 'text-cyan-400' },
};

export const EQUIPMENT_CONFIG: Record<
  Equipment,
  { label: string; icon: string }
> = {
  barbell: { label: 'Langhantel', icon: '🏋️' },
  dumbbell: { label: 'Kurzhantel', icon: '🏋️‍♂️' },
  machine: { label: 'Maschine', icon: '🦾' },
  bodyweight: { label: 'Körpergewicht', icon: '🤸' },
  cable: { label: 'Kabel', icon: '🔗' },
  kettlebell: { label: 'Kettlebell', icon: '⚫' },
  resistance_band: { label: 'Widerstandsband', icon: '🎗️' },
  none: { label: 'Keine', icon: '🚫' },
};

export const SET_TYPE_CONFIG: Record<
  SetType,
  { label: string; color: string }
> = {
  warmup: { label: 'Aufwärmen', color: 'text-blue-400' },
  working: { label: 'Arbeits-Set', color: 'text-green-400' },
  dropset: { label: 'Drop-Set', color: 'text-orange-400' },
  failure: { label: 'Bis Muskelversagen', color: 'text-red-400' },
};
