-- Habit Health Mappings
-- Links health import workout types to habits for auto-completion
-- Part of Phase 01-03: Health Import -> Habit Auto-Complete

CREATE TABLE IF NOT EXISTS habit_health_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,

  -- Workout matching criteria
  health_workout_type TEXT NOT NULL,
  min_duration_minutes INTEGER DEFAULT 0,

  -- Settings
  enabled BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One mapping per habit-workout combination
  UNIQUE(habit_id, health_workout_type)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_habit_health_user ON habit_health_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_health_workout ON habit_health_mappings(health_workout_type);
CREATE INDEX IF NOT EXISTS idx_habit_health_enabled ON habit_health_mappings(user_id, enabled)
  WHERE enabled = TRUE;

-- RLS policies
ALTER TABLE habit_health_mappings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can manage own mappings" ON habit_health_mappings;

CREATE POLICY "Users can manage own mappings" ON habit_health_mappings
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_habit_health_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_habit_health_mappings_updated_at ON habit_health_mappings;

CREATE TRIGGER update_habit_health_mappings_updated_at
  BEFORE UPDATE ON habit_health_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_habit_health_mappings_updated_at();

COMMENT ON TABLE habit_health_mappings IS 'User-defined links between health workout types and habits for auto-completion';

-- Common workout types reference (as comment for documentation)
-- running, walking, hiking, cycling, swimming
-- strength_training, functional_strength, traditional_strength
-- yoga, pilates, flexibility
-- elliptical, stair_climbing, rowing
-- dance, martial_arts, boxing
