-- ============================================
-- Projekt L - Mental Stats History Chart
-- Migration: 20250208_001_mental_stats_chart.sql
-- ============================================
-- Erweitert GEIST um Multi-Metric Tracking:
-- - Stimmung (Mood) 1-5
-- - Energie (Energy) 1-5
-- - Stress 1-5 (inverted: 1=high stress, 5=very calm)
-- - Fokus (Focus) 1-5
-- ============================================

-- 1. MENTAL STATS LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mental_stats_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- All metrics on 1-5 scale
  mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
  energy INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 5),
  stress INTEGER NOT NULL CHECK (stress >= 1 AND stress <= 5),
  focus INTEGER NOT NULL CHECK (focus >= 1 AND focus <= 5),

  -- Optional note
  note TEXT,

  -- XP reward for tracking mental stats
  xp_gained INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mental_stats_logs_user ON mental_stats_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mental_stats_logs_date ON mental_stats_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mental_stats_logs_user_date ON mental_stats_logs(user_id, created_at DESC);

-- 2. SAMPLE TEST DATA
-- ============================================
-- Insert test data for last 90 days to visualize chart immediately
INSERT INTO mental_stats_logs (user_id, mood, energy, stress, focus, created_at) VALUES
  -- Recent data (last 7 days)
  ('00000000-0000-0000-0000-000000000001', 4, 3, 2, 4, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000001', 5, 4, 2, 5, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000001', 3, 2, 4, 3, NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000001', 4, 4, 2, 4, NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000001', 5, 5, 1, 5, NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0000-000000000001', 4, 3, 3, 4, NOW() - INTERVAL '6 days'),
  ('00000000-0000-0000-0000-000000000001', 3, 3, 3, 3, NOW() - INTERVAL '7 days'),

  -- Last 30 days
  ('00000000-0000-0000-0000-000000000001', 4, 4, 2, 4, NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0000-000000000001', 3, 3, 3, 3, NOW() - INTERVAL '14 days'),
  ('00000000-0000-0000-0000-000000000001', 5, 4, 2, 5, NOW() - INTERVAL '18 days'),
  ('00000000-0000-0000-0000-000000000001', 4, 3, 3, 4, NOW() - INTERVAL '21 days'),
  ('00000000-0000-0000-0000-000000000001', 3, 2, 4, 3, NOW() - INTERVAL '25 days'),
  ('00000000-0000-0000-0000-000000000001', 4, 4, 2, 4, NOW() - INTERVAL '28 days'),

  -- Last 90 days
  ('00000000-0000-0000-0000-000000000001', 5, 5, 1, 5, NOW() - INTERVAL '35 days'),
  ('00000000-0000-0000-0000-000000000001', 4, 3, 3, 4, NOW() - INTERVAL '42 days'),
  ('00000000-0000-0000-0000-000000000001', 3, 3, 3, 3, NOW() - INTERVAL '49 days'),
  ('00000000-0000-0000-0000-000000000001', 4, 4, 2, 4, NOW() - INTERVAL '56 days'),
  ('00000000-0000-0000-0000-000000000001', 5, 4, 2, 5, NOW() - INTERVAL '63 days'),
  ('00000000-0000-0000-0000-000000000001', 3, 2, 4, 3, NOW() - INTERVAL '70 days'),
  ('00000000-0000-0000-0000-000000000001', 4, 3, 3, 4, NOW() - INTERVAL '77 days'),
  ('00000000-0000-0000-0000-000000000001', 4, 4, 2, 4, NOW() - INTERVAL '84 days');

-- ============================================
-- END MIGRATION
-- ============================================
