-- ============================================
-- Migration: Beziehungs-Management-System
-- Projekt L - Kontakte, Interaktionen, Beziehungs-Level
-- Date: 2024-12-28
-- ============================================

-- 1. ENUM TYPES
-- ============================================

CREATE TYPE relationship_type AS ENUM (
  -- Familie
  'partner', 'spouse', 'child', 'parent', 'grandparent', 'sibling',
  'sibling_in_law', 'parent_in_law', 'child_in_law', 'cousin',
  'aunt_uncle', 'niece_nephew', 'step_parent', 'step_child', 'step_sibling',
  -- Freunde
  'close_friend', 'friend', 'acquaintance',
  -- Professionell & Andere
  'colleague', 'mentor', 'mentee', 'neighbor', 'other'
);

CREATE TYPE relationship_category AS ENUM ('family', 'friend', 'professional', 'other');

CREATE TYPE interaction_type AS ENUM (
  'call', 'video_call', 'message', 'meeting', 'activity',
  'event', 'gift', 'support', 'quality_time', 'other'
);

CREATE TYPE interaction_quality AS ENUM ('poor', 'neutral', 'good', 'great', 'exceptional');

-- 2. CONTACTS TABLE
-- ============================================

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Basis-Informationen
  first_name TEXT NOT NULL,
  last_name TEXT,
  nickname TEXT,
  photo_url TEXT,

  -- Beziehungstyp
  relationship_type relationship_type NOT NULL DEFAULT 'acquaintance',
  relationship_category relationship_category NOT NULL DEFAULT 'other',
  domain_id UUID REFERENCES skill_domains(id) ON DELETE SET NULL,

  -- Beziehungs-Metriken (1-100)
  relationship_level INTEGER NOT NULL DEFAULT 1 CHECK (relationship_level >= 1 AND relationship_level <= 100),
  trust_level INTEGER NOT NULL DEFAULT 50 CHECK (trust_level >= 0 AND trust_level <= 100),
  current_xp INTEGER NOT NULL DEFAULT 0 CHECK (current_xp >= 0),

  -- Wichtige Daten
  birthday DATE,
  anniversary DATE,
  met_date DATE,
  met_context TEXT,

  -- Kontakt-Informationen (JSONB für Flexibilität)
  contact_info JSONB DEFAULT '{}'::jsonb,

  -- Zusätzliche Daten
  shared_interests TEXT[] DEFAULT '{}',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Interaktions-Statistiken (denormalisiert für Performance)
  last_interaction_at TIMESTAMPTZ,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  avg_interaction_quality NUMERIC(3,2) DEFAULT 0,

  -- Flags
  is_favorite BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  reminder_frequency_days INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für contacts
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_category ON contacts(relationship_category);
CREATE INDEX idx_contacts_domain ON contacts(domain_id);
CREATE INDEX idx_contacts_birthday ON contacts(birthday);
CREATE INDEX idx_contacts_last_interaction ON contacts(last_interaction_at);
CREATE INDEX idx_contacts_favorite ON contacts(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_contacts_not_archived ON contacts(is_archived) WHERE is_archived = false;

COMMENT ON TABLE contacts IS 'Kontakte/Personen für das Beziehungs-Management-System';
COMMENT ON COLUMN contacts.relationship_level IS 'Beziehungs-Level 1-100, steigt durch Interaktionen';
COMMENT ON COLUMN contacts.trust_level IS 'Vertrauens-Level 0-100, manuell gepflegt';

-- 3. CONTACT_INTERACTIONS TABLE
-- ============================================

CREATE TABLE contact_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Interaktions-Details
  interaction_type interaction_type NOT NULL DEFAULT 'other',
  title TEXT,
  description TEXT,

  -- Qualität & XP
  quality interaction_quality NOT NULL DEFAULT 'neutral',
  xp_gained INTEGER NOT NULL DEFAULT 0 CHECK (xp_gained >= 0),
  duration_minutes INTEGER,

  -- Zeitpunkt
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optionale Verknüpfungen
  related_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  evidence_urls TEXT[] DEFAULT '{}',

  -- Metadaten
  location TEXT,
  participants TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für contact_interactions
CREATE INDEX idx_interactions_contact ON contact_interactions(contact_id);
CREATE INDEX idx_interactions_user ON contact_interactions(user_id);
CREATE INDEX idx_interactions_occurred ON contact_interactions(occurred_at DESC);
CREATE INDEX idx_interactions_type ON contact_interactions(interaction_type);

COMMENT ON TABLE contact_interactions IS 'Historie aller Interaktionen mit Kontakten';
COMMENT ON COLUMN contact_interactions.xp_gained IS 'XP basierend auf Interaktionstyp × Quality-Multiplier';

-- 4. CONTACT_IMPORTANT_DATES TABLE
-- ============================================

CREATE TABLE contact_important_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  date_value DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT TRUE,
  reminder_days_before INTEGER[] DEFAULT '{7, 1}',
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_important_dates_contact ON contact_important_dates(contact_id);
CREATE INDEX idx_important_dates_date ON contact_important_dates(date_value);

COMMENT ON TABLE contact_important_dates IS 'Wichtige Daten pro Kontakt (Jahrestage, Events)';

-- 5. HELPER FUNCTIONS
-- ============================================

-- XP für nächstes Level berechnen
CREATE OR REPLACE FUNCTION get_relationship_xp_for_level(lvl INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN CEIL(100 * POWER(lvl, 1.5));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update contact stats after interaction
CREATE OR REPLACE FUNCTION update_contact_stats_after_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts SET
    last_interaction_at = NEW.occurred_at,
    interaction_count = interaction_count + 1,
    current_xp = current_xp + NEW.xp_gained,
    updated_at = NOW()
  WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_interaction_insert
  AFTER INSERT ON contact_interactions
  FOR EACH ROW EXECUTE FUNCTION update_contact_stats_after_interaction();

-- Auto level-up wenn XP erreicht
CREATE OR REPLACE FUNCTION check_relationship_level_up()
RETURNS TRIGGER AS $$
DECLARE
  xp_needed INTEGER;
BEGIN
  -- Nur bei XP-Änderung prüfen
  IF NEW.current_xp = OLD.current_xp THEN
    RETURN NEW;
  END IF;

  xp_needed := get_relationship_xp_for_level(NEW.relationship_level);

  WHILE NEW.current_xp >= xp_needed AND NEW.relationship_level < 100 LOOP
    NEW.current_xp := NEW.current_xp - xp_needed;
    NEW.relationship_level := NEW.relationship_level + 1;
    xp_needed := get_relationship_xp_for_level(NEW.relationship_level);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_contact_update_level
  BEFORE UPDATE OF current_xp ON contacts
  FOR EACH ROW EXECUTE FUNCTION check_relationship_level_up();

-- updated_at trigger für contacts
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. VIEWS
-- ============================================

-- View: Kontakte mit nächsten Geburtstagen
CREATE OR REPLACE VIEW contacts_upcoming_birthdays AS
SELECT
  c.*,
  CASE
    WHEN EXTRACT(DOY FROM c.birthday) >= EXTRACT(DOY FROM CURRENT_DATE)
    THEN (EXTRACT(DOY FROM c.birthday) - EXTRACT(DOY FROM CURRENT_DATE))::INTEGER
    ELSE (365 - EXTRACT(DOY FROM CURRENT_DATE) + EXTRACT(DOY FROM c.birthday))::INTEGER
  END AS days_until_birthday
FROM contacts c
WHERE c.birthday IS NOT NULL AND c.is_archived = FALSE
ORDER BY days_until_birthday;

-- View: Kontakte die Aufmerksamkeit brauchen (keine Interaktion in 30+ Tagen)
CREATE OR REPLACE VIEW contacts_needing_attention AS
SELECT
  c.*,
  EXTRACT(DAY FROM NOW() - c.last_interaction_at)::INTEGER AS days_since_interaction
FROM contacts c
WHERE c.is_archived = FALSE
  AND (c.last_interaction_at IS NULL OR c.last_interaction_at < NOW() - INTERVAL '30 days')
ORDER BY c.last_interaction_at NULLS FIRST;

-- View: Kontakte mit Stats für UI
CREATE OR REPLACE VIEW contacts_with_stats AS
SELECT
  c.*,
  get_relationship_xp_for_level(c.relationship_level) AS xp_for_next_level,
  CASE
    WHEN get_relationship_xp_for_level(c.relationship_level) > 0
    THEN ROUND((c.current_xp::NUMERIC / get_relationship_xp_for_level(c.relationship_level)) * 100)
    ELSE 0
  END AS progress_percent,
  CASE
    WHEN c.birthday IS NOT NULL THEN
      CASE
        WHEN EXTRACT(DOY FROM c.birthday) >= EXTRACT(DOY FROM CURRENT_DATE)
        THEN (EXTRACT(DOY FROM c.birthday) - EXTRACT(DOY FROM CURRENT_DATE))::INTEGER
        ELSE (365 - EXTRACT(DOY FROM CURRENT_DATE) + EXTRACT(DOY FROM c.birthday))::INTEGER
      END
    ELSE NULL
  END AS days_until_birthday,
  CASE
    WHEN c.last_interaction_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM NOW() - c.last_interaction_at)::INTEGER
  END AS days_since_interaction,
  (c.last_interaction_at IS NULL OR c.last_interaction_at < NOW() - INTERVAL '30 days') AS needs_attention
FROM contacts c;
