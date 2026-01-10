/**
 * Training Plan Data Layer
 * Create and manage weekly workout schedules
 */

import { createBrowserClient } from '@/lib/supabase';
import type { TrainingPlan, WorkoutExercise } from '@/lib/database.types';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export type TrainingGoal = 'strength' | 'endurance' | 'weight_loss' | 'muscle_gain' | 'flexibility';
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayWorkout {
  name: string;
  type: string;
  exercises?: WorkoutExercise[];
  duration?: number;
  notes?: string;
}

export type WeeklySchedule = Record<DayOfWeek, DayWorkout[]>;

// =============================================
// TRAINING PLANS - READ
// =============================================

/**
 * Get all training plans for user
 */
export async function getTrainingPlans(): Promise<TrainingPlan[]> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching training plans:', error);
    return [];
  }

  return data || [];
}

/**
 * Get active training plan
 */
export async function getActivePlan(): Promise<TrainingPlan | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching active plan:', error);
    return null;
  }

  return data;
}

/**
 * Get training plan by ID
 */
export async function getTrainingPlan(id: string): Promise<TrainingPlan | null> {
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .eq('id', id)
    .eq('user_id', TEST_USER_ID)
    .single();

  if (error) {
    console.error('Error fetching training plan:', error);
    return null;
  }

  return data;
}

// =============================================
// TRAINING PLANS - WRITE
// =============================================

/**
 * Create a new training plan
 */
export async function createTrainingPlan(data: {
  name: string;
  description?: string;
  goal?: TrainingGoal;
  schedule?: WeeklySchedule;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}): Promise<TrainingPlan | null> {
  const supabase = createBrowserClient();

  // If setting as active, deactivate other plans first
  if (data.is_active) {
    await deactivateAllPlans();
  }

  const { data: plan, error } = await supabase
    .from('training_plans')
    .insert({
      user_id: TEST_USER_ID,
      name: data.name,
      description: data.description || null,
      goal: data.goal || null,
      schedule: data.schedule || {},
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      is_active: data.is_active || false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating training plan:', error);
    return null;
  }

  return plan;
}

/**
 * Update training plan
 */
export async function updateTrainingPlan(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    goal: TrainingGoal;
    schedule: WeeklySchedule;
    start_date: string;
    end_date: string;
    is_active: boolean;
  }>
): Promise<TrainingPlan | null> {
  const supabase = createBrowserClient();

  // If setting as active, deactivate other plans first
  if (data.is_active) {
    await deactivateAllPlans();
  }

  const { data: plan, error } = await supabase
    .from('training_plans')
    .update(data)
    .eq('id', id)
    .eq('user_id', TEST_USER_ID)
    .select()
    .single();

  if (error) {
    console.error('Error updating training plan:', error);
    return null;
  }

  return plan;
}

/**
 * Delete training plan
 */
export async function deleteTrainingPlan(id: string): Promise<boolean> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('training_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', TEST_USER_ID);

  if (error) {
    console.error('Error deleting training plan:', error);
    return false;
  }

  return true;
}

/**
 * Deactivate all training plans
 */
async function deactivateAllPlans(): Promise<void> {
  const supabase = createBrowserClient();

  await supabase
    .from('training_plans')
    .update({ is_active: false })
    .eq('user_id', TEST_USER_ID)
    .eq('is_active', true);
}

// =============================================
// TEMPLATES
// =============================================

/**
 * Pre-defined training plan templates
 */
export const TRAINING_TEMPLATES = {
  push_pull_legs: {
    name: 'Push/Pull/Legs',
    description: '3er-Split für optimales Muskelwachstum',
    goal: 'muscle_gain' as TrainingGoal,
    schedule: {
      mon: [{ name: 'Push (Brust, Schultern, Trizeps)', type: 'strength', duration: 60 }],
      tue: [],
      wed: [{ name: 'Pull (Rücken, Bizeps)', type: 'strength', duration: 60 }],
      thu: [],
      fri: [{ name: 'Legs (Beine, Core)', type: 'strength', duration: 60 }],
      sat: [],
      sun: [],
    } as WeeklySchedule,
  },
  upper_lower: {
    name: 'Upper/Lower Split',
    description: '4-Tage Split für Kraft und Masse',
    goal: 'strength' as TrainingGoal,
    schedule: {
      mon: [{ name: 'Upper Body (Oberkörper)', type: 'strength', duration: 60 }],
      tue: [{ name: 'Lower Body (Unterkörper)', type: 'strength', duration: 60 }],
      wed: [],
      thu: [{ name: 'Upper Body (Oberkörper)', type: 'strength', duration: 60 }],
      fri: [{ name: 'Lower Body (Unterkörper)', type: 'strength', duration: 60 }],
      sat: [],
      sun: [],
    } as WeeklySchedule,
  },
  full_body: {
    name: 'Ganzkörper 3x/Woche',
    description: 'Effizientes Ganzkörper-Training',
    goal: 'strength' as TrainingGoal,
    schedule: {
      mon: [{ name: 'Ganzkörper A', type: 'strength', duration: 60 }],
      tue: [],
      wed: [{ name: 'Ganzkörper B', type: 'strength', duration: 60 }],
      thu: [],
      fri: [{ name: 'Ganzkörper C', type: 'strength', duration: 60 }],
      sat: [],
      sun: [],
    } as WeeklySchedule,
  },
  cardio_hiit: {
    name: 'Cardio + HIIT',
    description: 'Ausdauer und Fettverbrennung',
    goal: 'weight_loss' as TrainingGoal,
    schedule: {
      mon: [{ name: 'HIIT Training', type: 'hiit', duration: 30 }],
      tue: [],
      wed: [{ name: 'Cardio (Laufen/Radfahren)', type: 'cardio', duration: 45 }],
      thu: [],
      fri: [{ name: 'HIIT Training', type: 'hiit', duration: 30 }],
      sat: [{ name: 'Cardio (Laufen/Radfahren)', type: 'cardio', duration: 45 }],
      sun: [],
    } as WeeklySchedule,
  },
  flexibility: {
    name: 'Flexibilität & Mobility',
    description: 'Yoga und Dehnung',
    goal: 'flexibility' as TrainingGoal,
    schedule: {
      mon: [{ name: 'Yoga Flow', type: 'flexibility', duration: 45 }],
      tue: [],
      wed: [{ name: 'Mobility Routine', type: 'flexibility', duration: 30 }],
      thu: [],
      fri: [{ name: 'Yoga Flow', type: 'flexibility', duration: 45 }],
      sat: [],
      sun: [{ name: 'Dehnung & Entspannung', type: 'flexibility', duration: 30 }],
    } as WeeklySchedule,
  },
};

// =============================================
// UTILITY FUNCTIONS
// =============================================

export const TRAINING_GOAL_CONFIG: Record<
  TrainingGoal,
  { label: string; icon: string; color: string }
> = {
  strength: { label: 'Kraft', icon: '💪', color: 'text-red-400' },
  endurance: { label: 'Ausdauer', icon: '🏃', color: 'text-blue-400' },
  weight_loss: { label: 'Abnehmen', icon: '🔥', color: 'text-orange-400' },
  muscle_gain: { label: 'Muskelaufbau', icon: '🦾', color: 'text-purple-400' },
  flexibility: { label: 'Flexibilität', icon: '🧘', color: 'text-pink-400' },
};

export const DAY_OF_WEEK_CONFIG: Record<DayOfWeek, { label: string; short: string }> = {
  mon: { label: 'Montag', short: 'Mo' },
  tue: { label: 'Dienstag', short: 'Di' },
  wed: { label: 'Mittwoch', short: 'Mi' },
  thu: { label: 'Donnerstag', short: 'Do' },
  fri: { label: 'Freitag', short: 'Fr' },
  sat: { label: 'Samstag', short: 'Sa' },
  sun: { label: 'Sonntag', short: 'So' },
};

export const DAY_ORDER: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Get today's workout from active plan
 */
export async function getTodaysWorkout(): Promise<DayWorkout[] | null> {
  const plan = await getActivePlan();
  if (!plan) return null;

  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, ...

  // Convert to our format (0 = Monday)
  const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  const dayKey = DAY_ORDER[adjustedIndex];

  const schedule = plan.schedule as WeeklySchedule;
  return schedule[dayKey] || [];
}
