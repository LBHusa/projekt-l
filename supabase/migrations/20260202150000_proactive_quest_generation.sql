-- Proactive Quest Generation
-- Phase 3: Lebendiger Buddy
-- Adds preferences for proactive generation and ruhetage

-- =============================================
-- EXTEND USER_QUEST_PREFERENCES
-- Add proactive generation settings
-- =============================================

-- Add new columns if they don't exist
ALTER TABLE user_quest_preferences
  ADD COLUMN IF NOT EXISTS proactive_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS morning_quests_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS morning_quest_time TIME DEFAULT '08:00:00',
  ADD COLUMN IF NOT EXISTS quest_free_days TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS inactivity_threshold_days INTEGER DEFAULT 7;

-- Add comment for documentation
COMMENT ON COLUMN user_quest_preferences.proactive_enabled IS 'Enable proactive quest generation based on inactivity';
COMMENT ON COLUMN user_quest_preferences.morning_quests_enabled IS 'Generate morning quests if no active quests';
COMMENT ON COLUMN user_quest_preferences.morning_quest_time IS 'Time to generate morning quests';
COMMENT ON COLUMN user_quest_preferences.quest_free_days IS 'Days without quest generation (e.g., ["saturday", "sunday"])';
COMMENT ON COLUMN user_quest_preferences.inactivity_threshold_days IS 'Days of faction inactivity before suggesting quest';

-- =============================================
-- PROACTIVE QUEST SUGGESTIONS TABLE
-- Tracks suggested (not yet accepted) quests
-- =============================================

CREATE TABLE IF NOT EXISTS quest_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Suggested Quest Content
  quest_type quest_type NOT NULL DEFAULT 'daily',
  difficulty quest_difficulty NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  motivation TEXT,
  target_faction_ids TEXT[] DEFAULT '{}',
  xp_reward INTEGER NOT NULL DEFAULT 100,
  required_actions INTEGER DEFAULT 1,

  -- Trigger Info
  trigger_reason TEXT NOT NULL, -- 'inactivity', 'morning', 'balance'
  trigger_faction_id TEXT, -- Which faction triggered this

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'expired')),
  accepted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- If accepted, link to created quest
  created_quest_id UUID REFERENCES quests(id) ON DELETE SET NULL,

  -- Notification tracking
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quest_suggestions_user ON quest_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_suggestions_status ON quest_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_quest_suggestions_pending ON quest_suggestions(user_id, status) WHERE status = 'pending';

-- RLS
ALTER TABLE quest_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions"
  ON quest_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON quest_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- FACTION ACTIVITY TRACKING VIEW
-- Shows last activity date per faction
-- =============================================

CREATE OR REPLACE VIEW faction_last_activity AS
SELECT
  ufs.user_id,
  ufs.faction_id,
  f.name AS faction_name,
  ufs.level,
  ufs.total_xp,
  ufs.last_activity,
  COALESCE(EXTRACT(DAY FROM NOW() - ufs.last_activity), 9999)::INTEGER AS days_since_activity
FROM user_faction_stats ufs
JOIN factions f ON f.id = ufs.faction_id
WHERE ufs.total_xp > 0; -- Only factions user has interacted with

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

/**
 * Get weakest faction (longest time since activity)
 */
CREATE OR REPLACE FUNCTION get_weakest_faction(p_user_id UUID)
RETURNS TABLE (
  faction_id TEXT,
  faction_name TEXT,
  days_inactive INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    faction_id,
    faction_name,
    days_since_activity AS days_inactive
  FROM faction_last_activity
  WHERE user_id = p_user_id
    AND days_since_activity >= 7
  ORDER BY days_since_activity DESC
  LIMIT 1;
$$;

/**
 * Check if user has any active quests
 */
CREATE OR REPLACE FUNCTION has_active_quests(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM quests
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

/**
 * Check if today is a quest-free day for user
 */
CREATE OR REPLACE FUNCTION is_quest_free_day(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_free_days TEXT[];
  v_today TEXT;
BEGIN
  -- Get user's quest-free days
  SELECT quest_free_days INTO v_free_days
  FROM user_quest_preferences
  WHERE user_id = p_user_id;

  IF v_free_days IS NULL OR array_length(v_free_days, 1) IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get today's day name (lowercase)
  v_today := LOWER(TO_CHAR(NOW(), 'day'));
  v_today := TRIM(v_today);

  -- Check if today is in free days
  RETURN v_today = ANY(v_free_days);
END;
$$;

/**
 * Accept a quest suggestion - creates actual quest
 */
CREATE OR REPLACE FUNCTION accept_quest_suggestion(p_suggestion_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_suggestion RECORD;
  v_quest_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get suggestion
  SELECT * INTO v_suggestion
  FROM quest_suggestions
  WHERE id = p_suggestion_id AND user_id = p_user_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found or already processed';
  END IF;

  -- Calculate expiry
  v_expires_at := CASE v_suggestion.quest_type
    WHEN 'daily' THEN NOW() + INTERVAL '24 hours'
    WHEN 'weekly' THEN NOW() + INTERVAL '7 days'
    ELSE NULL
  END;

  -- Create quest
  INSERT INTO quests (
    user_id,
    type,
    difficulty,
    title,
    description,
    motivation,
    target_faction_ids,
    xp_reward,
    required_actions,
    expires_at
  ) VALUES (
    p_user_id,
    v_suggestion.quest_type,
    v_suggestion.difficulty,
    v_suggestion.title,
    v_suggestion.description,
    v_suggestion.motivation,
    v_suggestion.target_faction_ids,
    v_suggestion.xp_reward,
    v_suggestion.required_actions,
    v_expires_at
  )
  RETURNING id INTO v_quest_id;

  -- Update suggestion
  UPDATE quest_suggestions SET
    status = 'accepted',
    accepted_at = NOW(),
    created_quest_id = v_quest_id
  WHERE id = p_suggestion_id;

  RETURN v_quest_id;
END;
$$;

/**
 * Dismiss a quest suggestion
 */
CREATE OR REPLACE FUNCTION dismiss_quest_suggestion(p_suggestion_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE quest_suggestions SET
    status = 'dismissed',
    dismissed_at = NOW()
  WHERE id = p_suggestion_id
    AND user_id = p_user_id
    AND status = 'pending';
END;
$$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT ON faction_last_activity TO authenticated;
GRANT SELECT, UPDATE ON quest_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_weakest_faction TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_quests TO authenticated;
GRANT EXECUTE ON FUNCTION is_quest_free_day TO authenticated;
GRANT EXECUTE ON FUNCTION accept_quest_suggestion TO authenticated;
GRANT EXECUTE ON FUNCTION dismiss_quest_suggestion TO authenticated;
