-- ============================================
-- Projekt L - Phase 1: Factions System
-- Migration: 20241230_001_factions.sql
-- ============================================

-- 1. FACTIONS TABELLE (7 feste Lebensbereiche)
-- ============================================
CREATE TABLE IF NOT EXISTS factions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_de TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0
);

-- Seed-Daten: Die 7 festen Factions
INSERT INTO factions (id, name, name_de, icon, color, description, display_order) VALUES
  ('karriere', 'Career', 'Karriere', '💼', '#3B82F6', 'Berufliche Entwicklung und Karrierefortschritt', 1),
  ('familie', 'Family', 'Familie', '❤️', '#EF4444', 'Familie und nahe Beziehungen', 2),
  ('hobbys', 'Hobbies', 'Hobbys', '🎨', '#8B5CF6', 'Freizeit und persönliche Interessen', 3),
  ('gesundheit', 'Health', 'Gesundheit', '💪', '#10B981', 'Fitness und körperliches Wohlbefinden', 4),
  ('lernen', 'Learning', 'Lernen', '📚', '#F59E0B', 'Bildung und persönliche Weiterentwicklung', 5),
  ('freunde', 'Friends', 'Freunde', '👥', '#EC4899', 'Soziale Kontakte und Freundschaften', 6),
  ('finanzen', 'Finance', 'Finanzen', '💰', '#14B8A6', 'Finanzielle Stabilität und Vermögensaufbau', 7)
ON CONFLICT (id) DO NOTHING;

-- 2. USER FACTION STATS (XP pro User pro Faction)
-- ============================================
CREATE TABLE IF NOT EXISTS user_faction_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  weekly_xp INTEGER DEFAULT 0,
  monthly_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, faction_id)
);

-- Indexes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_user_faction_stats_user ON user_faction_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_faction_stats_faction ON user_faction_stats(faction_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_user_faction_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_faction_stats_updated ON user_faction_stats;
CREATE TRIGGER user_faction_stats_updated
  BEFORE UPDATE ON user_faction_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_user_faction_stats_timestamp();

-- 3. EXPERIENCES ERWEITERN (Faction-Tracking bei XP-Logging)
-- ============================================
-- Spalte für Faction-Override bei XP-Logging
ALTER TABLE experiences
  ADD COLUMN IF NOT EXISTS faction_id TEXT REFERENCES factions(id),
  ADD COLUMN IF NOT EXISTS faction_override BOOLEAN DEFAULT FALSE;

-- 4. SKILL_DOMAINS ERWEITERN (Default Faction Mapping)
-- ============================================
-- Die faction_key Spalte existiert bereits, aber wir stellen sicher dass sie korrekt ist
ALTER TABLE skill_domains
  DROP CONSTRAINT IF EXISTS skill_domains_faction_key_fkey;

ALTER TABLE skill_domains
  ADD CONSTRAINT skill_domains_faction_key_fkey
  FOREIGN KEY (faction_key) REFERENCES factions(id) ON DELETE SET NULL;

-- 5. HELPER FUNKTIONEN
-- ============================================

-- Funktion: Faction-Level aus XP berechnen (sqrt(xp/100))
CREATE OR REPLACE FUNCTION calculate_faction_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF xp <= 0 THEN
    RETURN 1;
  END IF;
  RETURN GREATEST(1, FLOOR(SQRT(xp::float / 100)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funktion: Faction Stats updaten
CREATE OR REPLACE FUNCTION update_faction_stats(
  p_user_id UUID,
  p_faction_id TEXT,
  p_xp_amount INTEGER
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_faction_stats (user_id, faction_id, total_xp, weekly_xp, monthly_xp, level, last_activity)
  VALUES (
    p_user_id,
    p_faction_id,
    p_xp_amount,
    p_xp_amount,
    p_xp_amount,
    calculate_faction_level(p_xp_amount),
    NOW()
  )
  ON CONFLICT (user_id, faction_id)
  DO UPDATE SET
    total_xp = user_faction_stats.total_xp + p_xp_amount,
    weekly_xp = user_faction_stats.weekly_xp + p_xp_amount,
    monthly_xp = user_faction_stats.monthly_xp + p_xp_amount,
    level = calculate_faction_level(user_faction_stats.total_xp + p_xp_amount),
    last_activity = NOW();
END;
$$ LANGUAGE plpgsql;

-- Funktion: Weekly XP Reset (für Cron Job)
CREATE OR REPLACE FUNCTION reset_weekly_faction_xp()
RETURNS void AS $$
BEGIN
  UPDATE user_faction_stats SET weekly_xp = 0;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Monthly XP Reset (für Cron Job)
CREATE OR REPLACE FUNCTION reset_monthly_faction_xp()
RETURNS void AS $$
BEGIN
  UPDATE user_faction_stats SET monthly_xp = 0;
END;
$$ LANGUAGE plpgsql;

-- 6. INIT FACTION STATS FÜR BESTEHENDE USER
-- ============================================
-- Erstellt für jeden existierenden User initiale Faction-Stats
INSERT INTO user_faction_stats (user_id, faction_id, total_xp, level)
SELECT DISTINCT up.user_id, f.id, 0, 1
FROM user_profiles up
CROSS JOIN factions f
ON CONFLICT (user_id, faction_id) DO NOTHING;

-- ============================================
-- Ende Migration
-- ============================================
