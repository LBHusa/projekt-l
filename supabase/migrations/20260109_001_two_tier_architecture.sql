-- ============================================
-- Projekt L - Two-Tier Architecture Migration
-- Migration: 20260109_001_two_tier_architecture.sql
-- ============================================
-- Implements the two-tier system: Factions (7 fixed) + Domains (custom)
-- with Hybrid-Mapping and XP-Flow: Skill → Domain → Faction(s)
-- ============================================

-- 1. SKILL_FACTION_MAPPING TABLE
-- ============================================
-- Allows flexible mapping of skills to one or multiple factions
-- Supports both default mappings (per domain) and custom overrides (per skill)

CREATE TABLE IF NOT EXISTS skill_faction_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1.0),
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, faction_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_skill_faction_mapping_skill ON skill_faction_mapping(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_faction_mapping_faction ON skill_faction_mapping(faction_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS skill_faction_mapping_updated ON skill_faction_mapping;
CREATE TRIGGER skill_faction_mapping_updated
  BEFORE UPDATE ON skill_faction_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE skill_faction_mapping IS 'Maps skills to factions with weights for XP distribution. Supports hybrid mapping (default + custom overrides).';
COMMENT ON COLUMN skill_faction_mapping.weight IS 'Percentage of XP that goes to this faction (0.0-1.0). Multiple mappings per skill must sum to 1.0.';
COMMENT ON COLUMN skill_faction_mapping.is_default IS 'TRUE if this is the default mapping from domain, FALSE if custom override for specific skill.';

-- 2. POPULATE DEFAULT MAPPINGS FROM DOMAINS
-- ============================================
-- Create default skill->faction mappings based on domain's faction_key

INSERT INTO skill_faction_mapping (skill_id, faction_id, weight, is_default)
SELECT
  s.id AS skill_id,
  sd.faction_key AS faction_id,
  1.0 AS weight,
  TRUE AS is_default
FROM skills s
JOIN skill_domains sd ON s.domain_id = sd.id
WHERE sd.faction_key IS NOT NULL
ON CONFLICT (skill_id, faction_id) DO NOTHING;

-- 3. XP DISTRIBUTION FUNCTION
-- ============================================
-- Distributes XP from a skill to its mapped faction(s)
-- Respects weight distribution for multi-faction skills

CREATE OR REPLACE FUNCTION distribute_xp_to_factions(
  p_user_id UUID,
  p_skill_id UUID,
  p_xp_amount INTEGER,
  p_faction_override TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_mapping RECORD;
  v_faction_xp INTEGER;
BEGIN
  -- If faction_override is provided, only distribute to that faction
  IF p_faction_override IS NOT NULL THEN
    PERFORM update_faction_stats(p_user_id, p_faction_override, p_xp_amount);
    RETURN;
  END IF;

  -- Otherwise, distribute according to skill_faction_mapping
  FOR v_mapping IN
    SELECT faction_id, weight
    FROM skill_faction_mapping
    WHERE skill_id = p_skill_id
  LOOP
    v_faction_xp := FLOOR(p_xp_amount * v_mapping.weight);

    -- Only distribute if XP > 0
    IF v_faction_xp > 0 THEN
      PERFORM update_faction_stats(p_user_id, v_mapping.faction_id, v_faction_xp);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION distribute_xp_to_factions IS 'Distributes XP from a skill to its mapped faction(s) based on weights. Supports faction_override for manual selection.';

-- 4. AUTO-DISTRIBUTE XP ON EXPERIENCE INSERT
-- ============================================
-- Trigger function that automatically distributes XP to factions
-- when a new experience is logged

CREATE OR REPLACE FUNCTION auto_distribute_experience_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Distribute XP to factions (respects faction_id override if set)
  PERFORM distribute_xp_to_factions(
    NEW.user_id,
    NEW.skill_id,
    NEW.xp_gained,
    NEW.faction_id  -- Will be NULL if not overridden
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on experiences table
DROP TRIGGER IF EXISTS experience_xp_distribution ON experiences;
CREATE TRIGGER experience_xp_distribution
  AFTER INSERT ON experiences
  FOR EACH ROW
  EXECUTE FUNCTION auto_distribute_experience_xp();

COMMENT ON FUNCTION auto_distribute_experience_xp IS 'Trigger function that automatically distributes XP to factions when an experience is logged.';

-- 5. HELPER FUNCTION: GET SKILL FACTION MAPPINGS
-- ============================================
-- Retrieve all faction mappings for a skill

CREATE OR REPLACE FUNCTION get_skill_faction_mappings(p_skill_id UUID)
RETURNS TABLE(
  faction_id TEXT,
  faction_name TEXT,
  faction_icon TEXT,
  weight DECIMAL(3,2),
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sfm.faction_id,
    f.name AS faction_name,
    f.icon AS faction_icon,
    sfm.weight,
    sfm.is_default
  FROM skill_faction_mapping sfm
  JOIN factions f ON sfm.faction_id = f.id
  WHERE sfm.skill_id = p_skill_id
  ORDER BY sfm.weight DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_skill_faction_mappings IS 'Returns all faction mappings for a given skill with faction details.';

-- 6. HELPER FUNCTION: UPDATE SKILL FACTION MAPPING
-- ============================================
-- Updates or creates a custom faction mapping for a skill

CREATE OR REPLACE FUNCTION set_skill_faction_mapping(
  p_skill_id UUID,
  p_faction_id TEXT,
  p_weight DECIMAL(3,2) DEFAULT 1.0
)
RETURNS void AS $$
BEGIN
  -- Delete old mappings if weight = 1.0 (single faction mapping)
  IF p_weight = 1.0 THEN
    DELETE FROM skill_faction_mapping WHERE skill_id = p_skill_id;
  END IF;

  -- Insert or update the mapping
  INSERT INTO skill_faction_mapping (skill_id, faction_id, weight, is_default)
  VALUES (p_skill_id, p_faction_id, p_weight, FALSE)
  ON CONFLICT (skill_id, faction_id)
  DO UPDATE SET
    weight = EXCLUDED.weight,
    is_default = FALSE,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_skill_faction_mapping IS 'Creates or updates a custom faction mapping for a skill. Set weight=1.0 to replace all mappings.';

-- 7. VALIDATION: CHECK MAPPING WEIGHTS SUM TO 1.0
-- ============================================
-- Constraint function to ensure weights per skill sum to 1.0

CREATE OR REPLACE FUNCTION validate_skill_faction_weights()
RETURNS TRIGGER AS $$
DECLARE
  v_total_weight DECIMAL(3,2);
BEGIN
  -- Calculate total weight for this skill
  SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
  FROM skill_faction_mapping
  WHERE skill_id = NEW.skill_id;

  -- Allow slight floating point tolerance (0.99 - 1.01)
  IF v_total_weight < 0.99 OR v_total_weight > 1.01 THEN
    RAISE EXCEPTION 'Total weight for skill % must sum to 1.0 (current: %)', NEW.skill_id, v_total_weight;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create constraint trigger (runs after all row operations)
DROP TRIGGER IF EXISTS check_skill_faction_weights ON skill_faction_mapping;
CREATE CONSTRAINT TRIGGER check_skill_faction_weights
  AFTER INSERT OR UPDATE ON skill_faction_mapping
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION validate_skill_faction_weights();

COMMENT ON FUNCTION validate_skill_faction_weights IS 'Validates that faction mapping weights for a skill sum to 1.0 (with 1% tolerance).';

-- ============================================
-- END MIGRATION
-- ============================================
--
-- USAGE EXAMPLES:
--
-- 1. Get faction mappings for a skill:
--    SELECT * FROM get_skill_faction_mappings('skill-uuid');
--
-- 2. Set custom mapping (single faction):
--    SELECT set_skill_faction_mapping('skill-uuid', 'karriere', 1.0);
--
-- 3. Set custom mapping (split across two factions):
--    SELECT set_skill_faction_mapping('skill-uuid', 'karriere', 0.7);
--    SELECT set_skill_faction_mapping('skill-uuid', 'hobbys', 0.3);
--
-- 4. Log experience (auto-distributes to factions):
--    INSERT INTO experiences (user_id, skill_id, description, xp_gained)
--    VALUES ('user-uuid', 'skill-uuid', 'Completed task', 100);
--
-- 5. Log experience with faction override:
--    INSERT INTO experiences (user_id, skill_id, description, xp_gained, faction_id)
--    VALUES ('user-uuid', 'skill-uuid', 'Special task', 100, 'karriere');
--
-- ============================================
