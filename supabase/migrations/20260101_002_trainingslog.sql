-- ============================================
-- Projekt L - Trainingslog Extended Schema
-- Migration: 20260101_002_trainingslog.sql
-- ============================================
-- Erweitertes Workout-System mit detailliertem Übungs-Tracking
-- für den KOERPER (Body/Fitness) Lebensbereich
-- ============================================

-- 1. EXERCISES LIBRARY (Übungsbibliothek)
-- ============================================
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL CHECK (muscle_group IN ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body', 'cardio')),
  equipment TEXT CHECK (equipment IN ('barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'kettlebell', 'resistance_band', 'none')),
  description TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by UUID, -- NULL für Standard-Übungen, user_id für custom
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);

-- 2. WORKOUT SESSIONS (Trainingseinheiten)
-- ============================================
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT,
  workout_type TEXT NOT NULL CHECK (workout_type IN ('strength', 'cardio', 'flexibility', 'mixed', 'hiit')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  calories_burned INT,
  notes TEXT,
  xp_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, started_at DESC);

-- 3. WORKOUT EXERCISES (Junction: Übungen in einem Workout)
-- ============================================
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  exercise_order INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON workout_exercises(exercise_id);

-- 4. EXERCISE SETS (Sets pro Übung)
-- ============================================
CREATE TABLE IF NOT EXISTS exercise_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  set_type TEXT DEFAULT 'working' CHECK (set_type IN ('warmup', 'working', 'dropset', 'failure')),
  reps INT,
  weight_kg DECIMAL(6,2),
  duration_seconds INT, -- für Planks, Cardio etc.
  distance_meters INT, -- für Laufen etc.
  rest_seconds INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_sets_workout_exercise ON exercise_sets(workout_exercise_id);

-- 5. SEED: Standard-Übungen
-- ============================================
INSERT INTO exercises (name, muscle_group, equipment, description) VALUES
  -- Brust
  ('Bankdruecken', 'chest', 'barbell', 'Klassische Brustübung mit Langhantel'),
  ('Schraegbankdruecken', 'chest', 'barbell', 'Obere Brust mit Schrägbank'),
  ('Liegestuetze', 'chest', 'bodyweight', 'Bodyweight Brustübung'),
  ('Butterfly', 'chest', 'machine', 'Isolationsübung für die Brust'),
  ('Kabelzug Crossover', 'chest', 'cable', 'Brustübung am Kabelzug'),

  -- Rücken
  ('Klimmzuege', 'back', 'bodyweight', 'Pull-ups für Latissimus'),
  ('Kreuzheben', 'back', 'barbell', 'Compound-Übung für gesamten Rücken'),
  ('Rudern vorgebeugt', 'back', 'barbell', 'Langhantelrudern'),
  ('Latzug', 'back', 'machine', 'Lat Pulldown am Kabelzug'),
  ('Einarmiges Kurzhantelrudern', 'back', 'dumbbell', 'Einarmiges Rudern'),

  -- Beine
  ('Kniebeugen', 'legs', 'barbell', 'Squats mit Langhantel'),
  ('Beinpresse', 'legs', 'machine', 'Leg Press'),
  ('Ausfallschritte', 'legs', 'bodyweight', 'Lunges'),
  ('Beincurls', 'legs', 'machine', 'Hamstring Curls'),
  ('Beinstrecker', 'legs', 'machine', 'Leg Extensions'),
  ('Wadenheben', 'legs', 'machine', 'Calf Raises'),

  -- Schultern
  ('Schulterdruecken', 'shoulders', 'dumbbell', 'Overhead Press mit Kurzhanteln'),
  ('Seitheben', 'shoulders', 'dumbbell', 'Lateral Raises'),
  ('Frontheben', 'shoulders', 'dumbbell', 'Front Raises'),
  ('Aufrechtes Rudern', 'shoulders', 'barbell', 'Upright Rows'),
  ('Face Pulls', 'shoulders', 'cable', 'Für hintere Schulter'),

  -- Arme
  ('Bizeps Curls', 'arms', 'dumbbell', 'Kurzhantel Bizeps Curls'),
  ('Hammercurls', 'arms', 'dumbbell', 'Hammer Curls'),
  ('Langhantel Curls', 'arms', 'barbell', 'Barbell Bicep Curls'),
  ('Trizeps Dips', 'arms', 'bodyweight', 'Dips für Trizeps'),
  ('Trizepsdruecken', 'arms', 'cable', 'Tricep Pushdowns'),
  ('Skull Crushers', 'arms', 'barbell', 'Lying Tricep Extensions'),

  -- Core
  ('Planks', 'core', 'bodyweight', 'Statische Bauchübung'),
  ('Crunches', 'core', 'bodyweight', 'Klassische Bauchübung'),
  ('Beinheben haengend', 'core', 'bodyweight', 'Hanging Leg Raises'),
  ('Russian Twists', 'core', 'bodyweight', 'Rotationsübung für seitliche Bauchmuskeln'),
  ('Ab Wheel Rollouts', 'core', 'bodyweight', 'Ab Roller Übung'),

  -- Ganzkörper / Cardio
  ('Burpees', 'full_body', 'bodyweight', 'Ganzkörper Cardio-Übung'),
  ('Kettlebell Swings', 'full_body', 'kettlebell', 'Hip-hinge Bewegung'),
  ('Laufen', 'cardio', 'none', 'Joggen/Running'),
  ('Fahrradfahren', 'cardio', 'none', 'Cycling'),
  ('Rudern (Ergometer)', 'cardio', 'machine', 'Rowing Machine'),
  ('Springseil', 'cardio', 'none', 'Jump Rope')
ON CONFLICT DO NOTHING;

-- 6. FUNCTION: Calculate Workout XP
-- ============================================
-- XP basierend auf: Dauer + Anzahl Übungen + Anzahl Sets
CREATE OR REPLACE FUNCTION calculate_workout_xp(
  p_duration_minutes INT,
  p_exercise_count INT,
  p_total_sets INT
)
RETURNS INT AS $$
DECLARE
  base_xp INT := 10;
  duration_xp INT;
  exercise_xp INT;
  sets_xp INT;
  total_xp INT;
BEGIN
  -- 1 XP pro 5 Minuten Training (max 20)
  duration_xp := LEAST(20, COALESCE(p_duration_minutes, 0) / 5);

  -- 2 XP pro Übung (max 20)
  exercise_xp := LEAST(20, COALESCE(p_exercise_count, 0) * 2);

  -- 1 XP pro 3 Sets (max 10)
  sets_xp := LEAST(10, COALESCE(p_total_sets, 0) / 3);

  total_xp := base_xp + duration_xp + exercise_xp + sets_xp;

  RETURN total_xp;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCTION: End Workout Session (berechnet XP)
-- ============================================
CREATE OR REPLACE FUNCTION end_workout_session(p_workout_id UUID)
RETURNS TABLE(
  workout_id UUID,
  duration_minutes INT,
  exercise_count INT,
  total_sets INT,
  xp_earned INT
) AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_duration INT;
  v_exercise_count INT;
  v_total_sets INT;
  v_xp INT;
BEGIN
  -- Get start time
  SELECT ws.started_at INTO v_started_at
  FROM workout_sessions ws
  WHERE ws.id = p_workout_id;

  -- Calculate duration
  v_duration := EXTRACT(EPOCH FROM (NOW() - v_started_at)) / 60;

  -- Count exercises
  SELECT COUNT(*) INTO v_exercise_count
  FROM workout_exercises we
  WHERE we.workout_id = p_workout_id;

  -- Count sets
  SELECT COUNT(*) INTO v_total_sets
  FROM exercise_sets es
  JOIN workout_exercises we ON we.id = es.workout_exercise_id
  WHERE we.workout_id = p_workout_id;

  -- Calculate XP
  v_xp := calculate_workout_xp(v_duration, v_exercise_count, v_total_sets);

  -- Update session
  UPDATE workout_sessions ws
  SET
    ended_at = NOW(),
    duration_minutes = v_duration,
    xp_earned = v_xp
  WHERE ws.id = p_workout_id;

  RETURN QUERY SELECT p_workout_id, v_duration, v_exercise_count, v_total_sets, v_xp;
END;
$$ LANGUAGE plpgsql;

-- 8. VIEW: Workout Summary
-- ============================================
CREATE OR REPLACE VIEW workout_summary AS
SELECT
  ws.id,
  ws.user_id,
  ws.name,
  ws.workout_type,
  ws.started_at,
  ws.ended_at,
  ws.duration_minutes,
  ws.xp_earned,
  COUNT(DISTINCT we.id) as exercise_count,
  COUNT(DISTINCT es.id) as total_sets,
  SUM(es.reps * COALESCE(es.weight_kg, 1)) as total_volume_kg
FROM workout_sessions ws
LEFT JOIN workout_exercises we ON we.workout_id = ws.id
LEFT JOIN exercise_sets es ON es.workout_exercise_id = we.id
GROUP BY ws.id;

-- 9. VIEW: Personal Records (PRs)
-- ============================================
CREATE OR REPLACE VIEW personal_records AS
SELECT DISTINCT ON (ws.user_id, e.id)
  ws.user_id,
  e.id as exercise_id,
  e.name as exercise_name,
  e.muscle_group,
  es.weight_kg as max_weight,
  es.reps as reps_at_max,
  ws.started_at as achieved_at
FROM exercise_sets es
JOIN workout_exercises we ON we.id = es.workout_exercise_id
JOIN workout_sessions ws ON ws.id = we.workout_id
JOIN exercises e ON e.id = we.exercise_id
WHERE es.weight_kg IS NOT NULL
ORDER BY ws.user_id, e.id, es.weight_kg DESC, ws.started_at DESC;

-- ============================================
-- END MIGRATION
-- ============================================
