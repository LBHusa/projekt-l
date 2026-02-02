-- Proactive Notification Log
-- Tracks sent proactive reminders to prevent duplicates
-- Phase 1: Fairness & Proaktivitaet

CREATE TABLE IF NOT EXISTS proactive_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,

  -- Notification context
  days_neglected INTEGER NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'neglected_faction' CHECK (notification_type IN ('neglected_faction', 'weekly_summary', 'streak_warning')),
  channel TEXT NOT NULL DEFAULT 'push' CHECK (channel IN ('push', 'telegram')),

  -- Delivery tracking
  delivered BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store date separately for deduplication (can't use expression index with date function)
ALTER TABLE proactive_notification_log ADD COLUMN sent_date DATE DEFAULT CURRENT_DATE;

-- Deduplication: Only 1 notification per user per faction per day
CREATE UNIQUE INDEX idx_proactive_log_dedupe ON proactive_notification_log(user_id, faction_id, sent_date);

-- Fast lookups for scheduler
CREATE INDEX idx_proactive_log_user ON proactive_notification_log(user_id);
CREATE INDEX idx_proactive_log_sent ON proactive_notification_log(sent_at);

-- RLS policies
ALTER TABLE proactive_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification log" ON proactive_notification_log
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert logs (via service role)
CREATE POLICY "Service can insert notification log" ON proactive_notification_log
  FOR INSERT WITH CHECK (true);

COMMENT ON TABLE proactive_notification_log IS 'Log of proactive notifications sent to users about neglected life domains';
