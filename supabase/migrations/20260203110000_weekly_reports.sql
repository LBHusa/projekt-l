-- ============================================
-- Weekly AI Reflection Reports
-- Phase 4: Visuelle Belohnungen
-- Stores AI-generated weekly insights for each user
-- ============================================

-- ============================================
-- WEEKLY REPORTS TABLE
-- ============================================

CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time range
  week_start DATE NOT NULL, -- Monday of the week
  week_end DATE NOT NULL,   -- Sunday of the week

  -- AI-generated structured content
  top_wins JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of 3 wins (strings)
  attention_area TEXT NOT NULL,                 -- Area needing attention
  recognized_pattern TEXT NOT NULL,            -- Behavior pattern
  recommendation TEXT NOT NULL,                -- Suggestion for next week

  -- Raw activity data snapshot (for debugging/future analysis)
  stats_snapshot JSONB,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,                         -- NULL until user views it

  -- Prevent duplicate reports for same week
  UNIQUE(user_id, week_start)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_weekly_reports_user ON weekly_reports(user_id);
CREATE INDEX idx_weekly_reports_week ON weekly_reports(week_start DESC);
CREATE INDEX idx_weekly_reports_unread ON weekly_reports(user_id, read_at)
  WHERE read_at IS NULL;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Users can only view their own reports
CREATE POLICY "Users can view own reports" ON weekly_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update read_at on their own reports
CREATE POLICY "Users can mark own reports as read" ON weekly_reports
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System can insert reports (via service role)
-- No INSERT policy for regular users - only system generates reports

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE weekly_reports IS 'AI-generated weekly reflection reports with personalized insights';
COMMENT ON COLUMN weekly_reports.top_wins IS 'Array of 3 specific achievements from the week';
COMMENT ON COLUMN weekly_reports.attention_area IS 'One life area that was neglected this week';
COMMENT ON COLUMN weekly_reports.recognized_pattern IS 'AI-detected behavioral pattern';
COMMENT ON COLUMN weekly_reports.recommendation IS 'Actionable suggestion for the coming week';
COMMENT ON COLUMN weekly_reports.stats_snapshot IS 'Raw activity data used for generation (quests, habits, XP, etc.)';
