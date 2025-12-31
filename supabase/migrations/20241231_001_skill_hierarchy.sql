-- ============================================
-- Projekt L - Phase 1b: Skill-Hierarchie
-- Migration: 20241230_002_skill_hierarchy.sql
-- ============================================

-- 1. MULTI-DOMAIN SUPPORT
-- Skills können mehreren Domains zugeordnet werden
-- ============================================
CREATE TABLE IF NOT EXISTS skill_domain_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES skill_domains(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, domain_id)
);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_skill_domain_assignments_skill ON skill_domain_assignments(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_domain_assignments_domain ON skill_domain_assignments(domain_id);

-- Trigger: Nur ein Primary pro Skill
CREATE OR REPLACE FUNCTION ensure_single_primary_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = TRUE THEN
    UPDATE skill_domain_assignments
    SET is_primary = FALSE
    WHERE skill_id = NEW.skill_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skill_single_primary_domain ON skill_domain_assignments;
CREATE TRIGGER skill_single_primary_domain
  AFTER INSERT OR UPDATE ON skill_domain_assignments
  FOR EACH ROW
  WHEN (NEW.is_primary = TRUE)
  EXECUTE FUNCTION ensure_single_primary_domain();

-- 2. SKILL TEMPLATES
-- Vordefinierte Skill-Trees für schnelles Onboarding
-- ============================================
CREATE TABLE IF NOT EXISTS skill_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- z.B. 'tech', 'creative', 'fitness', 'business'
  icon TEXT DEFAULT '📦',
  template_data JSONB NOT NULL, -- Enthält Skills, Hierarchie, Connections
  is_official BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_by UUID, -- User ID des Erstellers (NULL = System)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für Kategorien
CREATE INDEX IF NOT EXISTS idx_skill_templates_category ON skill_templates(category);
CREATE INDEX IF NOT EXISTS idx_skill_templates_official ON skill_templates(is_official);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_skill_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS skill_templates_updated ON skill_templates;
CREATE TRIGGER skill_templates_updated
  BEFORE UPDATE ON skill_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_templates_timestamp();

-- 3. XP PROPAGATION
-- Erweitert skills Tabelle für Parent-XP-Flow
-- ============================================
ALTER TABLE skills
  ADD COLUMN IF NOT EXISTS xp_propagation_rate DECIMAL(3,2) DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS aggregate_child_xp INTEGER DEFAULT 0;

-- Aggregate XP = Summe aller Child-Skill XP (für Parent-Anzeige)

-- 4. HELPER FUNKTIONEN
-- ============================================

-- Funktion: XP an Parent propagieren
CREATE OR REPLACE FUNCTION propagate_xp_to_parent(
  p_skill_id UUID,
  p_user_id UUID,
  p_xp_amount INTEGER
)
RETURNS void AS $$
DECLARE
  v_parent_id UUID;
  v_propagation_rate DECIMAL(3,2);
  v_propagated_xp INTEGER;
BEGIN
  -- Hole Parent-Skill
  SELECT parent_skill_id, xp_propagation_rate
  INTO v_parent_id, v_propagation_rate
  FROM skills
  WHERE id = p_skill_id;

  -- Wenn kein Parent, beenden
  IF v_parent_id IS NULL THEN
    RETURN;
  END IF;

  -- Berechne propagierten XP
  v_propagated_xp := FLOOR(p_xp_amount * v_propagation_rate);

  -- Wenn 0 XP, beenden
  IF v_propagated_xp < 1 THEN
    RETURN;
  END IF;

  -- Update aggregate_child_xp am Parent
  UPDATE skills
  SET aggregate_child_xp = aggregate_child_xp + v_propagated_xp
  WHERE id = v_parent_id;

  -- Update user_skills für Parent
  INSERT INTO user_skills (user_id, skill_id, level, current_xp, last_used)
  VALUES (p_user_id, v_parent_id, 1, v_propagated_xp, NOW())
  ON CONFLICT (user_id, skill_id)
  DO UPDATE SET
    current_xp = user_skills.current_xp + v_propagated_xp,
    last_used = NOW();

  -- Rekursiv an nächsten Parent propagieren
  PERFORM propagate_xp_to_parent(v_parent_id, p_user_id, v_propagated_xp);
END;
$$ LANGUAGE plpgsql;

-- Funktion: Alle Domains für einen Skill holen
CREATE OR REPLACE FUNCTION get_skill_domains(p_skill_id UUID)
RETURNS TABLE (
  domain_id UUID,
  domain_name TEXT,
  domain_icon TEXT,
  domain_color TEXT,
  is_primary BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sd.id,
    sd.name,
    sd.icon,
    sd.color,
    COALESCE(sda.is_primary, (sd.id = s.domain_id)) as is_primary
  FROM skills s
  LEFT JOIN skill_domain_assignments sda ON sda.skill_id = s.id
  JOIN skill_domains sd ON sd.id = COALESCE(sda.domain_id, s.domain_id)
  WHERE s.id = p_skill_id;
END;
$$ LANGUAGE plpgsql;

-- 5. SEED: OFFIZIELLE SKILL-TEMPLATES
-- ============================================
INSERT INTO skill_templates (name, description, category, icon, is_official, template_data) VALUES
(
  'Web Developer Starter',
  'Grundlegende Web-Entwicklung Skills',
  'tech',
  '🌐',
  TRUE,
  '{
    "domain": {"name": "Web Development", "icon": "🌐", "color": "#3B82F6"},
    "skills": [
      {"name": "HTML", "icon": "📄", "children": []},
      {"name": "CSS", "icon": "🎨", "children": [
        {"name": "Flexbox", "icon": "📦"},
        {"name": "Grid", "icon": "📐"},
        {"name": "Tailwind", "icon": "💨"}
      ]},
      {"name": "JavaScript", "icon": "⚡", "children": [
        {"name": "DOM", "icon": "🌳"},
        {"name": "ES6+", "icon": "✨"},
        {"name": "TypeScript", "icon": "📘"}
      ]},
      {"name": "React", "icon": "⚛️", "children": [
        {"name": "Hooks", "icon": "🪝"},
        {"name": "State Management", "icon": "🔄"},
        {"name": "Next.js", "icon": "▲"}
      ]}
    ]
  }'::JSONB
),
(
  'Python Data Science',
  'Data Science und ML mit Python',
  'tech',
  '🐍',
  TRUE,
  '{
    "domain": {"name": "Data Science", "icon": "📊", "color": "#10B981"},
    "skills": [
      {"name": "Python Basics", "icon": "🐍", "children": []},
      {"name": "NumPy", "icon": "🔢", "children": []},
      {"name": "Pandas", "icon": "🐼", "children": []},
      {"name": "Visualization", "icon": "📈", "children": [
        {"name": "Matplotlib", "icon": "📊"},
        {"name": "Seaborn", "icon": "🎨"},
        {"name": "Plotly", "icon": "✨"}
      ]},
      {"name": "Machine Learning", "icon": "🤖", "children": [
        {"name": "Scikit-learn", "icon": "🔬"},
        {"name": "TensorFlow", "icon": "🧠"},
        {"name": "PyTorch", "icon": "🔥"}
      ]}
    ]
  }'::JSONB
),
(
  'Fitness Tracker',
  'Fitness und Workout Skills',
  'fitness',
  '💪',
  TRUE,
  '{
    "domain": {"name": "Fitness", "icon": "💪", "color": "#EF4444"},
    "skills": [
      {"name": "Krafttraining", "icon": "🏋️", "children": [
        {"name": "Bankdrücken", "icon": "💪"},
        {"name": "Kniebeugen", "icon": "🦵"},
        {"name": "Kreuzheben", "icon": "🏋️"}
      ]},
      {"name": "Cardio", "icon": "🏃", "children": [
        {"name": "Laufen", "icon": "👟"},
        {"name": "Radfahren", "icon": "🚴"},
        {"name": "Schwimmen", "icon": "🏊"}
      ]},
      {"name": "Mobility", "icon": "🧘", "children": [
        {"name": "Stretching", "icon": "🤸"},
        {"name": "Yoga", "icon": "🧘"}
      ]}
    ]
  }'::JSONB
)
ON CONFLICT DO NOTHING;

-- 6. MIGRATE EXISTING SKILLS TO ASSIGNMENTS
-- ============================================
-- Für alle bestehenden Skills: Erstelle Primary Assignment aus domain_id
INSERT INTO skill_domain_assignments (skill_id, domain_id, is_primary)
SELECT id, domain_id, TRUE
FROM skills
WHERE domain_id IS NOT NULL
ON CONFLICT (skill_id, domain_id) DO NOTHING;

-- ============================================
-- Ende Migration
-- ============================================
