-- ============================================
-- NEGATIVE HABIT ACHIEVEMENTS SYSTEM
-- Part 1: Database Schema Updates
-- ============================================

-- 1. Add streak_start_date to habits table for automatic "days clean" calculation
ALTER TABLE habits ADD COLUMN IF NOT EXISTS streak_start_date DATE;

-- Initialize streak_start_date for existing negative habits (use created_at as default)
UPDATE habits
SET streak_start_date = created_at::date
WHERE habit_type = 'negative' AND streak_start_date IS NULL;

-- 2. Add resistance_count for tracking daily confirmations (separate from total_completions which tracks relapses)
ALTER TABLE habits ADD COLUMN IF NOT EXISTS resistance_count INTEGER DEFAULT 0;

-- 3. Add last_resistance_at for preventing duplicate daily confirmations
ALTER TABLE habits ADD COLUMN IF NOT EXISTS last_resistance_at DATE;

-- 4. Expand requirement_type enum to include negative habit types
-- First drop existing constraint
ALTER TABLE achievements
DROP CONSTRAINT IF EXISTS achievements_requirement_type_check;

-- Add new constraint with expanded types
ALTER TABLE achievements
ADD CONSTRAINT achievements_requirement_type_check
CHECK (requirement_type IN (
  'habit_streak',           -- Positive habit streak days
  'habit_count',            -- Total habits completed
  'book_count',             -- Books read
  'course_count',           -- Courses completed
  'savings_goal',           -- Savings goal achieved
  'faction_xp',             -- XP in a faction
  'total_xp',               -- Total XP across all factions
  'level',                  -- User level reached
  'custom',                 -- Custom logic
  'negative_habit_streak',  -- NEW: Days clean from negative habit
  'negative_habit_avoided'  -- NEW: Number of successful resistance logs
));

-- 5. Seed new achievements for negative habits
INSERT INTO achievements (achievement_key, name, description, icon, requirement_type, requirement_value, xp_reward, faction_id, category, rarity, sort_order) VALUES
  -- Days Clean Streaks
  ('clean_7', 'Eine Woche stark', '7 Tage ohne Rückfall', '🛡️', 'negative_habit_streak', 7, 75, 'geist', 'habit', 'rare', 60),
  ('clean_14', 'Zwei Wochen Disziplin', '14 Tage ohne Rückfall', '💪', 'negative_habit_streak', 14, 150, 'geist', 'habit', 'rare', 61),
  ('clean_30', 'Monat der Stärke', '30 Tage ohne Rückfall', '🏆', 'negative_habit_streak', 30, 300, 'geist', 'habit', 'epic', 62),
  ('clean_90', 'Vierteljahr-Champion', '90 Tage ohne Rückfall', '👑', 'negative_habit_streak', 90, 750, 'geist', 'habit', 'legendary', 63),
  ('clean_180', 'Halbjahres-Held', '180 Tage ohne Rückfall', '🌟', 'negative_habit_streak', 180, 1500, 'geist', 'habit', 'legendary', 64),
  ('clean_365', 'Jahreschampion', '365 Tage ohne Rückfall', '🎖️', 'negative_habit_streak', 365, 3000, 'geist', 'habit', 'legendary', 65),

  -- Resistance Achievements (active confirmations)
  ('resisted_10', 'Widerstandskämpfer', '10 mal erfolgreich widerstanden', '⚔️', 'negative_habit_avoided', 10, 100, 'geist', 'habit', 'rare', 70),
  ('resisted_25', 'Standhaft', '25 mal erfolgreich widerstanden', '🗡️', 'negative_habit_avoided', 25, 200, 'geist', 'habit', 'rare', 71),
  ('resisted_50', 'Eiserner Wille', '50 mal erfolgreich widerstanden', '🔱', 'negative_habit_avoided', 50, 400, 'geist', 'habit', 'epic', 72),
  ('resisted_100', 'Unerschütterlich', '100 mal erfolgreich widerstanden', '⚡', 'negative_habit_avoided', 100, 800, 'geist', 'habit', 'epic', 73),
  ('resisted_250', 'Legendäre Willenskraft', '250 mal erfolgreich widerstanden', '💎', 'negative_habit_avoided', 250, 2000, 'geist', 'habit', 'legendary', 74)
ON CONFLICT (achievement_key) DO NOTHING;

-- 6. Create habit_achievements table for personalized, habit-specific achievements
CREATE TABLE IF NOT EXISTS habit_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Achievement template
  achievement_template TEXT NOT NULL,  -- 'streak_7', 'streak_30', etc.

  -- Display
  name TEXT NOT NULL,                  -- "7 Tage ohne Rauchen"
  description TEXT,
  icon TEXT DEFAULT '🏆',

  -- Progress
  target_value INTEGER NOT NULL,       -- 7, 30, etc.
  current_progress INTEGER DEFAULT 0,
  is_unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,

  -- Rewards
  xp_reward INTEGER DEFAULT 50,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(habit_id, achievement_template)
);

-- Indexes for habit_achievements
CREATE INDEX IF NOT EXISTS idx_habit_achievements_habit ON habit_achievements(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_achievements_user ON habit_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_achievements_unlocked ON habit_achievements(user_id, is_unlocked);

-- Auto-update trigger for habit_achievements
CREATE OR REPLACE TRIGGER update_habit_achievements_updated_at
  BEFORE UPDATE ON habit_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. RLS Policies for habit_achievements
ALTER TABLE habit_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own habit achievements"
  ON habit_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit achievements"
  ON habit_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habit achievements"
  ON habit_achievements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit achievements"
  ON habit_achievements FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Function to calculate negative habit streak (days since streak_start_date)
CREATE OR REPLACE FUNCTION calculate_negative_habit_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak_start DATE;
  v_days_clean INTEGER;
BEGIN
  SELECT streak_start_date INTO v_streak_start
  FROM habits
  WHERE id = p_habit_id AND habit_type = 'negative';

  IF v_streak_start IS NULL THEN
    RETURN 0;
  END IF;

  v_days_clean := CURRENT_DATE - v_streak_start;
  RETURN GREATEST(0, v_days_clean);
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Function to generate habit-specific achievements when a negative habit is created
CREATE OR REPLACE FUNCTION generate_habit_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_templates JSONB := '[
    {"key": "streak_7", "days": 7, "xp": 50, "name_suffix": "7 Tage ohne"},
    {"key": "streak_14", "days": 14, "xp": 100, "name_suffix": "14 Tage ohne"},
    {"key": "streak_30", "days": 30, "xp": 200, "name_suffix": "Monat ohne"},
    {"key": "streak_60", "days": 60, "xp": 350, "name_suffix": "2 Monate ohne"},
    {"key": "streak_90", "days": 90, "xp": 500, "name_suffix": "Quartal ohne"},
    {"key": "streak_180", "days": 180, "xp": 1000, "name_suffix": "Halbjahr ohne"},
    {"key": "streak_365", "days": 365, "xp": 2500, "name_suffix": "Jahr ohne"}
  ]';
  v_template JSONB;
BEGIN
  -- Only generate for negative habits
  IF NEW.habit_type != 'negative' THEN
    RETURN NEW;
  END IF;

  -- Generate achievements for each template
  FOR v_template IN SELECT * FROM jsonb_array_elements(v_templates)
  LOOP
    INSERT INTO habit_achievements (
      habit_id,
      user_id,
      achievement_template,
      name,
      description,
      icon,
      target_value,
      xp_reward
    ) VALUES (
      NEW.id,
      NEW.user_id,
      v_template->>'key',
      (v_template->>'name_suffix') || ' ' || NEW.name,
      'Bleibe ' || (v_template->>'days') || ' Tage ohne ' || NEW.name,
      '🛡️',
      (v_template->>'days')::INTEGER,
      (v_template->>'xp')::INTEGER
    )
    ON CONFLICT (habit_id, achievement_template) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate achievements for new negative habits
DROP TRIGGER IF EXISTS trigger_generate_habit_achievements ON habits;
CREATE TRIGGER trigger_generate_habit_achievements
  AFTER INSERT ON habits
  FOR EACH ROW
  EXECUTE FUNCTION generate_habit_achievements();

-- 10. Generate achievements for existing negative habits
INSERT INTO habit_achievements (habit_id, user_id, achievement_template, name, description, icon, target_value, xp_reward)
SELECT
  h.id,
  h.user_id,
  t.key,
  t.name_suffix || ' ' || h.name,
  'Bleibe ' || t.days || ' Tage ohne ' || h.name,
  '🛡️',
  t.days,
  t.xp
FROM habits h
CROSS JOIN (
  VALUES
    ('streak_7', 7, 50, '7 Tage ohne'),
    ('streak_14', 14, 100, '14 Tage ohne'),
    ('streak_30', 30, 200, 'Monat ohne'),
    ('streak_60', 60, 350, '2 Monate ohne'),
    ('streak_90', 90, 500, 'Quartal ohne'),
    ('streak_180', 180, 1000, 'Halbjahr ohne'),
    ('streak_365', 365, 2500, 'Jahr ohne')
) AS t(key, days, xp, name_suffix)
WHERE h.habit_type = 'negative'
ON CONFLICT (habit_id, achievement_template) DO NOTHING;

COMMENT ON TABLE habit_achievements IS 'Personalized achievements for each habit, auto-generated for negative habits';
COMMENT ON COLUMN habits.streak_start_date IS 'For negative habits: date when current clean streak started';
COMMENT ON COLUMN habits.resistance_count IS 'For negative habits: number of times user confirmed resistance';
COMMENT ON COLUMN habits.last_resistance_at IS 'For negative habits: last date user confirmed resistance (prevents duplicates)';
