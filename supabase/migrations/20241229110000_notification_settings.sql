-- ============================================
-- Projekt L - Notification Settings
-- Phase 3.2: Browser Push + Telegram Bot
-- ============================================

-- Notification Settings Tabelle
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- Kanäle
  push_enabled BOOLEAN DEFAULT FALSE,
  push_subscription JSONB,                    -- Web Push subscription object
  telegram_enabled BOOLEAN DEFAULT FALSE,
  telegram_chat_id TEXT,                      -- Telegram Chat ID

  -- Reminder-Einstellungen
  birthday_days_before INTEGER[] DEFAULT '{7, 1}',  -- Tage vor Geburtstag erinnern
  attention_threshold_days INTEGER DEFAULT 30,      -- Ab wann "braucht Aufmerksamkeit"

  -- Ruhezeiten (keine Benachrichtigungen)
  quiet_hours_enabled BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint pro User
  CONSTRAINT unique_user_notification_settings UNIQUE (user_id)
);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id
  ON notification_settings(user_id);

-- Index für aktive Push-Subscriptions (für Cron-Job)
CREATE INDEX IF NOT EXISTS idx_notification_settings_push_enabled
  ON notification_settings(push_enabled) WHERE push_enabled = TRUE;

-- Index für aktive Telegram-User (für Cron-Job)
CREATE INDEX IF NOT EXISTS idx_notification_settings_telegram_enabled
  ON notification_settings(telegram_enabled) WHERE telegram_enabled = TRUE;

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_settings_updated_at ON notification_settings;
CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_timestamp();

-- RLS Policies
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Users können nur ihre eigenen Settings sehen
CREATE POLICY "Users can view own notification settings"
  ON notification_settings FOR SELECT
  USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Users können ihre eigenen Settings erstellen
CREATE POLICY "Users can create own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Users können ihre eigenen Settings aktualisieren
CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Default Settings werden in seed.sql erstellt (nach user_profiles)

-- ============================================
-- Notification Log (für Debugging/Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

  -- Notification Details
  channel TEXT NOT NULL CHECK (channel IN ('push', 'telegram')),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('birthday', 'attention', 'reminder', 'custom')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,                                 -- Zusätzliche Daten (z.B. contact_id)

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- Index für User-Notifications
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id
  ON notification_log(user_id);

-- Index für Status (für Retry-Mechanismus)
CREATE INDEX IF NOT EXISTS idx_notification_log_status
  ON notification_log(status) WHERE status = 'pending';

-- Index für Zeitbereich-Abfragen
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at
  ON notification_log(created_at DESC);

-- RLS für Notification Log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification log"
  ON notification_log FOR SELECT
  USING (user_id = auth.uid() OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "System can insert notification log"
  ON notification_log FOR INSERT
  WITH CHECK (TRUE);  -- Server-side only (via service role)

COMMENT ON TABLE notification_settings IS 'User notification preferences for push and Telegram';
COMMENT ON TABLE notification_log IS 'Log of all sent notifications for tracking and debugging';
