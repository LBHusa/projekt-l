-- Projekt L - Skill Hierarchy Enhancement
-- Adds depth tracking for 5-level skill hierarchy

-- ============================================
-- 1. ADD DEPTH COLUMN TO SKILLS
-- ============================================
ALTER TABLE skills ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 1;

-- Update existing skills to have correct depth based on parent
-- First, set all root skills (no parent) to depth 1
UPDATE skills SET depth = 1 WHERE parent_skill_id IS NULL;

-- For skills with parents, we need to calculate depth recursively
-- This is a one-time fix for existing data
WITH RECURSIVE skill_depths AS (
  -- Base case: root skills have depth 1
  SELECT id, parent_skill_id, 1 as calculated_depth
  FROM skills
  WHERE parent_skill_id IS NULL

  UNION ALL

  -- Recursive case: child skills have parent depth + 1
  SELECT s.id, s.parent_skill_id, sd.calculated_depth + 1
  FROM skills s
  INNER JOIN skill_depths sd ON s.parent_skill_id = sd.id
)
UPDATE skills
SET depth = skill_depths.calculated_depth
FROM skill_depths
WHERE skills.id = skill_depths.id;

-- ============================================
-- 2. INDEX FOR HIERARCHICAL QUERIES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_skills_depth ON skills(depth);

-- ============================================
-- 3. FUNCTION TO AUTO-CALCULATE DEPTH ON INSERT/UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION calculate_skill_depth()
RETURNS TRIGGER AS $$
DECLARE
  parent_depth INTEGER;
BEGIN
  -- If no parent, depth is 1
  IF NEW.parent_skill_id IS NULL THEN
    NEW.depth := 1;
  ELSE
    -- Get parent's depth and add 1
    SELECT depth INTO parent_depth
    FROM skills
    WHERE id = NEW.parent_skill_id;

    -- If parent not found (shouldn't happen due to FK), default to 1
    IF parent_depth IS NULL THEN
      NEW.depth := 1;
    ELSE
      NEW.depth := parent_depth + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. TRIGGER FOR AUTOMATIC DEPTH CALCULATION
-- ============================================
DROP TRIGGER IF EXISTS skill_depth_trigger ON skills;

CREATE TRIGGER skill_depth_trigger
  BEFORE INSERT OR UPDATE OF parent_skill_id ON skills
  FOR EACH ROW
  EXECUTE FUNCTION calculate_skill_depth();

-- ============================================
-- 5. FUNCTION TO GET SKILL ANCESTORS (for breadcrumb)
-- ============================================
CREATE OR REPLACE FUNCTION get_skill_ancestors(skill_uuid UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  icon TEXT,
  depth INTEGER
) AS $$
WITH RECURSIVE ancestors AS (
  -- Start with the skill's parent
  SELECT s.id, s.name, s.icon, s.depth, s.parent_skill_id
  FROM skills s
  WHERE s.id = (SELECT parent_skill_id FROM skills WHERE id = skill_uuid)

  UNION ALL

  -- Get each ancestor's parent
  SELECT s.id, s.name, s.icon, s.depth, s.parent_skill_id
  FROM skills s
  INNER JOIN ancestors a ON s.id = a.parent_skill_id
)
SELECT ancestors.id, ancestors.name, ancestors.icon, ancestors.depth
FROM ancestors
ORDER BY ancestors.depth ASC;
$$ LANGUAGE sql STABLE;

-- ============================================
-- 6. UPDATE VIEW TO INCLUDE DEPTH
-- ============================================
DROP VIEW IF EXISTS skills_with_domain CASCADE;

CREATE VIEW skills_with_domain AS
SELECT
  s.*,
  d.name as domain_name,
  d.icon as domain_icon,
  d.color as domain_color
FROM skills s
JOIN skill_domains d ON s.domain_id = d.id;
