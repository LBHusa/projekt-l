-- ============================================
-- Migration: Add Skills to "Seele" Domain
-- Date: 2026-01-10
-- Task: cbc37f6b-eb73-4395-84e0-ba6fd2002267
-- Description: Adds mental/spiritual skills to the Seele domain
-- ============================================

-- ============================================
-- SEELE DOMAIN (ensure it exists)
-- ============================================

-- Insert Seele domain if it doesn't exist
INSERT INTO skill_domains (id, name, icon, color, description, display_order, faction_key) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Seele', '🧘', '#a855f7', 'Mentale Gesundheit und Spiritualität', 11, 'geist')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEELE DOMAIN SKILLS (Mental & Spiritual)
-- ============================================

-- Root-Level Skills für Seele Domain
INSERT INTO skills (id, domain_id, name, icon, description, display_order) VALUES
  -- Meditation & Achtsamkeit
  ('b1000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Meditation', '🧘', 'Meditation und Achtsamkeitspraxis', 1),

  -- Selbstreflexion & Journaling
  ('b1000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Selbstreflexion', '📔', 'Tagebuch und Selbstanalyse', 2),

  -- Emotionale Intelligenz
  ('b1000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Emotionale Intelligenz', '💭', 'Emotionen verstehen und regulieren', 3),

  -- Stressmanagement
  ('b1000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Stressmanagement', '🌊', 'Stressbewältigung und Entspannung', 4),

  -- Persönliches Wachstum
  ('b1000000-0000-0000-0000-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Persönliches Wachstum', '🌱', 'Selbstverbesserung und Entwicklung', 5),

  -- Spiritualität
  ('b1000000-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Spiritualität', '✨', 'Spirituelle Praxis und Bewusstsein', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUB-SKILLS: Meditation
-- ============================================
INSERT INTO skills (id, domain_id, parent_skill_id, name, icon, description, display_order) VALUES
  ('b1100000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000001', 'Atemmeditation', '🌬️', 'Fokussierung auf den Atem', 1),
  ('b1100000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000001', 'Body Scan', '🧍', 'Körperwahrnehmung und -entspannung', 2),
  ('b1100000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000001', 'Achtsamkeit im Alltag', '☕', 'Achtsamkeit bei täglichen Aktivitäten', 3),
  ('b1100000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000001', 'Geführte Meditation', '🎧', 'Meditation mit Anleitung', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUB-SKILLS: Selbstreflexion
-- ============================================
INSERT INTO skills (id, domain_id, parent_skill_id, name, icon, description, display_order) VALUES
  ('b1200000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000002', 'Tägliches Journaling', '✍️', 'Regelmäßiges Tagebuch führen', 1),
  ('b1200000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000002', 'Dankbarkeitspraxis', '🙏', 'Dankbarkeit kultivieren', 2),
  ('b1200000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000002', 'Ziele setzen', '🎯', 'Persönliche Ziele definieren', 3),
  ('b1200000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000002', 'Selbstanalyse', '🔍', 'Muster und Verhalten verstehen', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUB-SKILLS: Emotionale Intelligenz
-- ============================================
INSERT INTO skills (id, domain_id, parent_skill_id, name, icon, description, display_order) VALUES
  ('b1300000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000003', 'Emotionen erkennen', '🎭', 'Eigene Emotionen identifizieren', 1),
  ('b1300000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000003', 'Emotionsregulation', '🧊', 'Emotionen gesund verarbeiten', 2),
  ('b1300000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000003', 'Empathie', '❤️‍🩹', 'Mitgefühl für andere entwickeln', 3),
  ('b1300000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000003', 'Konfliktlösung', '🤝', 'Konstruktiv mit Konflikten umgehen', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUB-SKILLS: Stressmanagement
-- ============================================
INSERT INTO skills (id, domain_id, parent_skill_id, name, icon, description, display_order) VALUES
  ('b1400000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000004', 'Progressive Muskelentspannung', '💆', 'PMR Entspannungstechnik', 1),
  ('b1400000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000004', 'Zeitmanagement', '⏰', 'Prioritäten setzen und organisieren', 2),
  ('b1400000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000004', 'Grenzen setzen', '🛡️', 'Nein sagen lernen', 3),
  ('b1400000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000004', 'Pausen machen', '☕', 'Regelmäßige Erholung', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUB-SKILLS: Persönliches Wachstum
-- ============================================
INSERT INTO skills (id, domain_id, parent_skill_id, name, icon, description, display_order) VALUES
  ('b1500000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000005', 'Gewohnheiten ändern', '🔄', 'Neue Routinen etablieren', 1),
  ('b1500000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000005', 'Selbstdisziplin', '💪', 'Willensstärke entwickeln', 2),
  ('b1500000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000005', 'Kreativität', '🎨', 'Kreative Fähigkeiten entfalten', 3),
  ('b1500000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b1000000-0000-0000-0000-000000000005', 'Komfortzone verlassen', '🚀', 'Neue Herausforderungen annehmen', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SKILL CONNECTIONS (Synergien zwischen Skills)
-- ============================================
INSERT INTO skill_connections (skill_a_id, skill_b_id, connection_type, strength) VALUES
  -- Meditation <-> Stressmanagement (synergy)
  ('b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'synergy', 9),

  -- Selbstreflexion <-> Emotionale Intelligenz (synergy)
  ('b1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'synergy', 8),

  -- Emotionale Intelligenz <-> Persönliches Wachstum (synergy)
  ('b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 'synergy', 7),

  -- Meditation <-> Spiritualität (prerequisite)
  ('b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000006', 'prerequisite', 6),

  -- Selbstreflexion <-> Persönliches Wachstum (synergy)
  ('b1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005', 'synergy', 9),

  -- Stressmanagement <-> Emotionale Intelligenz (synergy)
  ('b1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 'synergy', 7)
ON CONFLICT (skill_a_id, skill_b_id) DO NOTHING;

-- ============================================
-- COMMENTS & DOCUMENTATION
-- ============================================
COMMENT ON COLUMN skills.id IS 'UUID for skill. Seele domain skills use s1xxxxxx pattern';

-- ============================================
-- END MIGRATION
-- ============================================
