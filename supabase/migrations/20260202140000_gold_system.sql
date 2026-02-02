-- Gold System
-- Phase 3: Lebendiger Buddy
-- User currency and transaction history

-- =============================================
-- USER CURRENCY TABLE
-- Stores gold balance (later: gems for premium)
-- =============================================

CREATE TABLE IF NOT EXISTS user_currency (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Currency balances
  gold INTEGER NOT NULL DEFAULT 100, -- Start with 100 gold
  gems INTEGER NOT NULL DEFAULT 0,   -- Premium currency (Phase 4+)

  -- Lifetime stats
  total_earned_gold BIGINT NOT NULL DEFAULT 0,
  total_earned_gems BIGINT NOT NULL DEFAULT 0,
  total_spent_gold BIGINT NOT NULL DEFAULT 0,
  total_spent_gems BIGINT NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT gold_non_negative CHECK (gold >= 0),
  CONSTRAINT gems_non_negative CHECK (gems >= 0)
);

-- =============================================
-- CURRENCY TRANSACTIONS TABLE
-- Append-only log of all gold/gem changes
-- =============================================

CREATE TYPE currency_type AS ENUM ('gold', 'gems');
CREATE TYPE currency_transaction_type AS ENUM (
  -- Earning
  'quest_complete',    -- Earned from quest completion
  'habit_complete',    -- Earned from habit completion
  'streak_bonus',      -- Bonus for streak milestone
  'achievement',       -- Achievement reward
  'daily_bonus',       -- Daily login bonus
  'referral',          -- Referral reward
  'admin_grant',       -- Admin gave currency

  -- Spending (Phase 4+)
  'shop_purchase',     -- Bought item from shop
  'streak_insurance',  -- Used to protect streak
  'premium_feature',   -- Used for premium feature
  'admin_deduct'       -- Admin removed currency
);

CREATE TABLE IF NOT EXISTS currency_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Transaction details
  currency currency_type NOT NULL,
  transaction_type currency_transaction_type NOT NULL,
  amount INTEGER NOT NULL, -- Positive for earn, negative for spend

  -- Reference to source (optional)
  source_table TEXT, -- 'quests', 'habits', 'achievements', etc.
  source_id UUID,    -- ID of the source entity

  -- Description
  description TEXT,

  -- Balance snapshot (for debugging/auditing)
  balance_after INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_amount CHECK (amount != 0)
);

-- =============================================
-- INDEXES
-- =============================================

-- Find transactions by user
CREATE INDEX IF NOT EXISTS idx_currency_tx_user
  ON currency_transactions(user_id, created_at DESC);

-- Find transactions by type
CREATE INDEX IF NOT EXISTS idx_currency_tx_type
  ON currency_transactions(transaction_type);

-- Find transactions by source
CREATE INDEX IF NOT EXISTS idx_currency_tx_source
  ON currency_transactions(source_table, source_id)
  WHERE source_id IS NOT NULL;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_currency ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own currency
CREATE POLICY "Users can view own currency"
  ON user_currency FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON currency_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all (for triggers)
CREATE POLICY "Service role manages currency"
  ON user_currency FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages transactions"
  ON currency_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

/**
 * Add gold to user account (with transaction log)
 * Returns new balance
 */
CREATE OR REPLACE FUNCTION add_gold(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type currency_transaction_type,
  p_description TEXT DEFAULT NULL,
  p_source_table TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Ensure user_currency row exists
  INSERT INTO user_currency (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update balance
  UPDATE user_currency
  SET
    gold = gold + p_amount,
    total_earned_gold = total_earned_gold + GREATEST(p_amount, 0),
    total_spent_gold = total_spent_gold + GREATEST(-p_amount, 0),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING gold INTO v_new_balance;

  -- Log transaction
  INSERT INTO currency_transactions (
    user_id,
    currency,
    transaction_type,
    amount,
    source_table,
    source_id,
    description,
    balance_after
  ) VALUES (
    p_user_id,
    'gold',
    p_transaction_type,
    p_amount,
    p_source_table,
    p_source_id,
    p_description,
    v_new_balance
  );

  RETURN v_new_balance;
END;
$$;

/**
 * Get user's current gold balance
 * Auto-initializes if needed
 */
CREATE OR REPLACE FUNCTION get_gold_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT gold INTO v_balance
  FROM user_currency
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Initialize with 100 gold
    INSERT INTO user_currency (user_id)
    VALUES (p_user_id)
    RETURNING gold INTO v_balance;
  END IF;

  RETURN v_balance;
END;
$$;

-- =============================================
-- QUEST COMPLETION GOLD TRIGGER
-- Awards gold based on quest difficulty
-- =============================================

CREATE OR REPLACE FUNCTION handle_quest_completion_gold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gold_amount INTEGER;
  v_difficulty TEXT;
BEGIN
  -- Only trigger on status change to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get difficulty
    v_difficulty := COALESCE(NEW.difficulty, 'medium');

    -- Calculate gold based on difficulty
    v_gold_amount := CASE v_difficulty
      WHEN 'easy' THEN 20
      WHEN 'medium' THEN 35
      WHEN 'hard' THEN 50
      WHEN 'epic' THEN 75
      ELSE 35
    END;

    -- Add bonus for quest type
    IF NEW.quest_type = 'weekly' THEN
      v_gold_amount := v_gold_amount * 3; -- 60-225 gold for weekly
    ELSIF NEW.quest_type = 'story' THEN
      v_gold_amount := v_gold_amount * 6; -- 120-450 gold for story
    END IF;

    -- Award gold
    PERFORM add_gold(
      NEW.user_id,
      v_gold_amount,
      'quest_complete',
      'Quest abgeschlossen: ' || COALESCE(NEW.title, 'Quest'),
      'quests',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS quest_completion_gold_trigger ON quests;
CREATE TRIGGER quest_completion_gold_trigger
  AFTER UPDATE OF status ON quests
  FOR EACH ROW
  EXECUTE FUNCTION handle_quest_completion_gold();

-- =============================================
-- HABIT COMPLETION GOLD TRIGGER
-- Awards gold for habit completion (not every time, see below)
-- =============================================

-- We don't award gold for every habit completion (too inflationary)
-- Instead, we award streak bonuses at milestones

-- =============================================
-- STREAK MILESTONE TRACKER
-- Tracks which streak milestones have been awarded
-- =============================================

CREATE TABLE IF NOT EXISTS streak_milestone_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL,
  milestone INTEGER NOT NULL, -- 7, 30, 90, etc.
  gold_awarded INTEGER NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate awards
  UNIQUE (user_id, habit_id, milestone)
);

-- RLS
ALTER TABLE streak_milestone_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak awards"
  ON streak_milestone_awards FOR SELECT
  USING (auth.uid() = user_id);

/**
 * Check and award streak milestones
 * Called after habit completion
 */
CREATE OR REPLACE FUNCTION check_streak_milestone(
  p_user_id UUID,
  p_habit_id UUID,
  p_current_streak INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_milestone INTEGER;
  v_gold_amount INTEGER;
  v_milestone_exists BOOLEAN;
BEGIN
  -- Check each milestone
  FOREACH v_milestone IN ARRAY ARRAY[7, 30, 90, 180, 365] LOOP
    IF p_current_streak >= v_milestone THEN
      -- Check if already awarded
      SELECT EXISTS (
        SELECT 1 FROM streak_milestone_awards
        WHERE user_id = p_user_id
          AND habit_id = p_habit_id
          AND milestone = v_milestone
      ) INTO v_milestone_exists;

      IF NOT v_milestone_exists THEN
        -- Calculate gold based on milestone
        v_gold_amount := CASE v_milestone
          WHEN 7 THEN 50
          WHEN 30 THEN 200
          WHEN 90 THEN 500
          WHEN 180 THEN 1000
          WHEN 365 THEN 2500
          ELSE 0
        END;

        IF v_gold_amount > 0 THEN
          -- Award gold
          PERFORM add_gold(
            p_user_id,
            v_gold_amount,
            'streak_bonus',
            v_milestone || '-Tage-Streak erreicht!',
            'habits',
            p_habit_id
          );

          -- Record award
          INSERT INTO streak_milestone_awards (user_id, habit_id, milestone, gold_awarded)
          VALUES (p_user_id, p_habit_id, v_milestone, v_gold_amount);
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- =============================================
-- HABIT COMPLETION STREAK CHECK TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION handle_habit_log_streak_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_streak INTEGER;
  v_habit_type TEXT;
BEGIN
  -- Only for completed habits
  IF NEW.completed = true THEN
    -- Get habit info
    SELECT current_streak, habit_type INTO v_current_streak, v_habit_type
    FROM habits
    WHERE id = NEW.habit_id;

    -- Only positive habits get streak bonuses
    IF v_habit_type = 'positive' AND v_current_streak > 0 THEN
      PERFORM check_streak_milestone(NEW.user_id, NEW.habit_id, v_current_streak);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS habit_log_streak_check_trigger ON habit_logs;
CREATE TRIGGER habit_log_streak_check_trigger
  AFTER INSERT ON habit_logs
  FOR EACH ROW
  EXECUTE FUNCTION handle_habit_log_streak_check();

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT ON user_currency TO authenticated;
GRANT SELECT ON currency_transactions TO authenticated;
GRANT SELECT ON streak_milestone_awards TO authenticated;
GRANT EXECUTE ON FUNCTION add_gold TO authenticated;
GRANT EXECUTE ON FUNCTION get_gold_balance TO authenticated;
GRANT EXECUTE ON FUNCTION check_streak_milestone TO authenticated;
