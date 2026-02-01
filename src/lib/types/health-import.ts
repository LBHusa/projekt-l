// ============================================
// Health Import Types
// Phase 01-03: Health Import -> Habit Auto-Complete
// ============================================

export interface HealthWorkout {
  workoutType: string;
  startDate: string;
  endDate: string;
  duration: number; // minutes
  caloriesBurned?: number;
  distance?: number; // km
  heartRateAvg?: number;
  externalId: string;
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
  distance?: number;
  externalId: string;
}

export interface HealthSleep {
  startDate: string;
  endDate: string;
  duration: number;
  quality?: 'deep' | 'light' | 'rem' | 'awake';
  externalId: string;
}

export interface HealthImportData {
  workouts?: HealthWorkout[];
  bodyMetrics?: HealthBodyMetric[];
  steps?: HealthSteps[];
  sleep?: HealthSleep[];
}

export interface HabitHealthMapping {
  id: string;
  user_id: string;
  habit_id: string;
  health_workout_type: string;
  min_duration_minutes: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitAutoCompleteResult {
  habitId: string;
  habitName: string;
  xpGained: number;
  workoutType: string;
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
  habitsAutoCompleted: HabitAutoCompleteResult[];
}

// Workout type normalization map
export const WORKOUT_TYPE_ALIASES: Record<string, string> = {
  // Running
  running: 'running',
  jogging: 'running',
  run: 'running',
  // Walking
  walking: 'walking',
  walk: 'walking',
  hiking: 'hiking',
  // Cycling
  cycling: 'cycling',
  biking: 'cycling',
  indoor_cycling: 'cycling',
  // Strength
  strength_training: 'strength_training',
  traditional_strength: 'strength_training',
  functional_strength: 'strength_training',
  weight_training: 'strength_training',
  traditional_strength_training: 'strength_training',
  functional_strength_training: 'strength_training',
  // Yoga/Flexibility
  yoga: 'yoga',
  pilates: 'pilates',
  flexibility: 'flexibility',
  stretching: 'flexibility',
  // Swimming
  swimming: 'swimming',
  pool_swim: 'swimming',
  open_water_swim: 'swimming',
  // Cardio
  elliptical: 'cardio',
  stair_climbing: 'cardio',
  rowing: 'rowing',
  // HIIT
  high_intensity_interval_training: 'hiit',
  hiit: 'hiit',
  // Other
  martial_arts: 'martial_arts',
  boxing: 'boxing',
  dance: 'dance',
  core_training: 'core',
};
