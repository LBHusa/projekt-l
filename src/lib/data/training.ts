// ============================================
// TRAINING DATA ACCESS
// Extended Workout System for KOERPER Faction
// ============================================

import { createBrowserClient } from '@/lib/supabase';
import type {
  Exercise,
  MuscleGroup,
  Equipment,
  WorkoutSession,
  WorkoutSessionType,
  WorkoutExerciseRecord,
  ExerciseSet,
  SetType,
  WorkoutWithDetails,
  WorkoutExerciseWithDetails,
  PersonalRecord,
  WorkoutStats,
} from '@/lib/database.types';
import { logActivity } from './activity-log';
import { updateFactionStats } from './factions';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

// ============================================
// EXERCISES
// ============================================

/**
 * Get all exercises (standard + custom)
 */
export async function getExercises(
  userId: string = TEST_USER_ID
): Promise<Exercise[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .or(`is_custom.eq.false,created_by.eq.${userId}`)
    .order('muscle_group')
    .order('name');

  if (error) {
    console.error('Error fetching exercises:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get exercises filtered by muscle group
 */
export async function getExercisesByMuscleGroup(
  muscleGroup: MuscleGroup,
  userId: string = TEST_USER_ID
): Promise<Exercise[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('muscle_group', muscleGroup)
    .or(`is_custom.eq.false,created_by.eq.${userId}`)
    .order('name');

  if (error) {
    console.error('Error fetching exercises by muscle group:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get exercises filtered by equipment
 */
export async function getExercisesByEquipment(
  equipment: Equipment,
  userId: string = TEST_USER_ID
): Promise<Exercise[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('equipment', equipment)
    .or(`is_custom.eq.false,created_by.eq.${userId}`)
    .order('name');

  if (error) {
    console.error('Error fetching exercises by equipment:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a custom exercise
 */
export async function createCustomExercise(
  name: string,
  muscleGroup: MuscleGroup,
  equipment?: Equipment,
  description?: string,
  userId: string = TEST_USER_ID
): Promise<Exercise> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name,
      muscle_group: muscleGroup,
      equipment: equipment || null,
      description: description || null,
      is_custom: true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom exercise:', error);
    throw error;
  }

  return data;
}

// ============================================
// WORKOUT SESSIONS
// ============================================

/**
 * Start a new workout session
 */
export async function startWorkoutSession(
  workoutType: WorkoutSessionType,
  name?: string,
  userId: string = TEST_USER_ID
): Promise<WorkoutSession> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      name: name || null,
      workout_type: workoutType,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error starting workout session:', error);
    throw error;
  }

  return data;
}

/**
 * End a workout session and calculate XP
 */
export async function endWorkoutSession(
  workoutId: string,
  userId: string = TEST_USER_ID
): Promise<{ session: WorkoutSession; xpEarned: number }> {
  const supabase = createBrowserClient();

  // Call the database function to end session and calculate XP
  const { data: result, error: fnError } = await supabase
    .rpc('end_workout_session', { p_workout_id: workoutId });

  if (fnError) {
    console.error('Error ending workout session:', fnError);
    throw fnError;
  }

  const xpEarned = result?.[0]?.xp_earned || 0;

  // Get updated session
  const { data: session, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (error) {
    console.error('Error fetching updated session:', error);
    throw error;
  }

  // Update koerper faction stats
  if (xpEarned > 0) {
    try {
      await updateFactionStats('koerper', xpEarned, userId);
    } catch (err) {
      console.error('Error updating faction stats:', err);
    }
  }

  // Log activity
  try {
    await logActivity({
      userId,
      activityType: 'workout_logged',
      factionId: 'koerper',
      title: `Workout abgeschlossen: ${session.name || session.workout_type}`,
      description: `${session.duration_minutes} Minuten`,
      xpAmount: xpEarned,
      relatedEntityType: 'workout_session',
      relatedEntityId: workoutId,
    });
  } catch (err) {
    console.error('Error logging activity:', err);
  }

  return { session, xpEarned };
}

/**
 * Get workout history
 */
export async function getWorkoutHistory(
  limit: number = 10,
  userId: string = TEST_USER_ID
): Promise<WorkoutSession[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching workout history:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get active (unfinished) workout
 */
export async function getActiveWorkout(
  userId: string = TEST_USER_ID
): Promise<WorkoutSession | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching active workout:', error);
    return null;
  }

  return data;
}

/**
 * Get workout with full details (exercises + sets)
 */
export async function getWorkoutDetails(
  workoutId: string
): Promise<WorkoutWithDetails | null> {
  const supabase = createBrowserClient();

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (sessionError) {
    if (sessionError.code === 'PGRST116') return null;
    console.error('Error fetching workout session:', sessionError);
    throw sessionError;
  }

  // Get exercises with their sets
  const { data: workoutExercises, error: exError } = await supabase
    .from('workout_exercises')
    .select(`
      *,
      exercise:exercises(*),
      sets:exercise_sets(*)
    `)
    .eq('workout_id', workoutId)
    .order('exercise_order');

  if (exError) {
    console.error('Error fetching workout exercises:', exError);
    throw exError;
  }

  // Calculate totals
  let totalSets = 0;
  let totalVolumeKg = 0;

  const exercises: WorkoutExerciseWithDetails[] = (workoutExercises || []).map((we) => {
    const sets = we.sets || [];
    totalSets += sets.length;
    sets.forEach((set: ExerciseSet) => {
      if (set.reps && set.weight_kg) {
        totalVolumeKg += set.reps * set.weight_kg;
      }
    });

    return {
      ...we,
      exercise: we.exercise,
      sets: sets.sort((a: ExerciseSet, b: ExerciseSet) => a.set_number - b.set_number),
    };
  });

  return {
    ...session,
    exercises,
    total_sets: totalSets,
    total_volume_kg: totalVolumeKg,
  };
}

// ============================================
// WORKOUT EXERCISES
// ============================================

/**
 * Add an exercise to a workout
 */
export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
  order?: number
): Promise<WorkoutExerciseRecord> {
  const supabase = createBrowserClient();

  // If no order specified, get the next order
  let exerciseOrder = order;
  if (exerciseOrder === undefined) {
    const { data: existing } = await supabase
      .from('workout_exercises')
      .select('exercise_order')
      .eq('workout_id', workoutId)
      .order('exercise_order', { ascending: false })
      .limit(1);

    exerciseOrder = existing && existing.length > 0 ? existing[0].exercise_order + 1 : 0;
  }

  const { data, error } = await supabase
    .from('workout_exercises')
    .insert({
      workout_id: workoutId,
      exercise_id: exerciseId,
      exercise_order: exerciseOrder,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding exercise to workout:', error);
    throw error;
  }

  return data;
}

/**
 * Remove an exercise from a workout
 */
export async function removeExerciseFromWorkout(
  workoutExerciseId: string
): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('workout_exercises')
    .delete()
    .eq('id', workoutExerciseId);

  if (error) {
    console.error('Error removing exercise from workout:', error);
    throw error;
  }
}

// ============================================
// EXERCISE SETS
// ============================================

/**
 * Add a set to an exercise in a workout
 */
export async function addSet(
  workoutExerciseId: string,
  data: {
    reps?: number;
    weight_kg?: number;
    duration_seconds?: number;
    distance_meters?: number;
    set_type?: SetType;
    notes?: string;
  }
): Promise<ExerciseSet> {
  const supabase = createBrowserClient();

  // Get next set number
  const { data: existing } = await supabase
    .from('exercise_sets')
    .select('set_number')
    .eq('workout_exercise_id', workoutExerciseId)
    .order('set_number', { ascending: false })
    .limit(1);

  const setNumber = existing && existing.length > 0 ? existing[0].set_number + 1 : 1;

  const { data: set, error } = await supabase
    .from('exercise_sets')
    .insert({
      workout_exercise_id: workoutExerciseId,
      set_number: setNumber,
      set_type: data.set_type || 'working',
      reps: data.reps || null,
      weight_kg: data.weight_kg || null,
      duration_seconds: data.duration_seconds || null,
      distance_meters: data.distance_meters || null,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding set:', error);
    throw error;
  }

  return set;
}

/**
 * Update a set
 */
export async function updateSet(
  setId: string,
  updates: Partial<{
    reps: number;
    weight_kg: number;
    duration_seconds: number;
    distance_meters: number;
    set_type: SetType;
    notes: string;
  }>
): Promise<ExerciseSet> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('exercise_sets')
    .update(updates)
    .eq('id', setId)
    .select()
    .single();

  if (error) {
    console.error('Error updating set:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a set
 */
export async function deleteSet(setId: string): Promise<void> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('exercise_sets')
    .delete()
    .eq('id', setId);

  if (error) {
    console.error('Error deleting set:', error);
    throw error;
  }
}

// ============================================
// STATISTICS & PERSONAL RECORDS
// ============================================

/**
 * Get personal records for all exercises
 */
export async function getPersonalRecords(
  userId: string = TEST_USER_ID
): Promise<PersonalRecord[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching personal records:', error);
    return [];
  }

  return data || [];
}

/**
 * Get workout statistics
 */
export async function getWorkoutStats(
  userId: string = TEST_USER_ID
): Promise<WorkoutStats> {
  const supabase = createBrowserClient();

  // Get all completed workouts
  const { data: workouts, error } = await supabase
    .from('workout_sessions')
    .select('id, duration_minutes, xp_earned, started_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null);

  if (error) {
    console.error('Error fetching workout stats:', error);
  }

  const allWorkouts = workouts || [];

  // Calculate stats
  const totalWorkouts = allWorkouts.length;
  const totalDuration = allWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
  const totalXp = allWorkouts.reduce((sum, w) => sum + (w.xp_earned || 0), 0);

  // Workouts this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const workoutsThisWeek = allWorkouts.filter(
    w => new Date(w.started_at) >= weekAgo
  ).length;

  // Get favorite muscle group from workout_exercises
  const { data: muscleGroups } = await supabase
    .from('workout_exercises')
    .select('exercise:exercises(muscle_group)')
    .in('workout_id', allWorkouts.map(w => w.id));

  let favoriteMuscleGroup: MuscleGroup | null = null;
  if (muscleGroups && muscleGroups.length > 0) {
    const counts: Record<string, number> = {};
    muscleGroups.forEach((we) => {
      const exercise = we.exercise as any;
      const mg = Array.isArray(exercise) ? exercise[0]?.muscle_group : exercise?.muscle_group;
      if (mg) {
        counts[mg] = (counts[mg] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      favoriteMuscleGroup = sorted[0][0] as MuscleGroup;
    }
  }

  return {
    total_workouts: totalWorkouts,
    total_duration_minutes: totalDuration,
    total_xp_earned: totalXp,
    workouts_this_week: workoutsThisWeek,
    favorite_muscle_group: favoriteMuscleGroup,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getMuscleGroupLabel(group: MuscleGroup): string {
  const labels: Record<MuscleGroup, string> = {
    chest: 'Brust',
    back: 'Ruecken',
    legs: 'Beine',
    shoulders: 'Schultern',
    arms: 'Arme',
    core: 'Core',
    full_body: 'Ganzkoerper',
    cardio: 'Cardio',
  };
  return labels[group];
}

export function getMuscleGroupIcon(group: MuscleGroup): string {
  const icons: Record<MuscleGroup, string> = {
    chest: '🫁',
    back: '🔙',
    legs: '🦵',
    shoulders: '💪',
    arms: '💪',
    core: '🎯',
    full_body: '🏋️',
    cardio: '🏃',
  };
  return icons[group];
}

export function getEquipmentLabel(equipment: Equipment): string {
  const labels: Record<Equipment, string> = {
    barbell: 'Langhantel',
    dumbbell: 'Kurzhantel',
    machine: 'Maschine',
    bodyweight: 'Koerpergewicht',
    cable: 'Kabelzug',
    kettlebell: 'Kettlebell',
    resistance_band: 'Widerstandsband',
    none: 'Ohne',
  };
  return labels[equipment];
}

export function getWorkoutTypeLabel(type: WorkoutSessionType): string {
  const labels: Record<WorkoutSessionType, string> = {
    strength: 'Kraft',
    cardio: 'Cardio',
    flexibility: 'Flexibilitaet',
    mixed: 'Gemischt',
    hiit: 'HIIT',
  };
  return labels[type];
}

export function getSetTypeLabel(type: SetType): string {
  const labels: Record<SetType, string> = {
    warmup: 'Aufwaermen',
    working: 'Arbeitssatz',
    dropset: 'Dropsatz',
    failure: 'Bis Versagen',
  };
  return labels[type];
}
