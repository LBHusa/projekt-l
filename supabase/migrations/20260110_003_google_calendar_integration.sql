-- ============================================
-- Google Calendar Integration
-- ============================================
--
-- Stores OAuth2 tokens and sync state for Google Calendar
-- Enables automatic time tracking from calendar events

-- Google Calendar Integration Table
CREATE TABLE IF NOT EXISTS google_calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One integration per user
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_gcal_user_active ON google_calendar_integrations(user_id, is_active);

-- RLS Policies
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Google Calendar integration"
  ON google_calendar_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Google Calendar integration"
  ON google_calendar_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Google Calendar integration"
  ON google_calendar_integrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own Google Calendar integration"
  ON google_calendar_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Extend activity_log to support external sources
ALTER TABLE activity_log
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_source TEXT;

-- Index for external ID lookups (prevent duplicate syncs)
CREATE INDEX IF NOT EXISTS idx_activity_log_external
  ON activity_log(user_id, external_source, external_id);

-- Comments
COMMENT ON TABLE google_calendar_integrations IS 'OAuth2 tokens and sync state for Google Calendar integration';
COMMENT ON COLUMN google_calendar_integrations.access_token IS 'Google OAuth2 access token (short-lived)';
COMMENT ON COLUMN google_calendar_integrations.refresh_token IS 'Google OAuth2 refresh token (long-lived)';
COMMENT ON COLUMN google_calendar_integrations.token_expiry IS 'Access token expiry timestamp';
COMMENT ON COLUMN google_calendar_integrations.is_active IS 'Whether integration is currently active';
COMMENT ON COLUMN google_calendar_integrations.last_sync_at IS 'Last successful calendar sync timestamp';
COMMENT ON COLUMN activity_log.external_id IS 'ID from external source (e.g., Google Calendar event ID)';
COMMENT ON COLUMN activity_log.external_source IS 'Source system (e.g., google_calendar, notion, telegram)';
