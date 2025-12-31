-- ============================================
-- PHASE 2e: FINANZEN ERWEITERUNGEN
-- Sparziele, Achievements, Streaks
-- ============================================

-- ============================================
-- 1. SPARZIELE (Savings Goals with Compound Interest)
-- ============================================

CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#10B981',

  -- Zielbeträge
  target_amount DECIMAL(14, 2) NOT NULL,
  current_amount DECIMAL(14, 2) DEFAULT 0,

  -- Zinseszins-Parameter
  monthly_contribution DECIMAL(12, 2) DEFAULT 0,
  interest_rate DECIMAL(6, 4) DEFAULT 0,  -- z.B. 0.05 für 5%
  compounds_per_year INTEGER DEFAULT 12,  -- Monatliche Verzinsung

  -- Zeitraum
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,

  -- Status
  is_achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMPTZ,

  -- Gamification
  xp_reward INTEGER DEFAULT 100,  -- XP wenn Ziel erreicht

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);

-- ============================================
-- 2. FINANCE ACHIEVEMENTS (Meilensteine)
-- ============================================

CREATE TABLE IF NOT EXISTS finance_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  achievement_type TEXT NOT NULL, -- 'net_worth_milestone', 'savings_streak', 'goal_reached', 'first_investment', etc.
  achievement_key TEXT NOT NULL,  -- z.B. 'net_worth_10k', 'savings_streak_30'

  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',

  xp_reward INTEGER DEFAULT 0,

  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  -- Für Progress-basierte Achievements
  progress_current INTEGER DEFAULT 0,
  progress_target INTEGER DEFAULT 1,
  is_unlocked BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_achievements_unique
  ON finance_achievements(user_id, achievement_key);
CREATE INDEX IF NOT EXISTS idx_finance_achievements_user ON finance_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_achievements_type ON finance_achievements(achievement_type);

-- ============================================
-- 3. FINANCE STREAKS
-- ============================================

CREATE TABLE IF NOT EXISTS finance_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  streak_type TEXT NOT NULL,  -- 'positive_cashflow', 'savings_contribution', 'budget_kept', 'no_impulse_buy'

  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  last_checked_date DATE,
  last_success_date DATE,

  -- XP pro Streak-Tag
  xp_per_day INTEGER DEFAULT 5,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_streaks_unique
  ON finance_streaks(user_id, streak_type);
CREATE INDEX IF NOT EXISTS idx_finance_streaks_user ON finance_streaks(user_id);

-- ============================================
-- 4. NET WORTH HISTORY (für Charts)
-- ============================================

CREATE TABLE IF NOT EXISTS net_worth_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  recorded_at DATE NOT NULL,

  net_worth DECIMAL(14, 2) NOT NULL,
  cash_total DECIMAL(14, 2) DEFAULT 0,
  investments_total DECIMAL(14, 2) DEFAULT 0,
  crypto_total DECIMAL(14, 2) DEFAULT 0,
  debt_total DECIMAL(14, 2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_net_worth_history_unique
  ON net_worth_history(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_net_worth_history_user ON net_worth_history(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_history_date ON net_worth_history(recorded_at DESC);

-- ============================================
-- 5. TRANSACTION CATEGORIES (für Sankey)
-- ============================================

CREATE TABLE IF NOT EXISTS transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  name TEXT NOT NULL,
  parent_category TEXT,  -- Für Hierarchie: 'Wohnen' -> 'Miete', 'Nebenkosten'
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6B7280',

  is_income BOOLEAN DEFAULT FALSE,
  is_savings BOOLEAN DEFAULT FALSE,
  is_investment BOOLEAN DEFAULT FALSE,

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_categories_user ON transaction_categories(user_id);

-- Default-Kategorien einfügen (nur wenn noch keine existieren)
INSERT INTO transaction_categories (user_id, name, icon, color, is_income, is_savings, is_investment, display_order)
SELECT
  '00000000-0000-0000-0000-000000000001',
  name, icon, color, is_income, is_savings, is_investment, display_order
FROM (VALUES
  ('Gehalt', '💰', '#10B981', TRUE, FALSE, FALSE, 1),
  ('Freelance', '💼', '#059669', TRUE, FALSE, FALSE, 2),
  ('Investments', '📈', '#0EA5E9', TRUE, FALSE, FALSE, 3),
  ('Sonstiges Einkommen', '💵', '#6B7280', TRUE, FALSE, FALSE, 4),
  ('Wohnen', '🏠', '#8B5CF6', FALSE, FALSE, FALSE, 10),
  ('Essen', '🍕', '#F59E0B', FALSE, FALSE, FALSE, 11),
  ('Transport', '🚗', '#EF4444', FALSE, FALSE, FALSE, 12),
  ('Unterhaltung', '🎮', '#EC4899', FALSE, FALSE, FALSE, 13),
  ('Gesundheit', '💊', '#14B8A6', FALSE, FALSE, FALSE, 14),
  ('Shopping', '🛍️', '#F97316', FALSE, FALSE, FALSE, 15),
  ('Bildung', '📚', '#6366F1', FALSE, FALSE, FALSE, 16),
  ('Sonstiges', '📦', '#6B7280', FALSE, FALSE, FALSE, 17),
  ('Sparen', '🏦', '#22C55E', FALSE, TRUE, FALSE, 20),
  ('ETF/Aktien', '📊', '#3B82F6', FALSE, FALSE, TRUE, 21),
  ('Crypto', '₿', '#F59E0B', FALSE, FALSE, TRUE, 22)
) AS t(name, icon, color, is_income, is_savings, is_investment, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM transaction_categories
  WHERE user_id = '00000000-0000-0000-0000-000000000001'
);

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Funktion: Zinseszins berechnen
CREATE OR REPLACE FUNCTION calculate_compound_interest(
  principal DECIMAL,
  monthly_contribution DECIMAL,
  annual_rate DECIMAL,
  compounds_per_year INTEGER,
  months INTEGER
) RETURNS DECIMAL AS $$
DECLARE
  rate_per_period DECIMAL;
  total_periods INTEGER;
  future_value DECIMAL;
BEGIN
  IF annual_rate = 0 THEN
    RETURN principal + (monthly_contribution * months);
  END IF;

  rate_per_period := annual_rate / compounds_per_year;
  total_periods := months;

  -- Future Value = P(1+r)^n + PMT * (((1+r)^n - 1) / r)
  future_value := principal * POWER(1 + rate_per_period, total_periods);
  future_value := future_value + monthly_contribution * ((POWER(1 + rate_per_period, total_periods) - 1) / rate_per_period);

  RETURN ROUND(future_value, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funktion: Net Worth Level berechnen
CREATE OR REPLACE FUNCTION calculate_net_worth_level(net_worth DECIMAL)
RETURNS INTEGER AS $$
BEGIN
  IF net_worth <= 0 THEN
    RETURN 1;
  END IF;
  -- Level = log10(netWorth + 1) * 10, max 100
  RETURN LEAST(100, GREATEST(1, FLOOR(LOG(net_worth + 1) * 10)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funktion: Monatlichen Cashflow berechnen
CREATE OR REPLACE FUNCTION get_monthly_cashflow(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  income DECIMAL,
  expenses DECIMAL,
  savings DECIMAL,
  investments DECIMAL,
  net DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END), 0) as income,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'expense' THEN t.amount ELSE 0 END), 0) as expenses,
    COALESCE(SUM(CASE
      WHEN t.transaction_type = 'expense' AND tc.is_savings = TRUE THEN t.amount
      ELSE 0
    END), 0) as savings,
    COALESCE(SUM(CASE
      WHEN t.transaction_type = 'expense' AND tc.is_investment = TRUE THEN t.amount
      ELSE 0
    END), 0) as investments,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE -t.amount END), 0) as net
  FROM transactions t
  LEFT JOIN transaction_categories tc ON tc.name = t.category AND tc.user_id = t.user_id
  WHERE t.user_id = p_user_id
    AND EXTRACT(YEAR FROM t.occurred_at) = p_year
    AND EXTRACT(MONTH FROM t.occurred_at) = p_month;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. VIEWS
-- ============================================

-- Erweiterte Net Worth View mit Level
CREATE OR REPLACE VIEW user_net_worth_extended AS
SELECT
  user_id,
  SUM(CASE WHEN NOT is_excluded_from_net_worth THEN current_balance ELSE 0 END) as net_worth,
  calculate_net_worth_level(SUM(CASE WHEN NOT is_excluded_from_net_worth THEN current_balance ELSE 0 END)) as net_worth_level,
  SUM(CASE WHEN account_type IN ('checking', 'savings', 'cash') THEN current_balance ELSE 0 END) as cash_total,
  SUM(CASE WHEN account_type = 'investment' THEN current_balance ELSE 0 END) as investments_total,
  SUM(CASE WHEN account_type = 'crypto' THEN current_balance ELSE 0 END) as crypto_total,
  SUM(CASE WHEN account_type IN ('credit', 'loan') THEN current_balance ELSE 0 END) as debt_total,
  COUNT(*) as account_count
FROM accounts
WHERE is_active = TRUE
GROUP BY user_id;

-- Savings Goals Progress View
CREATE OR REPLACE VIEW savings_goals_progress AS
SELECT
  sg.*,
  ROUND((sg.current_amount / NULLIF(sg.target_amount, 0)) * 100, 1) as progress_percent,
  calculate_compound_interest(
    sg.current_amount,
    sg.monthly_contribution,
    sg.interest_rate,
    sg.compounds_per_year,
    GREATEST(0, (EXTRACT(YEAR FROM AGE(COALESCE(sg.target_date, CURRENT_DATE + INTERVAL '10 years'), CURRENT_DATE)) * 12 +
                 EXTRACT(MONTH FROM AGE(COALESCE(sg.target_date, CURRENT_DATE + INTERVAL '10 years'), CURRENT_DATE)))::INTEGER)
  ) as projected_amount,
  CASE
    WHEN sg.target_date IS NOT NULL
    THEN (sg.target_date - CURRENT_DATE)
    ELSE NULL
  END as days_remaining
FROM savings_goals sg
WHERE sg.is_achieved = FALSE;
