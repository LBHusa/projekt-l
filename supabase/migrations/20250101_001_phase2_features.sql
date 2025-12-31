-- ============================================
-- PHASE 2: DASHBOARD & LEBENSBEREICHE
-- Neue Tabellen für erweiterte Features
-- ============================================

-- ============================================
-- 1. HABITS SYSTEM (Cross-Cutting)
-- ============================================

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '✅',
  color TEXT DEFAULT '#10B981',

  -- Type: positive (build streak) or negative (avoid)
  habit_type TEXT NOT NULL CHECK (habit_type IN ('positive', 'negative')) DEFAULT 'positive',

  -- Frequency
  frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, specific_days
  target_days TEXT[] DEFAULT '{}', -- ['mon', 'tue', ...] for specific_days

  -- Stats
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,

  -- XP
  xp_per_completion INTEGER DEFAULT 10,
  faction_id TEXT REFERENCES factions(id) ON DELETE SET NULL,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_faction ON habits(faction_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user ON habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(logged_at DESC);

-- ============================================
-- 2. KARRIERE (Career)
-- ============================================

CREATE TABLE IF NOT EXISTS job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  company TEXT NOT NULL,
  position TEXT NOT NULL,
  employment_type TEXT DEFAULT 'full_time', -- full_time, part_time, freelance, contract, internship

  start_date DATE NOT NULL,
  end_date DATE, -- NULL = current
  is_current BOOLEAN DEFAULT FALSE,

  description TEXT,
  location TEXT,
  skills_used TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',

  -- For branching timeline (parallel jobs)
  is_parallel BOOLEAN DEFAULT FALSE,
  parent_job_id UUID REFERENCES job_history(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_id UUID REFERENCES job_history(id) ON DELETE SET NULL,

  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  period TEXT DEFAULT 'monthly', -- monthly, yearly, hourly

  -- Additional compensation
  bonus DECIMAL(12, 2) DEFAULT 0,
  equity_value DECIMAL(12, 2) DEFAULT 0,

  effective_date DATE NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS career_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,

  status TEXT DEFAULT 'active', -- active, achieved, abandoned
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  milestones JSONB DEFAULT '[]', -- [{title, completed, completed_at}]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_history_user ON job_history(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_entries_user ON salary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_salary_entries_job ON salary_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_user ON career_goals(user_id);

-- ============================================
-- 3. HOBBYS (Hobbies)
-- ============================================

CREATE TABLE IF NOT EXISTS hobby_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- art, music, gaming, crafts, sports, tech, etc.
  icon TEXT DEFAULT '🎨',

  status TEXT DEFAULT 'active', -- active, paused, completed, abandoned
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  started_at DATE,
  completed_at DATE,

  total_hours DECIMAL(8, 2) DEFAULT 0,
  related_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hobby_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES hobby_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  duration_minutes INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hobby_projects_user ON hobby_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_hobby_time_logs_project ON hobby_time_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_hobby_time_logs_user ON hobby_time_logs(user_id);

-- ============================================
-- 4. GESUNDHEIT (Health)
-- ============================================

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  workout_type TEXT NOT NULL, -- strength, cardio, flexibility, sports, hiit, yoga, other
  name TEXT NOT NULL,

  duration_minutes INTEGER,
  calories_burned INTEGER,
  intensity TEXT, -- low, medium, high

  exercises JSONB DEFAULT '[]', -- [{name, sets, reps, weight, duration}]

  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,

  xp_gained INTEGER DEFAULT 0,
  related_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  metric_type TEXT NOT NULL, -- weight, body_fat, muscle_mass, bmi, height, waist, chest, arms, etc.
  value DECIMAL(8, 2) NOT NULL,
  unit TEXT NOT NULL, -- kg, %, cm, etc.

  measured_at DATE NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  goal TEXT, -- strength, endurance, weight_loss, muscle_gain, flexibility

  schedule JSONB DEFAULT '{}', -- {mon: [{name, type, ...}], tue: [...], ...}

  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user ON body_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_body_metrics_type ON body_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_training_plans_user ON training_plans(user_id);

-- ============================================
-- 5. LERNEN (Learning)
-- ============================================

CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  cover_url TEXT,
  genre TEXT,
  pages INTEGER,

  status TEXT DEFAULT 'to_read', -- to_read, reading, read, abandoned
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  current_page INTEGER DEFAULT 0,

  started_at DATE,
  finished_at DATE,

  notes TEXT,
  highlights JSONB DEFAULT '[]', -- [{page, text, note, created_at}]

  related_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  xp_gained INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  title TEXT NOT NULL,
  platform TEXT, -- Udemy, Coursera, YouTube, Pluralsight, LinkedIn, etc.
  instructor TEXT,
  url TEXT,

  status TEXT DEFAULT 'planned', -- planned, in_progress, completed, abandoned
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

  total_hours DECIMAL(6, 2),
  completed_hours DECIMAL(6, 2) DEFAULT 0,

  started_at DATE,
  finished_at DATE,

  notes TEXT,
  certificate_url TEXT,

  related_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  xp_gained INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_user ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

-- ============================================
-- 6. FREUNDE (Friends) - Social Events
-- ============================================

CREATE TABLE IF NOT EXISTS social_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT, -- party, dinner, trip, activity, meetup, call, other

  occurred_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  location TEXT,

  participants UUID[] DEFAULT '{}', -- Contact IDs
  participant_count INTEGER DEFAULT 1,

  photos_urls TEXT[] DEFAULT '{}',
  notes TEXT,

  xp_gained INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_events_user ON social_events(user_id);
CREATE INDEX IF NOT EXISTS idx_social_events_date ON social_events(occurred_at DESC);

-- ============================================
-- 7. FINANZEN (Finance)
-- ============================================

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- checking, savings, credit, investment, crypto, cash, loan
  institution TEXT, -- Bank name, broker, etc.

  currency TEXT DEFAULT 'EUR',
  current_balance DECIMAL(14, 2) DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,
  is_excluded_from_net_worth BOOLEAN DEFAULT FALSE, -- For credit cards, loans

  icon TEXT,
  color TEXT,

  -- For credit/loans
  credit_limit DECIMAL(14, 2),
  interest_rate DECIMAL(5, 2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  transaction_type TEXT NOT NULL, -- income, expense, transfer
  category TEXT, -- salary, freelance, food, rent, utilities, entertainment, transport, health, etc.

  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,

  occurred_at DATE NOT NULL,

  -- For transfers
  to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,

  tags TEXT[] DEFAULT '{}',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT, -- daily, weekly, monthly, yearly

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  symbol TEXT NOT NULL, -- AAPL, BTC, ETH, etc.
  name TEXT NOT NULL,
  asset_type TEXT, -- stock, etf, crypto, bond, fund, commodity, other

  quantity DECIMAL(18, 8) NOT NULL,
  average_cost DECIMAL(14, 4),
  current_price DECIMAL(14, 4),

  purchased_at DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  period TEXT DEFAULT 'monthly', -- weekly, monthly, yearly

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_investments_account ON investments(account_id);
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);

-- ============================================
-- 8. ACTIVITY LOG (Cross-Cutting)
-- ============================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  activity_type TEXT NOT NULL, -- xp_gained, level_up, habit_completed, workout_logged, book_finished, etc.
  faction_id TEXT REFERENCES factions(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,

  xp_amount INTEGER DEFAULT 0,

  -- Polymorphic reference
  related_entity_type TEXT, -- skill, habit, workout, book, course, contact, job, account, etc.
  related_entity_id UUID,

  metadata JSONB DEFAULT '{}', -- Additional context data

  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_faction ON activity_log(faction_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_occurred ON activity_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to update habit streak
CREATE OR REPLACE FUNCTION update_habit_streak()
RETURNS TRIGGER AS $$
DECLARE
  last_log_date DATE;
  habit_record RECORD;
BEGIN
  -- Get habit info
  SELECT * INTO habit_record FROM habits WHERE id = NEW.habit_id;

  -- Get last log date for this habit
  SELECT DATE(logged_at) INTO last_log_date
  FROM habit_logs
  WHERE habit_id = NEW.habit_id
    AND id != NEW.id
    AND completed = TRUE
  ORDER BY logged_at DESC
  LIMIT 1;

  -- Update streak
  IF NEW.completed THEN
    IF last_log_date IS NULL OR (DATE(NEW.logged_at) - last_log_date) > 1 THEN
      -- Start new streak
      UPDATE habits
      SET current_streak = 1,
          total_completions = total_completions + 1,
          updated_at = NOW()
      WHERE id = NEW.habit_id;
    ELSIF DATE(NEW.logged_at) - last_log_date = 1 THEN
      -- Continue streak
      UPDATE habits
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          total_completions = total_completions + 1,
          updated_at = NOW()
      WHERE id = NEW.habit_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for habit logs
DROP TRIGGER IF EXISTS trigger_update_habit_streak ON habit_logs;
CREATE TRIGGER trigger_update_habit_streak
AFTER INSERT ON habit_logs
FOR EACH ROW
EXECUTE FUNCTION update_habit_streak();

-- Function to update hobby project total hours
CREATE OR REPLACE FUNCTION update_hobby_project_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hobby_projects
  SET total_hours = (
    SELECT COALESCE(SUM(duration_minutes), 0) / 60.0
    FROM hobby_time_logs
    WHERE project_id = NEW.project_id
  ),
  updated_at = NOW()
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for hobby time logs
DROP TRIGGER IF EXISTS trigger_update_hobby_hours ON hobby_time_logs;
CREATE TRIGGER trigger_update_hobby_hours
AFTER INSERT OR UPDATE OR DELETE ON hobby_time_logs
FOR EACH ROW
EXECUTE FUNCTION update_hobby_project_hours();

-- Function to recalculate account balance from transactions
CREATE OR REPLACE FUNCTION recalculate_account_balance(account_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  new_balance DECIMAL(14, 2);
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN transaction_type = 'income' THEN amount
      WHEN transaction_type = 'expense' THEN -amount
      WHEN transaction_type = 'transfer' AND account_id = account_uuid THEN -amount
      WHEN transaction_type = 'transfer' AND to_account_id = account_uuid THEN amount
      ELSE 0
    END
  ), 0) INTO new_balance
  FROM transactions
  WHERE account_id = account_uuid OR to_account_id = account_uuid;

  UPDATE accounts SET current_balance = new_balance, updated_at = NOW()
  WHERE id = account_uuid;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. VIEWS
-- ============================================

-- Net worth view
CREATE OR REPLACE VIEW user_net_worth AS
SELECT
  user_id,
  SUM(CASE WHEN NOT is_excluded_from_net_worth THEN current_balance ELSE 0 END) as net_worth,
  SUM(CASE WHEN account_type IN ('checking', 'savings', 'cash') THEN current_balance ELSE 0 END) as cash_total,
  SUM(CASE WHEN account_type = 'investment' THEN current_balance ELSE 0 END) as investments_total,
  SUM(CASE WHEN account_type = 'crypto' THEN current_balance ELSE 0 END) as crypto_total,
  SUM(CASE WHEN account_type IN ('credit', 'loan') THEN current_balance ELSE 0 END) as debt_total,
  COUNT(*) as account_count
FROM accounts
WHERE is_active = TRUE
GROUP BY user_id;

-- Habit streaks view
CREATE OR REPLACE VIEW user_habit_stats AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE is_active = TRUE) as active_habits,
  SUM(current_streak) as total_current_streaks,
  MAX(longest_streak) as best_streak_ever,
  SUM(total_completions) as total_completions
FROM habits
GROUP BY user_id;

-- Monthly activity summary
CREATE OR REPLACE VIEW monthly_activity_summary AS
SELECT
  user_id,
  faction_id,
  DATE_TRUNC('month', occurred_at) as month,
  activity_type,
  COUNT(*) as activity_count,
  SUM(xp_amount) as total_xp
FROM activity_log
GROUP BY user_id, faction_id, DATE_TRUNC('month', occurred_at), activity_type;
