-- ============================================
-- Migration: Aufmerksamkeit unterdrücken pro Kontakt
-- Projekt L
-- Date: 2024-12-28
-- ============================================

-- 1. Views droppen (müssen neu erstellt werden wegen Column-Änderung)
DROP VIEW IF EXISTS contacts_needing_attention;
DROP VIEW IF EXISTS contacts_with_stats;
DROP VIEW IF EXISTS contacts_upcoming_birthdays;

-- 2. Neue Spalte hinzufügen
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS suppress_attention_reminder BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN contacts.suppress_attention_reminder IS 'Wenn true, erscheint dieser Kontakt nicht in "braucht Aufmerksamkeit"';

-- 3. Views neu erstellen mit der neuen Spalte

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
  AND c.suppress_attention_reminder = FALSE  -- NEU: Unterdrückte ignorieren
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
  -- NEU: needs_attention respektiert suppress_attention_reminder
  CASE
    WHEN c.suppress_attention_reminder = TRUE THEN FALSE
    ELSE (c.last_interaction_at IS NULL OR c.last_interaction_at < NOW() - INTERVAL '30 days')
  END AS needs_attention
FROM contacts c;
