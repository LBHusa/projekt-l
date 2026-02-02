-- ============================================
-- Projekt L - Add snoozed_until to habit_reminders
-- Allows temporarily snoozing reminders
-- ============================================

-- Add snoozed_until column
ALTER TABLE habit_reminders
ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN habit_reminders.snoozed_until IS 'When set, reminder is snoozed until this timestamp';

-- Index for efficient queries filtering out snoozed reminders
CREATE INDEX IF NOT EXISTS idx_habit_reminders_snoozed_until 
ON habit_reminders(snoozed_until) 
WHERE snoozed_until IS NOT NULL;
