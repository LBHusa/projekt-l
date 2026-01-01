-- ============================================
-- Projekt L - Habit Multi-Faction Support
-- Migration: 20250131_001_habit_multi_faction.sql
-- ============================================
-- Ermöglicht, dass ein Habit mehrere Factions beeinflussen kann
-- z.B. "Joggen" → koerper (80%) + geist (20%)
-- ============================================

-- 1. JUNCTION TABLE: habit_factions
-- ============================================
CREATE TABLE IF NOT EXISTS habit_factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,

  -- XP-Verteilung: wie viel % der Habit-XP geht an diese Faction
  -- Summe aller weight für einen Habit sollte 100 ergeben
  weight INTEGER NOT NULL DEFAULT 100 CHECK (weight > 0 AND weight <= 100),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ein Habit kann jede Faction nur einmal haben
  UNIQUE(habit_id, faction_id)
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_habit_factions_habit ON habit_factions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_factions_faction ON habit_factions(faction_id);

-- 2. MIGRATE EXISTING DATA
-- ============================================
-- Bestehende habits.faction_id → habit_factions migrieren
INSERT INTO habit_factions (habit_id, faction_id, weight)
SELECT id, faction_id, 100
FROM habits
WHERE faction_id IS NOT NULL
ON CONFLICT (habit_id, faction_id) DO NOTHING;

-- 3. HELPER FUNCTION: Get Habit Factions
-- ============================================
CREATE OR REPLACE FUNCTION get_habit_factions(p_habit_id UUID)
RETURNS TABLE(
  faction_id TEXT,
  faction_name TEXT,
  faction_icon TEXT,
  faction_color TEXT,
  weight INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name_de,
    f.icon,
    f.color,
    hf.weight
  FROM habit_factions hf
  JOIN factions f ON f.id = hf.faction_id
  WHERE hf.habit_id = p_habit_id
  ORDER BY hf.weight DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. HELPER FUNCTION: Distribute Habit XP to Factions
-- ============================================
-- Verteilt XP eines Habits auf alle zugeordneten Factions nach weight
CREATE OR REPLACE FUNCTION distribute_habit_xp_to_factions(
  p_user_id UUID,
  p_habit_id UUID,
  p_total_xp INTEGER
)
RETURNS void AS $$
DECLARE
  r RECORD;
  faction_xp INTEGER;
BEGIN
  FOR r IN
    SELECT faction_id, weight
    FROM habit_factions
    WHERE habit_id = p_habit_id
  LOOP
    -- Berechne anteilige XP basierend auf weight
    faction_xp := ROUND((p_total_xp * r.weight)::numeric / 100);

    -- Update faction stats (nutzt existierende Funktion)
    IF faction_xp > 0 THEN
      PERFORM update_faction_stats(p_user_id, r.faction_id, faction_xp);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. VIEW: Habits with Factions
-- ============================================
CREATE OR REPLACE VIEW habits_with_factions AS
SELECT
  h.*,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'faction_id', hf.faction_id,
      'faction_name', f.name_de,
      'faction_icon', f.icon,
      'faction_color', f.color,
      'weight', hf.weight
    ) ORDER BY hf.weight DESC)
    FROM habit_factions hf
    JOIN factions f ON f.id = hf.faction_id
    WHERE hf.habit_id = h.id),
    '[]'::json
  ) as factions
FROM habits h;

-- 6. OPTIONAL: Keep faction_id for backwards compatibility
-- ============================================
-- Wir behalten habits.faction_id als "primary faction" für einfache Queries
-- Wird automatisch auf die Faction mit höchstem weight gesetzt

CREATE OR REPLACE FUNCTION sync_habit_primary_faction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update habits.faction_id mit der Faction mit höchstem weight
  UPDATE habits
  SET faction_id = (
    SELECT faction_id
    FROM habit_factions
    WHERE habit_id = NEW.habit_id
    ORDER BY weight DESC
    LIMIT 1
  )
  WHERE id = NEW.habit_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS habit_factions_sync ON habit_factions;
CREATE TRIGGER habit_factions_sync
  AFTER INSERT OR UPDATE OR DELETE ON habit_factions
  FOR EACH ROW
  EXECUTE FUNCTION sync_habit_primary_faction();

-- ============================================
-- END MIGRATION
-- ============================================
