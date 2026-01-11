-- Health Import System
-- Enables Apple Health / HealthKit data import via API keys

-- ============================================
-- 1. API Keys Table
-- ============================================

CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  key_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of the actual key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification (pk_live_xxxxx...)

  name TEXT DEFAULT 'Apple Health Import', -- User-friendly name
  last_used_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index für schnelles Lookup via Hash
CREATE INDEX idx_user_api_keys_hash ON user_api_keys(key_hash);

-- Index für User-Filter
CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);

-- RLS aktivieren
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: User kann eigene API Keys sehen
CREATE POLICY "Users can view own api keys"
  ON user_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: User kann eigene API Keys erstellen
CREATE POLICY "Users can create own api keys"
  ON user_api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: User kann eigene API Keys aktualisieren
CREATE POLICY "Users can update own api keys"
  ON user_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: User kann eigene API Keys löschen
CREATE POLICY "Users can delete own api keys"
  ON user_api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_user_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_user_api_keys_updated_at();

-- ============================================
-- 2. Sleep Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  sleep_date DATE NOT NULL, -- Das Datum der Nacht (z.B. 2026-01-10 für Nacht vom 10. auf 11.)

  sleep_start TIMESTAMPTZ NOT NULL, -- Einschlafzeit
  sleep_end TIMESTAMPTZ NOT NULL, -- Aufwachzeit
  duration_minutes INTEGER NOT NULL, -- Gesamtdauer in Minuten

  quality_score INTEGER, -- 0-100, optional
  deep_sleep_minutes INTEGER,
  rem_sleep_minutes INTEGER,
  light_sleep_minutes INTEGER,
  awake_minutes INTEGER,

  heart_rate_avg INTEGER, -- Durchschnittliche Herzfrequenz
  hrv_avg INTEGER, -- Heart Rate Variability

  import_source TEXT DEFAULT 'manual', -- manual, apple_health, ringconn
  external_id TEXT, -- ID aus externem System für Duplikaterkennung

  notes TEXT,
  xp_gained INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index für User + Datum (häufigste Query)
CREATE INDEX idx_sleep_logs_user_date ON sleep_logs(user_id, sleep_date DESC);

-- Index für Duplikaterkennung
CREATE INDEX idx_sleep_logs_external_id ON sleep_logs(user_id, import_source, external_id)
  WHERE external_id IS NOT NULL;

-- Unique Constraint für externe IDs (pro User + Source)
CREATE UNIQUE INDEX unique_sleep_external_id
  ON sleep_logs(user_id, import_source, external_id)
  WHERE external_id IS NOT NULL;

-- RLS aktivieren
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- Policy: User kann eigene Sleep Logs sehen
CREATE POLICY "Users can view own sleep logs"
  ON sleep_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: User kann eigene Sleep Logs erstellen
CREATE POLICY "Users can create own sleep logs"
  ON sleep_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: User kann eigene Sleep Logs aktualisieren
CREATE POLICY "Users can update own sleep logs"
  ON sleep_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: User kann eigene Sleep Logs löschen
CREATE POLICY "Users can delete own sleep logs"
  ON sleep_logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Health Import Logs
-- ============================================

CREATE TABLE IF NOT EXISTS health_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  import_source TEXT NOT NULL, -- apple_health, ringconn, etc.
  import_type TEXT NOT NULL, -- sleep, workout, steps, body_metrics

  items_imported INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0, -- Duplikate
  items_failed INTEGER DEFAULT 0,

  xp_awarded INTEGER DEFAULT 0,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  error_message TEXT,
  metadata JSONB DEFAULT '{}', -- Zusätzliche Infos

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index für User-Filter
CREATE INDEX idx_health_import_logs_user_id ON health_import_logs(user_id, created_at DESC);

-- RLS aktivieren
ALTER TABLE health_import_logs ENABLE ROW LEVEL SECURITY;

-- Policy: User kann eigene Import Logs sehen
CREATE POLICY "Users can view own import logs"
  ON health_import_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 4. Workouts Table Erweiterung
-- ============================================

-- Füge neue Spalten zur workouts Tabelle hinzu
ALTER TABLE workouts
  ADD COLUMN IF NOT EXISTS import_source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Index für Duplikaterkennung bei Workouts
CREATE INDEX IF NOT EXISTS idx_workouts_external_id
  ON workouts(user_id, import_source, external_id)
  WHERE external_id IS NOT NULL;

-- Unique Constraint für externe Workout-IDs
CREATE UNIQUE INDEX IF NOT EXISTS unique_workout_external_id
  ON workouts(user_id, import_source, external_id)
  WHERE external_id IS NOT NULL;
