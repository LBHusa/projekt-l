-- ============================================
-- PHASE 1: N:M Skill Domain Factions
-- ============================================

-- 1. Create N:M junction table
CREATE TABLE IF NOT EXISTS skill_domain_factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES skill_domains(id) ON DELETE CASCADE,
  faction_id TEXT NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  weight INTEGER DEFAULT 100 CHECK (weight >= 0 AND weight <= 100),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain_id, faction_id)
);

-- 2. Create user domain activations table
CREATE TABLE IF NOT EXISTS user_domain_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  domain_id UUID NOT NULL REFERENCES skill_domains(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  custom_weights JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, domain_id)
);

-- 3. Add columns to skill_domains
ALTER TABLE skill_domains 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- 4. Trigger to ensure only 1 primary per domain
CREATE OR REPLACE FUNCTION ensure_single_primary_faction()
RETURNS TRIGGER AS 44922
BEGIN
  IF NEW.is_primary THEN
    UPDATE skill_domain_factions
    SET is_primary = false
    WHERE domain_id = NEW.domain_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
44922 LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_primary_faction ON skill_domain_factions;
CREATE TRIGGER trigger_single_primary_faction
  BEFORE INSERT OR UPDATE ON skill_domain_factions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_faction();

-- 5. Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_skill_domain_factions_updated_at()
RETURNS TRIGGER AS 44922
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
44922 LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_skill_domain_factions_updated_at ON skill_domain_factions;
CREATE TRIGGER trigger_skill_domain_factions_updated_at
  BEFORE UPDATE ON skill_domain_factions
  FOR EACH ROW
  EXECUTE FUNCTION update_skill_domain_factions_updated_at();

-- 6. RLS Policies
ALTER TABLE skill_domain_factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_domain_activations ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated
CREATE POLICY "skill_domain_factions_read" ON skill_domain_factions
  FOR SELECT USING (true);

-- Write access for domain creators or system
CREATE POLICY "skill_domain_factions_write" ON skill_domain_factions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM skill_domains sd
      WHERE sd.id = domain_id
      AND (sd.created_by = auth.uid() OR sd.created_by IS NULL)
    )
  );

-- User domain activations - users can only access their own
CREATE POLICY "user_domain_activations_own" ON user_domain_activations
  FOR ALL USING (user_id = auth.uid());

-- 7. Helper function to get weighted XP distribution
CREATE OR REPLACE FUNCTION get_domain_faction_weights(p_domain_id UUID)
RETURNS TABLE(faction_id TEXT, weight INTEGER, is_primary BOOLEAN) AS 44922
BEGIN
  RETURN QUERY
  SELECT sdf.faction_id, sdf.weight, sdf.is_primary
  FROM skill_domain_factions sdf
  WHERE sdf.domain_id = p_domain_id
  ORDER BY sdf.is_primary DESC, sdf.weight DESC;
END;
44922 LANGUAGE plpgsql;

-- 8. Helper function to distribute XP to factions
CREATE OR REPLACE FUNCTION distribute_xp_to_factions(
  p_domain_id UUID,
  p_xp_amount INTEGER,
  p_user_id UUID
)
RETURNS TABLE(faction_id TEXT, xp_distributed INTEGER) AS 44922
DECLARE
  v_total_weight INTEGER;
  v_faction RECORD;
BEGIN
  -- Get total weight
  SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
  FROM skill_domain_factions
  WHERE domain_id = p_domain_id;
  
  IF v_total_weight = 0 THEN
    RETURN;
  END IF;
  
  -- Distribute XP proportionally
  FOR v_faction IN
    SELECT sdf.faction_id, sdf.weight
    FROM skill_domain_factions sdf
    WHERE sdf.domain_id = p_domain_id
  LOOP
    faction_id := v_faction.faction_id;
    xp_distributed := ROUND((p_xp_amount * v_faction.weight)::NUMERIC / v_total_weight);
    
    -- Update faction stats
    INSERT INTO user_faction_stats (user_id, faction_id, total_xp, level)
    VALUES (p_user_id, v_faction.faction_id, xp_distributed, 1)
    ON CONFLICT (user_id, faction_id)
    DO UPDATE SET
      total_xp = user_faction_stats.total_xp + xp_distributed,
      level = GREATEST(1, FLOOR(SQRT((user_faction_stats.total_xp + xp_distributed) / 100.0)) + 1)::INTEGER;
    
    RETURN NEXT;
  END LOOP;
END;
44922 LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_domain_factions_domain ON skill_domain_factions(domain_id);
CREATE INDEX IF NOT EXISTS idx_skill_domain_factions_faction ON skill_domain_factions(faction_id);
CREATE INDEX IF NOT EXISTS idx_user_domain_activations_user ON user_domain_activations(user_id);
