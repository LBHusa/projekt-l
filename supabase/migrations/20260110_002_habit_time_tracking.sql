-- ============================================
-- Projekt L - Habit Time Tracking Extension
-- Migration: 20260110_002_habit_time_tracking.sql
-- ============================================
-- Erweitert Habits um Zeit-Tracking für Alltags-Aktivitäten
-- z.B. "Social Media: 45min", "Produktiv: 5h"
-- ============================================

-- 1. EXTEND habit_logs TABLE
-- ============================================
-- Add duration_minutes for time-tracking negative habits
ALTER TABLE habit_logs
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT NULL;

-- Add trigger analysis for negative habits
ALTER TABLE habit_logs
ADD COLUMN IF NOT EXISTS trigger TEXT DEFAULT NULL;

-- Add context/location for better analysis
ALTER TABLE habit_logs
ADD COLUMN IF NOT EXISTS context TEXT DEFAULT NULL;

COMMENT ON COLUMN habit_logs.duration_minutes IS 'Duration in minutes for time-tracked habits (e.g., social media usage)';
COMMENT ON COLUMN habit_logs.trigger IS 'What triggered this habit? (e.g., "bored", "stressed", "after work")';
COMMENT ON COLUMN habit_logs.context IS 'Where/when did this happen? (e.g., "home, evening", "office, lunch break")';

-- 2. CREATE ACTIVITY CATEGORIES TABLE
-- ============================================
-- Categories for time-tracking (productive, meetings, leisure, etc.)
CREATE TABLE IF NOT EXISTS activity_categories (
  id TEXT PRIMARY KEY,
  name_de TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_productive BOOLEAN DEFAULT FALSE, -- Counts towards productive time
  is_negative BOOLEAN DEFAULT FALSE, -- Counts as time to avoid
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO activity_categories (id, name_de, name_en, icon, color, is_productive, is_negative, sort_order) VALUES
  ('productive', 'Produktiv', 'Productive', '💼', '#10b981', TRUE, FALSE, 1),
  ('deep_work', 'Deep Work', 'Deep Work', '🎯', '#8b5cf6', TRUE, FALSE, 2),
  ('meetings', 'Meetings', 'Meetings', '👥', '#3b82f6', FALSE, FALSE, 3),
  ('learning', 'Lernen', 'Learning', '📚', '#06b6d4', TRUE, FALSE, 4),
  ('leisure', 'Freizeit', 'Leisure', '🎮', '#64748b', FALSE, FALSE, 5),
  ('exercise', 'Sport', 'Exercise', '💪', '#f59e0b', TRUE, FALSE, 6),
  ('social_media', 'Social Media', 'Social Media', '📱', '#ef4444', FALSE, TRUE, 7),
  ('procrastination', 'Prokrastination', 'Procrastination', '⏰', '#dc2626', FALSE, TRUE, 8),
  ('entertainment', 'Unterhaltung', 'Entertainment', '🎬', '#6366f1', FALSE, FALSE, 9),
  ('household', 'Haushalt', 'Household', '🏠', '#84cc16', FALSE, FALSE, 10)
ON CONFLICT (id) DO NOTHING;

-- 3. EXTEND habits TABLE
-- ============================================
-- Link habit to activity category for better tracking
ALTER TABLE habits
ADD COLUMN IF NOT EXISTS activity_category_id TEXT REFERENCES activity_categories(id) ON DELETE SET NULL;

-- Add mental stats impact for negative habits
ALTER TABLE habits
ADD COLUMN IF NOT EXISTS affects_mental_stats BOOLEAN DEFAULT FALSE;

ALTER TABLE habits
ADD COLUMN IF NOT EXISTS mental_stress_impact INTEGER DEFAULT 0; -- +1 to +10 increases stress

ALTER TABLE habits
ADD COLUMN IF NOT EXISTS mental_focus_impact INTEGER DEFAULT 0; -- -1 to -10 decreases focus

COMMENT ON COLUMN habits.activity_category_id IS 'Category for time-tracking analysis (productive, social_media, etc.)';
COMMENT ON COLUMN habits.affects_mental_stats IS 'If true, this habit affects mental stats';
COMMENT ON COLUMN habits.mental_stress_impact IS 'Positive value increases stress (1-10)';
COMMENT ON COLUMN habits.mental_focus_impact IS 'Negative value decreases focus (-1 to -10)';

-- 4. CREATE VIEW: Daily Time Stats
-- ============================================
CREATE OR REPLACE VIEW daily_time_stats AS
SELECT
  hl.user_id,
  DATE(hl.logged_at) as log_date,
  ac.id as category_id,
  ac.name_de as category_name,
  ac.icon as category_icon,
  ac.color as category_color,
  ac.is_productive,
  ac.is_negative,
  COUNT(DISTINCT hl.habit_id) as habit_count,
  SUM(hl.duration_minutes) as total_minutes,
  ROUND(SUM(hl.duration_minutes)::numeric / 60, 1) as total_hours
FROM habit_logs hl
JOIN habits h ON h.id = hl.habit_id
LEFT JOIN activity_categories ac ON ac.id = h.activity_category_id
WHERE hl.duration_minutes IS NOT NULL
  AND hl.duration_minutes > 0
GROUP BY hl.user_id, DATE(hl.logged_at), ac.id, ac.name_de, ac.icon, ac.color, ac.is_productive, ac.is_negative;

COMMENT ON VIEW daily_time_stats IS 'Daily summary of time spent per activity category';

-- 5. CREATE VIEW: Weekly Time Stats
-- ============================================
CREATE OR REPLACE VIEW weekly_time_stats AS
SELECT
  hl.user_id,
  DATE_TRUNC('week', hl.logged_at) as week_start,
  ac.id as category_id,
  ac.name_de as category_name,
  ac.icon as category_icon,
  ac.color as category_color,
  ac.is_productive,
  ac.is_negative,
  COUNT(DISTINCT DATE(hl.logged_at)) as active_days,
  COUNT(DISTINCT hl.habit_id) as habit_count,
  SUM(hl.duration_minutes) as total_minutes,
  ROUND(SUM(hl.duration_minutes)::numeric / 60, 1) as total_hours,
  ROUND((SUM(hl.duration_minutes)::numeric / 60) / 7, 1) as avg_hours_per_day
FROM habit_logs hl
JOIN habits h ON h.id = hl.habit_id
LEFT JOIN activity_categories ac ON ac.id = h.activity_category_id
WHERE hl.duration_minutes IS NOT NULL
  AND hl.duration_minutes > 0
GROUP BY hl.user_id, DATE_TRUNC('week', hl.logged_at), ac.id, ac.name_de, ac.icon, ac.color, ac.is_productive, ac.is_negative;

COMMENT ON VIEW weekly_time_stats IS 'Weekly summary of time spent per activity category';

-- 6. FUNCTION: Get Today's Time Summary
-- ============================================
CREATE OR REPLACE FUNCTION get_today_time_summary(p_user_id UUID)
RETURNS TABLE(
  category_id TEXT,
  category_name TEXT,
  category_icon TEXT,
  category_color TEXT,
  is_productive BOOLEAN,
  is_negative BOOLEAN,
  total_minutes INTEGER,
  total_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dts.category_id,
    dts.category_name,
    dts.category_icon,
    dts.category_color,
    dts.is_productive,
    dts.is_negative,
    dts.total_minutes::INTEGER,
    dts.total_hours
  FROM daily_time_stats dts
  WHERE dts.user_id = p_user_id
    AND dts.log_date = CURRENT_DATE
  ORDER BY dts.total_minutes DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCTION: Apply Mental Stats Impact
-- ============================================
-- Apply mental stats impact when logging negative habits
CREATE OR REPLACE FUNCTION apply_habit_mental_impact()
RETURNS TRIGGER AS $$
DECLARE
  habit_record RECORD;
BEGIN
  -- Get habit details
  SELECT * INTO habit_record
  FROM habits
  WHERE id = NEW.habit_id;

  -- Only apply for completed negative habits that affect mental stats
  IF habit_record.affects_mental_stats AND NEW.completed THEN
    -- Update user mental stats
    IF habit_record.mental_stress_impact > 0 THEN
      UPDATE user_mental_stats
      SET
        stress = LEAST(100, stress + habit_record.mental_stress_impact),
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;

    IF habit_record.mental_focus_impact < 0 THEN
      UPDATE user_mental_stats
      SET
        focus = GREATEST(0, focus + habit_record.mental_focus_impact),
        updated_at = NOW()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to apply mental stats impact
DROP TRIGGER IF EXISTS trigger_habit_mental_impact ON habit_logs;
CREATE TRIGGER trigger_habit_mental_impact
  AFTER INSERT ON habit_logs
  FOR EACH ROW
  EXECUTE FUNCTION apply_habit_mental_impact();

-- 8. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_habit_logs_duration ON habit_logs(duration_minutes) WHERE duration_minutes IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(DATE(logged_at));
CREATE INDEX IF NOT EXISTS idx_habits_activity_category ON habits(activity_category_id);
CREATE INDEX IF NOT EXISTS idx_habits_mental_stats ON habits(affects_mental_stats) WHERE affects_mental_stats = TRUE;

-- ============================================
-- END MIGRATION
-- ============================================
