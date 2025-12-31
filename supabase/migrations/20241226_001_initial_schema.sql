-- Projekt L - Initial Database Schema
-- Life Gamification System

-- ============================================
-- 1. SKILL DOMAINS (Root-Orbs auf dem Dashboard)
-- ============================================
CREATE TABLE IF NOT EXISTS skill_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯',
  color TEXT NOT NULL DEFAULT '#6366f1',
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SKILLS (einzelne Skills innerhalb einer Domain)
-- ============================================
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES skill_domains(id) ON DELETE CASCADE,
  parent_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '⭐',
  image_url TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Domain-Abfragen
CREATE INDEX IF NOT EXISTS idx_skills_domain_id ON skills(domain_id);
CREATE INDEX IF NOT EXISTS idx_skills_parent_id ON skills(parent_skill_id);

-- ============================================
-- 3. SKILL CONNECTIONS (Verbindungen/Arme zwischen Skills)
-- ============================================
CREATE TYPE connection_type AS ENUM ('prerequisite', 'synergy', 'related');

CREATE TABLE IF NOT EXISTS skill_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_a_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_b_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  connection_type connection_type NOT NULL DEFAULT 'related',
  strength INTEGER NOT NULL DEFAULT 5 CHECK (strength >= 1 AND strength <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_a_id, skill_b_id)
);

-- Index für schnelle Connection-Abfragen
CREATE INDEX IF NOT EXISTS idx_connections_skill_a ON skill_connections(skill_a_id);
CREATE INDEX IF NOT EXISTS idx_connections_skill_b ON skill_connections(skill_b_id);

-- ============================================
-- 4. USER SKILLS (Fortschritt pro User pro Skill)
-- ============================================
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- Später mit auth.users verknüpfen
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

-- Index für schnelle User-Skill-Abfragen
CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills(skill_id);

-- ============================================
-- 5. EXPERIENCES (XP-Einträge / Journal)
-- ============================================
CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  xp_gained INTEGER NOT NULL CHECK (xp_gained > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  evidence_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Experience-Abfragen
CREATE INDEX IF NOT EXISTS idx_experiences_user ON experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_experiences_skill ON experiences(skill_id);
CREATE INDEX IF NOT EXISTS idx_experiences_date ON experiences(date DESC);

-- ============================================
-- 6. USER PROFILE (Erweiterte User-Daten)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  username TEXT,
  avatar_url TEXT,
  total_level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Funktion um updated_at automatisch zu aktualisieren
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für alle Tabellen mit updated_at
CREATE TRIGGER update_skill_domains_updated_at
  BEFORE UPDATE ON skill_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at
  BEFORE UPDATE ON user_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. VIEWS für einfachere Abfragen
-- ============================================

-- View: Skills mit Domain-Info
CREATE OR REPLACE VIEW skills_with_domain AS
SELECT
  s.*,
  d.name as domain_name,
  d.icon as domain_icon,
  d.color as domain_color
FROM skills s
JOIN skill_domains d ON s.domain_id = d.id;

-- View: User-Skills mit Skill-Info
CREATE OR REPLACE VIEW user_skills_full AS
SELECT
  us.*,
  s.name as skill_name,
  s.icon as skill_icon,
  s.description as skill_description,
  d.name as domain_name,
  d.icon as domain_icon,
  d.color as domain_color
FROM user_skills us
JOIN skills s ON us.skill_id = s.id
JOIN skill_domains d ON s.domain_id = d.id;
