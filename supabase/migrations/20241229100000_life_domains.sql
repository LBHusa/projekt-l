-- Migration: Add faction_key column for life balance mapping
-- Date: 2024-12-29
-- Description: Add faction_key column to map domains to factions
-- Note: Domain data (including new life domains) is handled by seed.sql

-- Add faction_key column to skill_domains
ALTER TABLE skill_domains ADD COLUMN IF NOT EXISTS faction_key TEXT;

COMMENT ON COLUMN skill_domains.faction_key IS
  'Maps this domain to a faction for life balance calculation. Values: karriere, familie, hobbys, fitness, lernen, freunde, finanzen';
