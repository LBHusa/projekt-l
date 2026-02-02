-- Streak Insurance Tokens
-- Allows users to protect streaks from breaking
-- Phase 1: Fairness & Proaktivitaet

CREATE TABLE IF NOT EXISTS streak_insurance_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token info
  token_type TEXT NOT NULL DEFAULT 'standard' CHECK (token_type IN ('standard', 'premium')),
  reason TEXT NOT NULL CHECK (reason IN ('login_bonus', 'achievement', 'purchase', 'trial_bonus')),

  -- Usage tracking
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_for_habit_id UUID REFERENCES habits(id) ON DELETE SET NULL,

  -- Validity
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup of available tokens
CREATE INDEX idx_streak_tokens_user ON streak_insurance_tokens(user_id);
-- Note: Partial index with NOW() cannot be created (not immutable)
-- Query should filter by is_used = FALSE AND expires_at > NOW() directly
CREATE INDEX idx_streak_tokens_available ON streak_insurance_tokens(user_id, is_used, expires_at);

-- RLS policies
ALTER TABLE streak_insurance_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON streak_insurance_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON streak_insurance_tokens
  FOR UPDATE USING (auth.uid() = user_id);

-- System can insert tokens (via service role)
CREATE POLICY "Service can insert tokens" ON streak_insurance_tokens
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE streak_insurance_tokens IS 'Tokens that protect habit streaks from breaking';
