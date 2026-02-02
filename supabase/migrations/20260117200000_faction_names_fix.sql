-- ============================================
-- PHASE 0: Faction Names Fix
-- hobbys → hobby, weisheit → wissen
-- geist name_de → "Geist & Seele"
-- ============================================

-- 1. Update geist name and description
UPDATE factions SET
  name = 'Mind & Soul',
  name_de = 'Geist & Seele',
  description = 'Mentale Gesundheit, Achtsamkeit und Spiritualitaet'
WHERE id = 'geist';

-- 2. Rename hobbys → hobby
-- First insert new faction
INSERT INTO factions (id, name, name_de, description, icon, color, display_order)
SELECT 'hobby', name, name_de, description, icon, color, display_order
FROM factions WHERE id = 'hobbys'
ON CONFLICT (id) DO NOTHING;

-- Update all references
UPDATE user_faction_stats SET faction_id = 'hobby' WHERE faction_id = 'hobbys';
UPDATE experiences SET faction_id = 'hobby' WHERE faction_id = 'hobbys';
UPDATE skill_domains SET faction_key = 'hobby' WHERE faction_key = 'hobbys';
UPDATE habits SET faction_id = 'hobby' WHERE faction_id = 'hobbys';
-- UPDATE activities SET faction_id = 'hobby' WHERE faction_id = 'hobbys'; -- Table doesn't exist

-- Delete old faction
DELETE FROM factions WHERE id = 'hobbys';

-- 3. Rename weisheit → wissen
-- First insert new faction
INSERT INTO factions (id, name, name_de, description, icon, color, display_order)
SELECT 'wissen', 'Knowledge', 'Wissen', description, icon, color, display_order
FROM factions WHERE id = 'weisheit'
ON CONFLICT (id) DO NOTHING;

-- Update all references
UPDATE user_faction_stats SET faction_id = 'wissen' WHERE faction_id = 'weisheit';
UPDATE experiences SET faction_id = 'wissen' WHERE faction_id = 'weisheit';
UPDATE skill_domains SET faction_key = 'wissen' WHERE faction_key = 'weisheit';
UPDATE habits SET faction_id = 'wissen' WHERE faction_id = 'weisheit';
-- UPDATE activities SET faction_id = 'wissen' WHERE faction_id = 'weisheit'; -- Table doesn't exist

-- Delete old faction
DELETE FROM factions WHERE id = 'weisheit';

-- 4. Verify final state
-- SELECT id, name_de FROM factions ORDER BY display_order;
-- Should return: karriere, hobby, koerper, geist, finanzen, soziales, wissen
