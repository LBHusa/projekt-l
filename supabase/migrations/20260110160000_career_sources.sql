-- ============================================
-- Migration: Career Sources System
-- Version: 20260110_007
-- Description: Multi-source career tracking (Job + Business + Freelance + Passive Income)
-- ============================================

-- Career Sources Table
-- Allows users to track multiple income sources (employment, freelance, business, passive)
CREATE TABLE IF NOT EXISTS career_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'employment',
  monthly_income DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  linked_domain_id UUID REFERENCES skill_domains(id) ON DELETE SET NULL,
  xp_multiplier DECIMAL(3,2) DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT career_sources_type_check CHECK (type IN ('employment', 'freelance', 'business', 'passive')),
  CONSTRAINT career_sources_currency_check CHECK (currency IN ('EUR', 'USD', 'GBP', 'CHF')),
  CONSTRAINT career_sources_xp_multiplier_check CHECK (xp_multiplier >= 0.0 AND xp_multiplier <= 5.0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_career_sources_user_id ON career_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_career_sources_is_active ON career_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_career_sources_is_primary ON career_sources(is_primary);
CREATE INDEX IF NOT EXISTS idx_career_sources_linked_domain ON career_sources(linked_domain_id);

-- Row Level Security
ALTER TABLE career_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own career sources"
  ON career_sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own career sources"
  ON career_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own career sources"
  ON career_sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own career sources"
  ON career_sources FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_career_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER career_sources_updated_at
  BEFORE UPDATE ON career_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_career_sources_updated_at();

-- Comments
COMMENT ON TABLE career_sources IS 'Tracks multiple career/income sources for users';
COMMENT ON COLUMN career_sources.type IS 'Type of income source: employment, freelance, business, passive';
COMMENT ON COLUMN career_sources.monthly_income IS 'Monthly income in the specified currency';
COMMENT ON COLUMN career_sources.is_primary IS 'Whether this is the primary income source';
COMMENT ON COLUMN career_sources.linked_domain_id IS 'Skill domain that receives XP boost from this source';
COMMENT ON COLUMN career_sources.xp_multiplier IS 'XP multiplier for the linked domain (1.0 = 100%)';
