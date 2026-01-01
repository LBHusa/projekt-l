-- ============================================
-- Projekt L - GEIST: Mood & Journal Tables
-- Migration: 20250201_001_geist_mood_journal.sql
-- ============================================
-- Ermoeglicht Mood-Tracking und Tagebuch-Eintraege
-- fuer den GEIST (Mental/Mind) Lebensbereich
-- ============================================

-- 1. MOOD LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Mood value: great, good, okay, bad, terrible
  mood TEXT NOT NULL CHECK (mood IN ('great', 'good', 'okay', 'bad', 'terrible')),

  -- Optional note
  note TEXT,

  -- XP reward for logging mood
  xp_gained INTEGER DEFAULT 2,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mood_logs_user ON mood_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_date ON mood_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON mood_logs(user_id, created_at DESC);

-- 2. JOURNAL ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Journal content
  content TEXT NOT NULL,

  -- Optional prompt that was used
  prompt TEXT,

  -- Word count for stats
  word_count INTEGER DEFAULT 0,

  -- XP reward (more words = more XP, capped)
  xp_gained INTEGER DEFAULT 5,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, created_at DESC);

-- 3. HELPER FUNCTION: Calculate Journal XP
-- ============================================
-- XP based on word count: min 5, max 25
CREATE OR REPLACE FUNCTION calculate_journal_xp(p_content TEXT)
RETURNS INTEGER AS $$
DECLARE
  word_count INTEGER;
  base_xp INTEGER := 5;
  xp_per_50_words INTEGER := 2;
  max_xp INTEGER := 25;
BEGIN
  -- Count words (simple split by spaces)
  word_count := array_length(regexp_split_to_array(trim(p_content), '\s+'), 1);

  -- Calculate XP: base + 2 XP per 50 words, capped at 25
  RETURN LEAST(max_xp, base_xp + (word_count / 50) * xp_per_50_words);
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER: Auto-calculate word count and XP on insert
-- ============================================
CREATE OR REPLACE FUNCTION journal_entry_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate word count
  NEW.word_count := array_length(regexp_split_to_array(trim(NEW.content), '\s+'), 1);

  -- Calculate XP if not set
  IF NEW.xp_gained IS NULL OR NEW.xp_gained = 5 THEN
    NEW.xp_gained := calculate_journal_xp(NEW.content);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_entry_calc_trigger ON journal_entries;
CREATE TRIGGER journal_entry_calc_trigger
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION journal_entry_before_insert();

-- 5. VIEW: Today's Mood (for quick check)
-- ============================================
CREATE OR REPLACE VIEW todays_mood AS
SELECT
  user_id,
  mood,
  note,
  created_at
FROM mood_logs
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- 6. VIEW: Weekly Mood Summary
-- ============================================
CREATE OR REPLACE VIEW weekly_mood_summary AS
SELECT
  user_id,
  created_at::date as date,
  mood,
  note,
  xp_gained
FROM mood_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 7. FUNCTION: Get mood stats for user
-- ============================================
CREATE OR REPLACE FUNCTION get_mood_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_logs INTEGER,
  great_count INTEGER,
  good_count INTEGER,
  okay_count INTEGER,
  bad_count INTEGER,
  terrible_count INTEGER,
  avg_mood_score NUMERIC,
  streak_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH mood_data AS (
    SELECT
      mood,
      created_at::date as log_date
    FROM mood_logs
    WHERE user_id = p_user_id
      AND created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ),
  mood_counts AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE mood = 'great') as great,
      COUNT(*) FILTER (WHERE mood = 'good') as good,
      COUNT(*) FILTER (WHERE mood = 'okay') as okay,
      COUNT(*) FILTER (WHERE mood = 'bad') as bad,
      COUNT(*) FILTER (WHERE mood = 'terrible') as terrible
    FROM mood_data
  ),
  mood_score AS (
    SELECT AVG(
      CASE mood
        WHEN 'great' THEN 5
        WHEN 'good' THEN 4
        WHEN 'okay' THEN 3
        WHEN 'bad' THEN 2
        WHEN 'terrible' THEN 1
      END
    ) as avg_score
    FROM mood_data
  ),
  streak AS (
    SELECT COUNT(DISTINCT log_date)::INTEGER as days
    FROM mood_data
    WHERE log_date >= CURRENT_DATE - INTERVAL '7 days'
  )
  SELECT
    mc.total::INTEGER,
    mc.great::INTEGER,
    mc.good::INTEGER,
    mc.okay::INTEGER,
    mc.bad::INTEGER,
    mc.terrible::INTEGER,
    ROUND(ms.avg_score, 2),
    s.days
  FROM mood_counts mc, mood_score ms, streak s;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- END MIGRATION
-- ============================================
