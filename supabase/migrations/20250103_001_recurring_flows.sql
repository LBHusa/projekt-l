-- Phase 4: Recurring Flows (Daueraufträge)
-- Tabelle für wiederkehrende Geldflüsse zwischen Nodes im Canvas

CREATE TABLE IF NOT EXISTS recurring_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Quelle (von wo kommt das Geld)
  source_type TEXT NOT NULL CHECK (source_type IN ('income', 'account')),
  source_id UUID,                    -- account_id wenn source_type = 'account'
  source_category TEXT,              -- z.B. 'salary', 'freelance' wenn source_type = 'income'

  -- Ziel (wohin geht das Geld)
  target_type TEXT NOT NULL CHECK (target_type IN ('account', 'expense', 'savings')),
  target_id UUID,                    -- account_id oder savings_goal_id
  target_category TEXT,              -- z.B. 'housing', 'food' wenn target_type = 'expense'

  -- Betrag und Frequenz
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),

  -- Beschreibung
  name TEXT NOT NULL,                -- z.B. "Gehalt", "Miete", "ETF Sparplan"
  description TEXT,

  -- Zeitraum
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,                     -- NULL = unbefristet
  next_due_date DATE,                -- Nächste Fälligkeit

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadaten
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()

  -- Note: No foreign keys because source_id/target_id can reference
  -- different tables depending on source_type/target_type
);

-- Indexes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_recurring_flows_user ON recurring_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_flows_active ON recurring_flows(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recurring_flows_next_due ON recurring_flows(next_due_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recurring_flows_source ON recurring_flows(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_recurring_flows_target ON recurring_flows(target_type, target_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_recurring_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recurring_flows_updated_at
  BEFORE UPDATE ON recurring_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_flows_updated_at();

-- RLS Policies
ALTER TABLE recurring_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring flows"
  ON recurring_flows FOR SELECT
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can insert own recurring flows"
  ON recurring_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can update own recurring flows"
  ON recurring_flows FOR UPDATE
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can delete own recurring flows"
  ON recurring_flows FOR DELETE
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Kommentar für Dokumentation
COMMENT ON TABLE recurring_flows IS 'Wiederkehrende Geldflüsse (Daueraufträge) für den Money Flow Canvas';
COMMENT ON COLUMN recurring_flows.source_type IS 'Typ der Quelle: income (externe Einnahme) oder account (Bankkonto)';
COMMENT ON COLUMN recurring_flows.target_type IS 'Typ des Ziels: account (Bankkonto), expense (Ausgabenkategorie), savings (Sparziel)';
COMMENT ON COLUMN recurring_flows.frequency IS 'Wiederholungsfrequenz: weekly, biweekly, monthly, quarterly, yearly';
