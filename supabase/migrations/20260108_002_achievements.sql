-- ============================================
-- ACHIEVEMENTS SYSTEM
-- ============================================

-- Main achievements definition table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  achievement_key TEXT NOT NULL UNIQUE,  -- e.g., 'first_habit', 'week_warrior'

  -- Display
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',

  -- Requirements
  requirement_type TEXT NOT NULL CHECK (requirement_type IN (
    'habit_streak',      -- Habit streak days
    'habit_count',       -- Total habits completed
    'book_count',        -- Books read
    'course_count',      -- Courses completed
    'savings_goal',      -- Savings goal achieved
    'faction_xp',        -- XP in a faction
    'total_xp',          -- Total XP across all factions
    'level',             -- User level reached
    'custom'             -- Custom logic
  )),
  requirement_value INTEGER NOT NULL,  -- Threshold to unlock (e.g., 7 for 7-day streak)

  -- Rewards
  xp_reward INTEGER NOT NULL DEFAULT 0,
  faction_id TEXT REFERENCES factions(id) ON DELETE SET NULL,  -- Which faction gets XP (null = no faction)

  -- Metadata
  category TEXT NOT NULL CHECK (category IN ('habit', 'learning', 'finance', 'social', 'general')),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  sort_order INTEGER NOT NULL DEFAULT 0,  -- Display order
  is_active BOOLEAN NOT NULL DEFAULT true,  -- Can be disabled

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_achievements_key ON achievements(achievement_key);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(requirement_type);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievements(is_active) WHERE is_active = true;

-- Auto-update trigger
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USER ACHIEVEMENTS TRACKING
-- ============================================

-- User achievement unlock tracking
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,

  -- Progress tracking
  current_progress INTEGER DEFAULT 0,  -- Current progress toward goal
  is_unlocked BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, is_unlocked);

-- Auto-update trigger
CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED ACHIEVEMENTS
-- ============================================

INSERT INTO achievements (achievement_key, name, description, icon, requirement_type, requirement_value, xp_reward, faction_id, category, rarity, sort_order) VALUES
  -- Habit Achievements
  ('first_habit', 'Erste Schritte', 'Schließe deinen ersten Habit ab', '✨', 'habit_count', 1, 10, 'geist', 'habit', 'common', 1),
  ('habit_5', 'Gewohnheitstier', 'Schließe 5 Habits ab', '🎯', 'habit_count', 5, 25, 'geist', 'habit', 'common', 2),
  ('week_warrior', 'Wochenkrieger', 'Erreiche einen 7-Tage Streak', '🔥', 'habit_streak', 7, 50, 'geist', 'habit', 'rare', 3),
  ('month_master', 'Monatsmeister', 'Erreiche einen 30-Tage Streak', '💎', 'habit_streak', 30, 200, 'geist', 'habit', 'epic', 4),
  ('habit_centurion', 'Centurion', 'Schließe 100 Habits ab', '👑', 'habit_count', 100, 500, 'geist', 'habit', 'legendary', 5),

  -- Learning Achievements
  ('bookworm', 'Bücherwurm', 'Lies 5 Bücher', '📚', 'book_count', 5, 100, 'weisheit', 'learning', 'rare', 10),
  ('avid_reader', 'Vielleser', 'Lies 20 Bücher', '📖', 'book_count', 20, 300, 'weisheit', 'learning', 'epic', 11),
  ('scholar', 'Gelehrter', 'Schließe 3 Kurse ab', '🎓', 'course_count', 3, 150, 'weisheit', 'learning', 'rare', 12),
  ('master_learner', 'Meisterlerner', 'Schließe 10 Kurse ab', '🧠', 'course_count', 10, 500, 'weisheit', 'learning', 'epic', 13),

  -- Finance Achievements
  ('saver', 'Sparer', 'Erreiche dein erstes Sparziel', '💰', 'savings_goal', 1, 75, 'finanzen', 'finance', 'rare', 20),
  ('wealth_builder', 'Vermögensaufbauer', 'Erreiche 5 Sparziele', '💎', 'savings_goal', 5, 300, 'finanzen', 'finance', 'epic', 21),

  -- XP & Level Achievements
  ('centurion_xp', 'Centurion XP', 'Erreiche 100 XP in einer Fraktion', '⚡', 'faction_xp', 100, 50, NULL, 'general', 'rare', 30),
  ('xp_master', 'XP Meister', 'Erreiche 1000 Gesamt-XP', '✨', 'total_xp', 1000, 200, NULL, 'general', 'epic', 31),
  ('level_10', 'Level 10', 'Erreiche Level 10', '🌟', 'level', 10, 100, NULL, 'general', 'rare', 32),
  ('level_25', 'Level 25', 'Erreiche Level 25', '⭐', 'level', 25, 250, NULL, 'general', 'epic', 33)
ON CONFLICT (achievement_key) DO NOTHING;
