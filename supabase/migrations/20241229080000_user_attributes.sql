-- ============================================
-- Migration: Add attributes to user_profiles
-- PRD Section 2.1: Character Attributes (STR, DEX, INT, CHA, WIS, VIT)
-- ============================================

-- Add attributes JSONB column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{
  "str": 10,
  "dex": 10,
  "int": 10,
  "cha": 10,
  "wis": 10,
  "vit": 10
}'::jsonb;

-- Add username if not exists (for character header)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username TEXT;
  END IF;
END $$;

-- Add avatar_url if not exists (for character header)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- Update test user with sample attributes (PRD example values)
UPDATE user_profiles
SET
  attributes = '{
    "str": 42,
    "dex": 78,
    "int": 89,
    "cha": 61,
    "wis": 68,
    "vit": 52
  }'::jsonb,
  username = 'Lukas'
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Comment explaining the attribute system
COMMENT ON COLUMN user_profiles.attributes IS 'RPG-style character attributes: str (Strength), dex (Dexterity), int (Intelligence), cha (Charisma), wis (Wisdom), vit (Vitality). Values 0-100.';
