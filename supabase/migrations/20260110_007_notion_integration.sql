-- Notion Integration
-- Speichert OAuth2-Tokens für Notion-Integration pro User

CREATE TABLE IF NOT EXISTS notion_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- OAuth2 Tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  bot_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ein User kann nur eine aktive Integration haben
  UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE notion_integrations ENABLE ROW LEVEL SECURITY;

-- User kann nur eigene Integration sehen
CREATE POLICY "Users can view own Notion integration"
  ON notion_integrations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User kann eigene Integration erstellen
CREATE POLICY "Users can insert own Notion integration"
  ON notion_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User kann eigene Integration aktualisieren
CREATE POLICY "Users can update own Notion integration"
  ON notion_integrations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User kann eigene Integration löschen
CREATE POLICY "Users can delete own Notion integration"
  ON notion_integrations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Updated At Trigger
CREATE TRIGGER update_notion_integrations_updated_at
  BEFORE UPDATE ON notion_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE notion_integrations IS 'Stores Notion OAuth2 credentials and sync status for each user';
