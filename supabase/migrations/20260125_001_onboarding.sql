-- ============================================
-- Projekt L - Onboarding System
-- Migration: 20260125_001_onboarding.sql
-- ============================================

-- 1. Add onboarding tracking to user_profiles
-- ============================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS character_class VARCHAR(50);

COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether user has completed onboarding wizard';
COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN user_profiles.character_class IS 'AI-suggested character class based on onboarding answers';

-- 2. Create onboarding_responses table for storing raw responses
-- ============================================
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_user_id ON onboarding_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_step ON onboarding_responses(user_id, step_name);

-- Enable RLS
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own onboarding responses"
  ON onboarding_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding responses"
  ON onboarding_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding responses"
  ON onboarding_responses FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Add faction importance tracking for XP multipliers
-- ============================================
ALTER TABLE user_faction_stats
ADD COLUMN IF NOT EXISTS importance INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS xp_multiplier DECIMAL(3,2) DEFAULT 1.00;

COMMENT ON COLUMN user_faction_stats.importance IS 'User-rated importance 1-5 stars from onboarding';
COMMENT ON COLUMN user_faction_stats.xp_multiplier IS 'XP multiplier based on importance (importance/3)';

-- ============================================
-- End Migration
-- ============================================
