-- ============================================
-- User LLM API Keys Table
-- Speichert verschlüsselte API Keys für LLM-Provider (Anthropic, OpenAI)
-- ============================================

-- Erstelle Tabelle für LLM API Keys
CREATE TABLE IF NOT EXISTS user_llm_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'anthropic',
  encrypted_key TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_user_llm_keys_user_id ON user_llm_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_llm_keys_provider ON user_llm_keys(provider);

-- RLS aktivieren
ALTER TABLE user_llm_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies - User kann nur eigene Keys sehen/verwalten
CREATE POLICY "Users can view own LLM keys"
  ON user_llm_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own LLM keys"
  ON user_llm_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own LLM keys"
  ON user_llm_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own LLM keys"
  ON user_llm_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_user_llm_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_llm_keys_updated_at
  BEFORE UPDATE ON user_llm_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_user_llm_keys_updated_at();

-- Kommentar für Dokumentation
COMMENT ON TABLE user_llm_keys IS 'Speichert verschlüsselte LLM API Keys (Anthropic, OpenAI) pro User';
COMMENT ON COLUMN user_llm_keys.encrypted_key IS 'AES-256-GCM verschlüsselter API Key';
COMMENT ON COLUMN user_llm_keys.key_prefix IS 'Erste 12 Zeichen des Keys für Anzeige (z.B. sk-ant-api...)';
