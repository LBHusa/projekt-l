-- ============================================
-- Migration: Add factions & mental_stats to user_profiles
-- PRD Section 2.15: Factions & Lebensbereiche
-- PRD Section 2.14: Mentale Stats (Seele & Kopf)
-- ============================================

-- Add factions JSONB column (Life Balance)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS factions JSONB DEFAULT '{
  "karriere": 50,
  "familie": 50,
  "hobbys": 50,
  "fitness": 50,
  "lernen": 50,
  "freunde": 50,
  "finanzen": 50
}'::jsonb;

-- Add mental_stats JSONB column (Seele & Kopf)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS mental_stats JSONB DEFAULT '{
  "stimmung": 50,
  "motivation": 50,
  "stress": 50,
  "fokus": 50,
  "kreativitaet": 50,
  "soziale_batterie": 50
}'::jsonb;

-- Update test user with sample data (PRD example values)
UPDATE user_profiles
SET
  factions = '{
    "karriere": 78,
    "familie": 72,
    "hobbys": 65,
    "fitness": 52,
    "lernen": 80,
    "freunde": 63,
    "finanzen": 70
  }'::jsonb,
  mental_stats = '{
    "stimmung": 78,
    "motivation": 62,
    "stress": 38,
    "fokus": 71,
    "kreativitaet": 55,
    "soziale_batterie": 58
  }'::jsonb
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Comments for documentation
COMMENT ON COLUMN user_profiles.factions IS
  'Life balance factions: karriere, familie, hobbys, fitness, lernen, freunde, finanzen. Values 0-100.';
COMMENT ON COLUMN user_profiles.mental_stats IS
  'Mental stats (Seele & Kopf): stimmung, motivation, stress (low=good), fokus, kreativitaet, soziale_batterie. Values 0-100.';
