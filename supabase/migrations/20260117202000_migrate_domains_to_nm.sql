-- ============================================
-- PHASE 2: Migrate existing domains to N:M
-- ============================================

-- Migrate existing faction_key to skill_domain_factions with smart defaults
DO $$
DECLARE
  v_domain RECORD;
  v_coding_domain_id UUID;
  v_labor_domain_id UUID;
  v_seele_domain_id UUID;
  v_fitness_domain_id UUID;
BEGIN
  -- For each domain with a faction_key, create the primary entry
  FOR v_domain IN
    SELECT id, name, faction_key
    FROM skill_domains
    WHERE faction_key IS NOT NULL
  LOOP
    -- Insert primary faction mapping
    INSERT INTO skill_domain_factions (domain_id, faction_id, weight, is_primary)
    VALUES (v_domain.id, v_domain.faction_key, 100, true)
    ON CONFLICT (domain_id, faction_id) DO NOTHING;
  END LOOP;

  -- SMART DEFAULTS: Add secondary factions with weights

  -- CODING Domain: 60% Karriere (primary), 25% Hobby, 15% Wissen
  SELECT id INTO v_coding_domain_id FROM skill_domains WHERE LOWER(name) LIKE '%coding%' OR LOWER(name) LIKE '%programmier%' LIMIT 1;
  IF v_coding_domain_id IS NOT NULL THEN
    UPDATE skill_domain_factions SET weight = 60 WHERE domain_id = v_coding_domain_id AND is_primary = true;
    INSERT INTO skill_domain_factions (domain_id, faction_id, weight, is_primary)
    VALUES 
      (v_coding_domain_id, 'hobby', 25, false),
      (v_coding_domain_id, 'wissen', 15, false)
    ON CONFLICT (domain_id, faction_id) DO NOTHING;
  END IF;

  -- LABOR Domain: 70% Karriere, 30% Wissen
  SELECT id INTO v_labor_domain_id FROM skill_domains WHERE LOWER(name) LIKE '%labor%' LIMIT 1;
  IF v_labor_domain_id IS NOT NULL THEN
    UPDATE skill_domain_factions SET weight = 70 WHERE domain_id = v_labor_domain_id AND is_primary = true;
    INSERT INTO skill_domain_factions (domain_id, faction_id, weight, is_primary)
    VALUES (v_labor_domain_id, 'wissen', 30, false)
    ON CONFLICT (domain_id, faction_id) DO NOTHING;
  END IF;

  -- SEELE/GEIST Domain: 80% Geist, 20% Koerper
  SELECT id INTO v_seele_domain_id FROM skill_domains WHERE LOWER(name) LIKE '%seele%' OR LOWER(name) LIKE '%meditation%' LIMIT 1;
  IF v_seele_domain_id IS NOT NULL THEN
    UPDATE skill_domain_factions SET weight = 80 WHERE domain_id = v_seele_domain_id AND is_primary = true;
    INSERT INTO skill_domain_factions (domain_id, faction_id, weight, is_primary)
    VALUES (v_seele_domain_id, 'koerper', 20, false)
    ON CONFLICT (domain_id, faction_id) DO NOTHING;
  END IF;

  -- FITNESS Domain: 70% Koerper, 20% Geist, 10% Hobby
  SELECT id INTO v_fitness_domain_id FROM skill_domains WHERE LOWER(name) LIKE '%fitness%' OR LOWER(name) LIKE '%sport%' LIMIT 1;
  IF v_fitness_domain_id IS NOT NULL THEN
    UPDATE skill_domain_factions SET weight = 70 WHERE domain_id = v_fitness_domain_id AND is_primary = true;
    INSERT INTO skill_domain_factions (domain_id, faction_id, weight, is_primary)
    VALUES 
      (v_fitness_domain_id, 'geist', 20, false),
      (v_fitness_domain_id, 'hobby', 10, false)
    ON CONFLICT (domain_id, faction_id) DO NOTHING;
  END IF;

  -- Mark all seed domains as templates
  UPDATE skill_domains SET is_template = true WHERE created_by IS NULL;
END $$;

-- Verify migration
-- SELECT sd.name, sdf.faction_id, sdf.weight, sdf.is_primary
-- FROM skill_domains sd
-- JOIN skill_domain_factions sdf ON sd.id = sdf.domain_id
-- ORDER BY sd.name, sdf.is_primary DESC;
