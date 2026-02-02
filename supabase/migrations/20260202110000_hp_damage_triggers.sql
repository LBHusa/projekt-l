-- HP Damage Triggers
-- Automatic HP damage for quest failures
-- Phase 2: Konsequenzen & HP/Death System

-- =============================================
-- EXTEND health_events event_type CONSTRAINT
-- Add 'quest_failed' to allowed event types
-- =============================================

-- Drop existing constraint and recreate with new value
ALTER TABLE health_events DROP CONSTRAINT IF EXISTS health_events_event_type_check;

ALTER TABLE health_events ADD CONSTRAINT health_events_event_type_check CHECK (
  event_type IN (
    'quest_complete',   -- Heal from completing quests
    'habit_done',       -- Heal from completing habits
    'streak_break',     -- Damage from breaking streaks
    'inactivity',       -- Damage from being inactive
    'quest_failed',     -- Damage from failing quests (NEW)
    'death',            -- Death event (HP reached 0)
    'prestige',         -- Prestige event (fresh start)
    'damage_manual',    -- Manual damage (admin/testing)
    'heal_manual'       -- Manual heal (admin/testing)
  )
);

-- =============================================
-- QUEST FAILURE HP TRIGGER
-- Applies -10 HP when quest status changes to 'failed'
-- =============================================

-- Trigger function for quest failure HP damage
CREATE OR REPLACE FUNCTION handle_quest_failure_hp()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on status change to 'failed'
  -- Guard against duplicate triggers with OLD.status check
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    -- Apply HP damage via apply_hp_change RPC
    -- This function handles:
    -- 1. Logging the health_event
    -- 2. Updating user_health.current_hp
    -- 3. Death detection and respawn
    -- 4. XP loss on death
    PERFORM apply_hp_change(
      NEW.user_id,
      -10,  -- 10 HP damage for quest failure
      'quest_failed',
      'quests',
      NEW.id,
      jsonb_build_object(
        'title', NEW.title,
        'difficulty', NEW.difficulty,
        'type', NEW.type
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on quests table
-- AFTER UPDATE ensures quest status is already committed
DROP TRIGGER IF EXISTS quest_failure_hp_trigger ON quests;

CREATE TRIGGER quest_failure_hp_trigger
AFTER UPDATE ON quests
FOR EACH ROW
EXECUTE FUNCTION handle_quest_failure_hp();

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON FUNCTION handle_quest_failure_hp IS 'Trigger function that applies -10 HP damage when a quest fails';
COMMENT ON TRIGGER quest_failure_hp_trigger ON quests IS 'Fires after quest status changes to failed, applying HP damage';
