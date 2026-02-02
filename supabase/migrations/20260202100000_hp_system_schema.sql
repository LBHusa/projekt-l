-- HP System Schema
-- Foundation for health tracking, death detection, and event logging
-- Phase 2: Konsequenzen & HP/Death System

-- =============================================
-- USER_HEALTH TABLE
-- Tracks current HP, lives, and prestige state
-- =============================================

CREATE TABLE IF NOT EXISTS user_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Health state
  current_hp INTEGER NOT NULL DEFAULT 100 CHECK (current_hp >= 0 AND current_hp <= 100),
  max_hp INTEGER NOT NULL DEFAULT 100 CHECK (max_hp > 0),
  lives INTEGER NOT NULL DEFAULT 3 CHECK (lives >= 0),
  max_lives INTEGER NOT NULL DEFAULT 3 CHECK (max_lives > 0),

  -- Prestige system (for when all lives are lost)
  awaiting_prestige BOOLEAN DEFAULT FALSE,
  prestige_level INTEGER DEFAULT 0 CHECK (prestige_level >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_health_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_health_updated_at
  BEFORE UPDATE ON user_health
  FOR EACH ROW
  EXECUTE FUNCTION update_user_health_timestamp();

-- =============================================
-- HEALTH_EVENTS TABLE
-- Append-only log of all HP changes
-- =============================================

CREATE TABLE IF NOT EXISTS health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'quest_complete',   -- Heal from completing quests
    'habit_done',       -- Heal from completing habits
    'streak_break',     -- Damage from breaking streaks
    'inactivity',       -- Damage from being inactive
    'death',            -- Death event (HP reached 0)
    'prestige',         -- Prestige event (fresh start)
    'damage_manual',    -- Manual damage (admin/testing)
    'heal_manual'       -- Manual heal (admin/testing)
  )),
  hp_change INTEGER NOT NULL,  -- Positive = heal, negative = damage

  -- Source tracking (what triggered this event)
  source_table TEXT CHECK (source_table IN ('quests', 'habits', 'habit_logs', NULL)),
  source_id UUID,  -- ID of the quest/habit/log that triggered event

  -- Additional context
  metadata JSONB DEFAULT '{}',  -- Extra info: difficulty, days_inactive, etc.

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User health lookup (already unique constraint)
CREATE INDEX IF NOT EXISTS idx_user_health_user ON user_health(user_id);

-- Health events queries
CREATE INDEX IF NOT EXISTS idx_health_events_user ON health_events(user_id);
CREATE INDEX IF NOT EXISTS idx_health_events_type ON health_events(event_type);
CREATE INDEX IF NOT EXISTS idx_health_events_created ON health_events(created_at DESC);

-- Composite index for user event history
CREATE INDEX IF NOT EXISTS idx_health_events_user_created ON health_events(user_id, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own health state
CREATE POLICY "Users can view own health" ON user_health
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own health events
CREATE POLICY "Users can view own health events" ON health_events
  FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for direct access
-- All modifications go through RPC functions or triggers

-- =============================================
-- APPLY_HP_CHANGE RPC FUNCTION
-- Atomic HP updates with death detection
-- Applies 10% XP loss on death and logs notification
-- =============================================

CREATE OR REPLACE FUNCTION apply_hp_change(
  p_user_id UUID,
  p_hp_change INTEGER,
  p_event_type TEXT DEFAULT 'heal_manual',
  p_source_table TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
  new_hp INTEGER,
  new_lives INTEGER,
  death_occurred BOOLEAN,
  awaiting_prestige BOOLEAN
) AS $$
DECLARE
  v_current_hp INTEGER;
  v_max_hp INTEGER;
  v_lives INTEGER;
  v_new_hp INTEGER;
  v_death_occurred BOOLEAN := FALSE;
  v_awaiting_prestige BOOLEAN := FALSE;
  v_health_record user_health%ROWTYPE;
  v_xp_lost JSONB := '{}';
  v_total_xp_lost INTEGER := 0;
  v_faction_xp_record RECORD;
BEGIN
  -- Lock the user's health row to prevent race conditions
  SELECT * INTO v_health_record
  FROM user_health
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- If no health record exists, create one with defaults
  IF NOT FOUND THEN
    INSERT INTO user_health (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_health_record;
  END IF;

  v_current_hp := v_health_record.current_hp;
  v_max_hp := v_health_record.max_hp;
  v_lives := v_health_record.lives;
  v_awaiting_prestige := v_health_record.awaiting_prestige;

  -- If already awaiting prestige, don't process HP changes
  IF v_awaiting_prestige THEN
    RETURN QUERY SELECT v_current_hp, v_lives, FALSE, TRUE;
    RETURN;
  END IF;

  -- Calculate new HP, bounded by 0 and max_hp
  v_new_hp := LEAST(v_max_hp, GREATEST(0, v_current_hp + p_hp_change));

  -- Check if death occurred (was alive, now at 0 HP)
  IF v_current_hp > 0 AND v_new_hp = 0 THEN
    v_death_occurred := TRUE;

    -- Decrement lives
    v_lives := v_lives - 1;

    -- Log the incoming damage event first
    INSERT INTO health_events (user_id, event_type, hp_change, source_table, source_id, metadata)
    VALUES (p_user_id, p_event_type, p_hp_change, p_source_table, p_source_id, p_metadata);

    -- =============================================
    -- DEATH CONSEQUENCE: 10% XP LOSS IN ALL FACTIONS
    -- =============================================

    -- Calculate XP loss per faction before applying
    FOR v_faction_xp_record IN
      SELECT faction_id, current_xp, FLOOR(current_xp * 0.1)::INTEGER as xp_to_lose
      FROM user_faction_stats
      WHERE user_id = p_user_id AND current_xp > 0
    LOOP
      v_xp_lost := v_xp_lost || jsonb_build_object(
        v_faction_xp_record.faction_id,
        v_faction_xp_record.xp_to_lose
      );
      v_total_xp_lost := v_total_xp_lost + v_faction_xp_record.xp_to_lose;
    END LOOP;

    -- Apply 10% XP loss to all factions (reduce current_xp by 10%)
    UPDATE user_faction_stats
    SET current_xp = FLOOR(current_xp * 0.9)
    WHERE user_id = p_user_id;

    -- Log death event with XP loss details
    INSERT INTO health_events (user_id, event_type, hp_change, source_table, source_id, metadata)
    VALUES (
      p_user_id,
      'death',
      0,  -- Death itself doesn't change HP
      NULL,
      NULL,
      jsonb_build_object(
        'triggered_by', p_event_type,
        'lives_remaining', v_lives,
        'hp_before_death', v_current_hp,
        'damage_taken', p_hp_change,
        'xp_lost_total', v_total_xp_lost,
        'xp_lost_by_faction', v_xp_lost
      )
    );

    -- Log death notification to notification_log
    INSERT INTO notification_log (
      user_id,
      channel,
      notification_type,
      title,
      message,
      status,
      metadata
    ) VALUES (
      p_user_id,
      'system',
      'death',
      'Du bist gestorben',
      format(
        'Dein Avatar ist auf 0 HP gefallen. Du hast ein Leben verloren (%s/3 verbleibend) und %s XP in allen Factions.',
        GREATEST(0, v_lives),
        v_total_xp_lost
      ),
      'sent',
      jsonb_build_object(
        'event', 'death',
        'lives_remaining', GREATEST(0, v_lives),
        'xp_lost', v_total_xp_lost,
        'xp_lost_by_faction', v_xp_lost
      )
    );

    -- Check if game over (no lives remaining)
    IF v_lives <= 0 THEN
      v_awaiting_prestige := TRUE;
      v_new_hp := 0;
      v_lives := 0;
    ELSE
      -- Respawn at full HP
      v_new_hp := v_max_hp;
    END IF;
  ELSE
    -- Normal HP change (no death), log the event
    INSERT INTO health_events (user_id, event_type, hp_change, source_table, source_id, metadata)
    VALUES (p_user_id, p_event_type, p_hp_change, p_source_table, p_source_id, p_metadata);
  END IF;

  -- Update health state
  UPDATE user_health
  SET
    current_hp = v_new_hp,
    lives = v_lives,
    awaiting_prestige = v_awaiting_prestige
  WHERE user_id = p_user_id;

  -- Return the new state
  RETURN QUERY SELECT v_new_hp, v_lives, v_death_occurred, v_awaiting_prestige;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIALIZE_USER_HEALTH FUNCTION
-- Creates health record for new users
-- =============================================

CREATE OR REPLACE FUNCTION initialize_user_health(p_user_id UUID)
RETURNS user_health AS $$
DECLARE
  v_health_record user_health%ROWTYPE;
BEGIN
  -- Try to insert, do nothing if exists
  INSERT INTO user_health (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Return the record
  SELECT * INTO v_health_record
  FROM user_health
  WHERE user_id = p_user_id;

  RETURN v_health_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PERFORM_PRESTIGE FUNCTION
-- Reset health state after game over
-- =============================================

CREATE OR REPLACE FUNCTION perform_prestige(p_user_id UUID)
RETURNS TABLE (
  new_prestige_level INTEGER,
  new_hp INTEGER,
  new_lives INTEGER
) AS $$
DECLARE
  v_current_prestige INTEGER;
BEGIN
  -- Get current prestige level and verify awaiting prestige
  SELECT prestige_level INTO v_current_prestige
  FROM user_health
  WHERE user_id = p_user_id AND awaiting_prestige = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not awaiting prestige';
  END IF;

  -- Increment prestige and reset health
  UPDATE user_health
  SET
    prestige_level = prestige_level + 1,
    current_hp = max_hp,
    lives = max_lives,
    awaiting_prestige = FALSE
  WHERE user_id = p_user_id;

  -- Log prestige event
  INSERT INTO health_events (user_id, event_type, hp_change, metadata)
  VALUES (
    p_user_id,
    'prestige',
    0,
    jsonb_build_object(
      'old_prestige_level', v_current_prestige,
      'new_prestige_level', v_current_prestige + 1
    )
  );

  -- Return new state
  RETURN QUERY
  SELECT
    h.prestige_level,
    h.current_hp,
    h.lives
  FROM user_health h
  WHERE h.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HELPER FUNCTION: GET_USER_HEALTH
-- Safely get or create user health record
-- =============================================

CREATE OR REPLACE FUNCTION get_user_health(p_user_id UUID)
RETURNS user_health AS $$
BEGIN
  RETURN initialize_user_health(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE user_health IS 'Tracks user HP, lives, and prestige state for the HP/Death system';
COMMENT ON TABLE health_events IS 'Append-only log of all HP changes for audit trail and history';
COMMENT ON FUNCTION apply_hp_change IS 'Atomically apply HP changes with death detection and automatic respawn';
COMMENT ON FUNCTION perform_prestige IS 'Reset health state after game over (all lives lost)';
COMMENT ON FUNCTION get_user_health IS 'Get or create user health record';
