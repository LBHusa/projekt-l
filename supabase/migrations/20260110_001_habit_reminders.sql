-- ============================================
-- Projekt L - Habit Reminder System
-- Phase: Multiple Reminders per Habit with Tracking
-- ============================================

-- 1. Add timezone to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Berlin';

COMMENT ON COLUMN user_profiles.timezone IS 'IANA timezone identifier (e.g., Europe/Berlin, America/New_York)';

-- 2. Habit Reminders Table
CREATE TABLE IF NOT EXISTS habit_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  reminder_time TIME NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  days_of_week TEXT[] DEFAULT '{mon,tue,wed,thu,fri,sat,sun}',
  label TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habit_reminders_habit_id ON habit_reminders(habit_id);
CREATE INDEX idx_habit_reminders_user_id ON habit_reminders(user_id);
CREATE INDEX idx_habit_reminders_enabled ON habit_reminders(enabled) WHERE enabled = TRUE;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_habit_reminders_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS habit_reminders_updated_at ON habit_reminders;
CREATE TRIGGER habit_reminders_updated_at
  BEFORE UPDATE ON habit_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_habit_reminders_timestamp();

-- RLS Policies
ALTER TABLE habit_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habit reminders"
  ON habit_reminders FOR SELECT
  USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can create own habit reminders"
  ON habit_reminders FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can update own habit reminders"
  ON habit_reminders FOR UPDATE
  USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can delete own habit reminders"
  ON habit_reminders FOR DELETE
  USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- 3. Reminder Delivery Log Table
CREATE TABLE IF NOT EXISTS reminder_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES habit_reminders(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  scheduled_time TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  action_taken TEXT CHECK (action_taken IN ('completed', 'snoozed', 'dismissed', 'viewed')),

  error_message TEXT,
  error_code TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminder_delivery_log_user_id ON reminder_delivery_log(user_id);
CREATE INDEX idx_reminder_delivery_log_reminder_id ON reminder_delivery_log(reminder_id);
CREATE INDEX idx_reminder_delivery_log_habit_id ON reminder_delivery_log(habit_id);
CREATE INDEX idx_reminder_delivery_log_sent_at ON reminder_delivery_log(sent_at DESC);
CREATE INDEX idx_reminder_delivery_log_delivered ON reminder_delivery_log(delivered);

-- RLS for delivery log
ALTER TABLE reminder_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminder delivery log"
  ON reminder_delivery_log FOR SELECT
  USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "System can insert reminder delivery log"
  ON reminder_delivery_log FOR INSERT
  WITH CHECK (TRUE);  -- Server-side only

COMMENT ON TABLE habit_reminders IS 'Multiple reminder times per habit with day-of-week scheduling';
COMMENT ON TABLE reminder_delivery_log IS 'Audit trail of all sent habit reminders with delivery tracking';
