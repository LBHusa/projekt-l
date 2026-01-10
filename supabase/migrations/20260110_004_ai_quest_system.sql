-- ============================================
-- Projekt L - AI Quest System
-- Migration: 20260110_004_ai_quest_system.sql
-- ============================================

-- 1. QUEST TYPES ENUM
-- ============================================
CREATE TYPE quest_type AS ENUM ('daily', 'weekly', 'story');
CREATE TYPE quest_status AS ENUM ('active', 'completed', 'failed', 'archived');
CREATE TYPE quest_difficulty AS ENUM ('easy', 'medium', 'hard', 'epic');

-- 2. QUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Quest Metadata
  type quest_type NOT NULL DEFAULT 'daily',
  status quest_status NOT NULL DEFAULT 'active',
  difficulty quest_difficulty NOT NULL DEFAULT 'medium',

  -- Quest Content (AI Generated)
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  motivation TEXT, -- AI-generierte Motivation/Story

  -- Targets & Rewards
  target_skill_ids UUID[] DEFAULT '{}', -- Skills die trainiert werden
  target_faction_ids TEXT[] DEFAULT '{}', -- Factions die davon profitieren
  xp_reward INTEGER NOT NULL DEFAULT 100,

  -- Progress Tracking
  progress INTEGER DEFAULT 0, -- 0-100%
  required_actions INTEGER DEFAULT 1, -- z.B. "3x Sport diese Woche"
  completed_actions INTEGER DEFAULT 0,

  -- Timing
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Für Daily/Weekly Quests
  completed_at TIMESTAMPTZ,

  -- Story Quest Specific (mehrstufig)
  parent_quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  chapter_number INTEGER DEFAULT 1,
  is_story_complete BOOLEAN DEFAULT FALSE,

  -- AI Generation Context
  generation_context JSONB, -- Skills/Factions/Balance zum Zeitpunkt der Generierung
  ai_model TEXT DEFAULT 'claude-3-5-sonnet-20241022',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quests_user ON quests(user_id);
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_type ON quests(type);
CREATE INDEX IF NOT EXISTS idx_quests_expires ON quests(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_quests_parent ON quests(parent_quest_id) WHERE parent_quest_id IS NOT NULL;

-- 3. QUEST ACTIONS TABLE (für Tracking einzelner Quest-Schritte)
-- ============================================
CREATE TABLE IF NOT EXISTS quest_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Action Details
  description TEXT NOT NULL,
  xp_gained INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Linked Records
  experience_id UUID REFERENCES experiences(id) ON DELETE SET NULL,
  habit_log_id UUID REFERENCES habit_logs(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quest_actions_quest ON quest_actions(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_actions_user ON quest_actions(user_id);

-- 4. USER QUEST PREFERENCES (AI lernt User-Präferenzen)
-- ============================================
CREATE TABLE IF NOT EXISTS user_quest_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,

  -- Preferences
  preferred_difficulty quest_difficulty DEFAULT 'medium',
  daily_quest_count INTEGER DEFAULT 3 CHECK (daily_quest_count >= 0 AND daily_quest_count <= 10),
  weekly_quest_count INTEGER DEFAULT 2 CHECK (weekly_quest_count >= 0 AND weekly_quest_count <= 5),
  enable_story_quests BOOLEAN DEFAULT TRUE,

  -- Focus Areas (welche Factions/Skills soll AI priorisieren)
  focus_faction_ids TEXT[] DEFAULT '{}',
  focus_skill_ids UUID[] DEFAULT '{}',

  -- AI Behavior
  prefer_balanced_quests BOOLEAN DEFAULT TRUE, -- Balance zwischen allen Factions
  challenge_level INTEGER DEFAULT 5 CHECK (challenge_level >= 1 AND challenge_level <= 10),

  -- Learning Data
  completed_quests_count INTEGER DEFAULT 0,
  failed_quests_count INTEGER DEFAULT 0,
  average_completion_rate FLOAT DEFAULT 0.0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. HELPER FUNCTIONS
-- ============================================

-- Updated_at Triggers
CREATE OR REPLACE FUNCTION update_quests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quests_updated
  BEFORE UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION update_quests_timestamp();

CREATE TRIGGER user_quest_preferences_updated
  BEFORE UPDATE ON user_quest_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_quests_timestamp();

-- Complete Quest Function
CREATE OR REPLACE FUNCTION complete_quest(
  p_quest_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
DECLARE
  v_quest RECORD;
  v_skill_id UUID;
  v_faction_id TEXT;
BEGIN
  -- Get quest details
  SELECT * INTO v_quest FROM quests
  WHERE id = p_quest_id AND user_id = p_user_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest not found or already completed';
  END IF;

  -- Mark quest as completed
  UPDATE quests
  SET
    status = 'completed',
    completed_at = NOW(),
    progress = 100
  WHERE id = p_quest_id;

  -- Award XP to target skills
  IF v_quest.target_skill_ids IS NOT NULL THEN
    FOREACH v_skill_id IN ARRAY v_quest.target_skill_ids
    LOOP
      -- Create experience entry
      INSERT INTO experiences (user_id, skill_id, description, xp_gained, date)
      VALUES (p_user_id, v_skill_id, 'Quest completed: ' || v_quest.title, v_quest.xp_reward / array_length(v_quest.target_skill_ids, 1), CURRENT_DATE);
    END LOOP;
  END IF;

  -- Award XP to target factions
  IF v_quest.target_faction_ids IS NOT NULL THEN
    FOREACH v_faction_id IN ARRAY v_quest.target_faction_ids
    LOOP
      PERFORM update_faction_stats(p_user_id, v_faction_id, v_quest.xp_reward / array_length(v_quest.target_faction_ids, 1));
    END LOOP;
  END IF;

  -- Update user quest preferences stats
  UPDATE user_quest_preferences
  SET
    completed_quests_count = completed_quests_count + 1,
    average_completion_rate = (
      SELECT (completed_quests_count::float + 1) /
             NULLIF(completed_quests_count + failed_quests_count + 1, 0)
      FROM user_quest_preferences WHERE user_id = p_user_id
    )
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Fail Quest Function
CREATE OR REPLACE FUNCTION fail_quest(
  p_quest_id UUID,
  p_user_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE quests
  SET status = 'failed'
  WHERE id = p_quest_id AND user_id = p_user_id AND status = 'active';

  -- Update user stats
  UPDATE user_quest_preferences
  SET
    failed_quests_count = failed_quests_count + 1,
    average_completion_rate = (
      SELECT completed_quests_count::float /
             NULLIF(completed_quests_count + failed_quests_count + 1, 0)
      FROM user_quest_preferences WHERE user_id = p_user_id
    )
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-expire old quests (für Cron Job)
CREATE OR REPLACE FUNCTION expire_old_quests()
RETURNS void AS $$
BEGIN
  -- Fail expired active quests
  UPDATE quests
  SET status = 'failed'
  WHERE status = 'active'
    AND expires_at < NOW();

  -- Archive old completed/failed quests (older than 30 days)
  UPDATE quests
  SET status = 'archived'
  WHERE status IN ('completed', 'failed')
    AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 6. VIEWS
-- ============================================

-- Active quests with progress
CREATE OR REPLACE VIEW active_quests_with_stats AS
SELECT
  q.*,
  CASE
    WHEN q.expires_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (q.expires_at - NOW())) / 3600
    ELSE NULL
  END as hours_remaining,
  (q.completed_actions::float / NULLIF(q.required_actions, 0) * 100) as calculated_progress
FROM quests q
WHERE q.status = 'active';

-- 7. INIT USER QUEST PREFERENCES FOR EXISTING USERS
-- ============================================
INSERT INTO user_quest_preferences (user_id)
SELECT DISTINCT user_id FROM user_profiles
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- End Migration
-- ============================================
