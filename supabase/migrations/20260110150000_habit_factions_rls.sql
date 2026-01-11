-- ============================================
-- Projekt L - RLS Policies für habit_factions
-- Migration: 20260110_006_habit_factions_rls.sql
-- ============================================
-- FIX: Multi-Faction Habits werden nicht gespeichert
-- Ursache: habit_factions Tabelle hatte keine RLS Policies
-- ============================================

-- 1. Enable RLS
-- ============================================
ALTER TABLE habit_factions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (falls vorhanden)
-- ============================================
DROP POLICY IF EXISTS "Users can view their habit factions" ON habit_factions;
DROP POLICY IF EXISTS "Users can insert their habit factions" ON habit_factions;
DROP POLICY IF EXISTS "Users can update their habit factions" ON habit_factions;
DROP POLICY IF EXISTS "Users can delete their habit factions" ON habit_factions;

-- 3. Create RLS Policies
-- ============================================

-- SELECT: Users can view habit_factions for their own habits
CREATE POLICY "Users can view their habit factions"
  ON habit_factions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = habit_factions.habit_id
      AND habits.user_id = auth.uid()
    )
  );

-- INSERT: Users can create habit_factions for their own habits
CREATE POLICY "Users can insert their habit factions"
  ON habit_factions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = habit_factions.habit_id
      AND habits.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update habit_factions for their own habits
CREATE POLICY "Users can update their habit factions"
  ON habit_factions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = habit_factions.habit_id
      AND habits.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete habit_factions for their own habits
CREATE POLICY "Users can delete their habit factions"
  ON habit_factions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.id = habit_factions.habit_id
      AND habits.user_id = auth.uid()
    )
  );

-- ============================================
-- END MIGRATION
-- ============================================
