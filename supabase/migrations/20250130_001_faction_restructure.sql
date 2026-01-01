-- ============================================
-- Projekt L - Faction Restructure Migration
-- Migration: 20250130_001_faction_restructure.sql
-- ============================================
-- OLD: karriere, familie, hobbys, gesundheit, lernen, freunde, finanzen
-- NEW: karriere, hobbys, koerper, geist, finanzen, soziales, weisheit
-- ============================================

-- 1. BACKUP CURRENT DATA (for rollback if needed)
-- ============================================
CREATE TEMP TABLE IF NOT EXISTS backup_user_faction_stats AS
SELECT * FROM user_faction_stats;

CREATE TEMP TABLE IF NOT EXISTS backup_experiences_factions AS
SELECT id, faction_id FROM experiences WHERE faction_id IS NOT NULL;

CREATE TEMP TABLE IF NOT EXISTS backup_habits_factions AS
SELECT id, faction_id FROM habits WHERE faction_id IS NOT NULL;

CREATE TEMP TABLE IF NOT EXISTS backup_activity_log_factions AS
SELECT id, faction_id FROM activity_log WHERE faction_id IS NOT NULL;

-- 2. ADD NEW FACTIONS
-- ============================================
INSERT INTO factions (id, name, name_de, icon, color, description, display_order) VALUES
  ('koerper', 'Body', 'Koerper', '🏃', '#10B981', 'Fitness und koerperliches Wohlbefinden', 3),
  ('geist', 'Mind', 'Geist', '🧠', '#8B5CF6', 'Mentale Gesundheit und Achtsamkeit', 4),
  ('soziales', 'Social', 'Soziales', '👥', '#EC4899', 'Familie, Freunde und soziale Kontakte', 6),
  ('weisheit', 'Wisdom', 'Weisheit', '📚', '#F59E0B', 'Bildung und Wissensaufbau', 7)
ON CONFLICT (id) DO NOTHING;

-- 3. MIGRATE USER_FACTION_STATS
-- ============================================

-- Step 3a: gesundheit -> koerper
UPDATE user_faction_stats
SET faction_id = 'koerper'
WHERE faction_id = 'gesundheit';

-- Step 3b: lernen -> weisheit
UPDATE user_faction_stats
SET faction_id = 'weisheit'
WHERE faction_id = 'lernen';

-- Step 3c: familie + freunde -> soziales (merge by adding XP)
-- First, insert merged stats for soziales
INSERT INTO user_faction_stats (user_id, faction_id, total_xp, weekly_xp, monthly_xp, level, last_activity)
SELECT
  user_id,
  'soziales' as faction_id,
  COALESCE(SUM(total_xp), 0) as total_xp,
  COALESCE(SUM(weekly_xp), 0) as weekly_xp,
  COALESCE(SUM(monthly_xp), 0) as monthly_xp,
  1 as level,
  MAX(last_activity) as last_activity
FROM user_faction_stats
WHERE faction_id IN ('familie', 'freunde')
GROUP BY user_id
ON CONFLICT (user_id, faction_id) DO UPDATE SET
  total_xp = user_faction_stats.total_xp + EXCLUDED.total_xp,
  weekly_xp = user_faction_stats.weekly_xp + EXCLUDED.weekly_xp,
  monthly_xp = user_faction_stats.monthly_xp + EXCLUDED.monthly_xp,
  last_activity = GREATEST(user_faction_stats.last_activity, EXCLUDED.last_activity);

-- Update levels for merged soziales using existing function
UPDATE user_faction_stats
SET level = calculate_faction_level(total_xp)
WHERE faction_id = 'soziales';

-- Step 3d: Init geist with 0 for all existing users
INSERT INTO user_faction_stats (user_id, faction_id, total_xp, weekly_xp, monthly_xp, level)
SELECT DISTINCT user_id, 'geist', 0, 0, 0, 1
FROM user_faction_stats
ON CONFLICT (user_id, faction_id) DO NOTHING;

-- Step 3e: Delete old faction entries
DELETE FROM user_faction_stats
WHERE faction_id IN ('gesundheit', 'lernen', 'familie', 'freunde');

-- 4. MIGRATE EXPERIENCES TABLE
-- ============================================
UPDATE experiences SET faction_id = 'koerper' WHERE faction_id = 'gesundheit';
UPDATE experiences SET faction_id = 'weisheit' WHERE faction_id = 'lernen';
UPDATE experiences SET faction_id = 'soziales' WHERE faction_id IN ('familie', 'freunde');

-- 5. MIGRATE HABITS TABLE
-- ============================================
UPDATE habits SET faction_id = 'koerper' WHERE faction_id = 'gesundheit';
UPDATE habits SET faction_id = 'weisheit' WHERE faction_id = 'lernen';
UPDATE habits SET faction_id = 'soziales' WHERE faction_id IN ('familie', 'freunde');

-- 6. MIGRATE ACTIVITY_LOG TABLE
-- ============================================
UPDATE activity_log SET faction_id = 'koerper' WHERE faction_id = 'gesundheit';
UPDATE activity_log SET faction_id = 'weisheit' WHERE faction_id = 'lernen';
UPDATE activity_log SET faction_id = 'soziales' WHERE faction_id IN ('familie', 'freunde');

-- 7. MIGRATE SKILL_DOMAINS.FACTION_KEY
-- ============================================
UPDATE skill_domains SET faction_key = 'koerper' WHERE faction_key = 'gesundheit';
UPDATE skill_domains SET faction_key = 'weisheit' WHERE faction_key = 'lernen';
UPDATE skill_domains SET faction_key = 'soziales' WHERE faction_key IN ('familie', 'freunde');

-- 8. UPDATE DISPLAY ORDER FOR ALL FACTIONS
-- ============================================
UPDATE factions SET display_order = 1 WHERE id = 'karriere';
UPDATE factions SET display_order = 2 WHERE id = 'hobbys';
UPDATE factions SET display_order = 3 WHERE id = 'koerper';
UPDATE factions SET display_order = 4 WHERE id = 'geist';
UPDATE factions SET display_order = 5 WHERE id = 'finanzen';
UPDATE factions SET display_order = 6 WHERE id = 'soziales';
UPDATE factions SET display_order = 7 WHERE id = 'weisheit';

-- 9. DELETE OLD FACTIONS
-- ============================================
DELETE FROM factions WHERE id IN ('gesundheit', 'lernen', 'familie', 'freunde');

-- ============================================
-- VERIFICATION QUERIES (for manual check)
-- ============================================
-- SELECT * FROM factions ORDER BY display_order;
-- SELECT faction_id, COUNT(*) FROM user_faction_stats GROUP BY faction_id;
-- SELECT faction_id, COUNT(*) FROM experiences WHERE faction_id IS NOT NULL GROUP BY faction_id;

-- ============================================
-- END MIGRATION
-- ============================================
