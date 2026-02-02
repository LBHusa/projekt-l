-- HP Heal Triggers
-- Grant HP for positive user actions: quest completion, habit completion, mood logging
-- Phase 2: Konsequenzen & HP/Death System

-- =============================================
-- EXTEND health_events CONSTRAINTS
-- Add 'mood_log' event type and 'mood_logs' source table
-- =============================================

-- Drop existing constraint and recreate with 'mood_log' event type
ALTER TABLE health_events DROP CONSTRAINT IF EXISTS health_events_event_type_check;

ALTER TABLE health_events ADD CONSTRAINT health_events_event_type_check CHECK (
  event_type IN (
    'quest_complete',   -- Heal from completing quests
    'habit_done',       -- Heal from completing habits
    'mood_log',         -- Heal from logging mood (NEW)
    'streak_break',     -- Damage from breaking streaks
    'inactivity',       -- Damage from being inactive
    'quest_failed',     -- Damage from failing quests
    'death',            -- Death event (HP reached 0)
    'prestige',         -- Prestige event (fresh start)
    'damage_manual',    -- Manual damage (admin/testing)
    'heal_manual'       -- Manual heal (admin/testing)
  )
);

-- Drop existing source_table constraint and add 'mood_logs'
ALTER TABLE health_events DROP CONSTRAINT IF EXISTS health_events_source_table_check;

ALTER TABLE health_events ADD CONSTRAINT health_events_source_table_check CHECK (
  source_table IN ('quests', 'habits', 'habit_logs', 'mood_logs') OR source_table IS NULL
);

-- =============================================
-- QUEST COMPLETION HP HEAL TRIGGER
-- Heals +10/+15/+25/+40 HP based on difficulty
-- =============================================

-- Trigger function for quest completion HP heal
CREATE OR REPLACE FUNCTION handle_quest_completion_hp()
RETURNS TRIGGER AS $$
DECLARE
  v_hp_reward INTEGER;
BEGIN
  -- Only trigger on status change to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- HP reward based on difficulty
    v_hp_reward := CASE NEW.difficulty
      WHEN 'easy' THEN 10
      WHEN 'medium' THEN 15
      WHEN 'hard' THEN 25
      WHEN 'epic' THEN 40
      ELSE 15 -- Default for unknown difficulty
    END;

    -- Apply HP heal via apply_hp_change RPC
    -- This function handles:
    -- 1. Logging the health_event
    -- 2. Updating user_health.current_hp (capped at max_hp)
    -- 3. No death check needed for positive HP changes
    PERFORM apply_hp_change(
      NEW.user_id,
      v_hp_reward,
      'quest_complete',
      'quests',
      NEW.id,
      jsonb_build_object('difficulty', NEW.difficulty, 'title', NEW.title)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on quests table
DROP TRIGGER IF EXISTS quest_completion_hp_trigger ON quests;

CREATE TRIGGER quest_completion_hp_trigger
AFTER UPDATE ON quests
FOR EACH ROW
EXECUTE FUNCTION handle_quest_completion_hp();

-- =============================================
-- HABIT COMPLETION HP HEAL TRIGGER
-- Heals +5 HP for positive habit completion
-- =============================================

-- Trigger function for habit completion HP heal
CREATE OR REPLACE FUNCTION handle_habit_completion_hp()
RETURNS TRIGGER AS $$
DECLARE
  v_habit_type TEXT;
BEGIN
  -- Get habit type to check if it's a positive habit
  SELECT habit_type INTO v_habit_type FROM habits WHERE id = NEW.habit_id;

  -- Only heal for positive habits (not negative habit avoidance)
  IF v_habit_type = 'positive' THEN
    -- Apply HP heal via apply_hp_change RPC
    PERFORM apply_hp_change(
      NEW.user_id,
      5,  -- +5 HP for habit completion
      'habit_done',
      'habit_logs',
      NEW.id,
      jsonb_build_object('habit_id', NEW.habit_id, 'logged_at', NEW.logged_at)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on habit_logs table
DROP TRIGGER IF EXISTS habit_completion_hp_trigger ON habit_logs;

CREATE TRIGGER habit_completion_hp_trigger
AFTER INSERT ON habit_logs
FOR EACH ROW
EXECUTE FUNCTION handle_habit_completion_hp();

-- =============================================
-- MOOD LOG HP HEAL TRIGGER
-- Heals +2 HP for mood logging
-- =============================================

-- Trigger function for mood log HP heal
CREATE OR REPLACE FUNCTION handle_mood_log_hp()
RETURNS TRIGGER AS $$
BEGIN
  -- Apply HP heal via apply_hp_change RPC
  PERFORM apply_hp_change(
    NEW.user_id,
    2,  -- +2 HP for mood logging
    'mood_log',
    'mood_logs',
    NEW.id,
    jsonb_build_object('mood', NEW.mood, 'created_at', NEW.created_at)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on mood_logs table
DROP TRIGGER IF EXISTS mood_log_hp_trigger ON mood_logs;

CREATE TRIGGER mood_log_hp_trigger
AFTER INSERT ON mood_logs
FOR EACH ROW
EXECUTE FUNCTION handle_mood_log_hp();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION handle_quest_completion_hp IS 'Trigger function that heals HP when a quest is completed (10/15/25/40 based on difficulty)';
COMMENT ON TRIGGER quest_completion_hp_trigger ON quests IS 'Fires after quest status changes to completed, granting HP heal';

COMMENT ON FUNCTION handle_habit_completion_hp IS 'Trigger function that heals +5 HP when a positive habit is logged';
COMMENT ON TRIGGER habit_completion_hp_trigger ON habit_logs IS 'Fires after habit log insert, granting HP heal for positive habits';

COMMENT ON FUNCTION handle_mood_log_hp IS 'Trigger function that heals +2 HP when mood is logged';
COMMENT ON TRIGGER mood_log_hp_trigger ON mood_logs IS 'Fires after mood log insert, granting HP heal';
