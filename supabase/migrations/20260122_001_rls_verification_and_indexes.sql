-- ============================================
-- RLS VERIFICATION AND PERFORMANCE INDEXES
-- ============================================
-- Created: 2026-01-22
-- Purpose: Verify RLS is enabled on all 49 tables, then create performance indexes
-- Addresses: SEC-03 (RLS enforcement verification and performance optimization)
-- ============================================

-- ============================================
-- PART 1: VERIFY RLS IS ENABLED ON ALL TABLES
-- This migration will FAIL if RLS is not enabled
-- ============================================

DO $$
DECLARE
  tables_without_rls TEXT[];
  table_record RECORD;
BEGIN
  -- Get list of tables that should have RLS but don't
  SELECT array_agg(tablename)
  INTO tables_without_rls
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'accounts', 'activity_log', 'ai_faction_suggestions_feedback', 'body_metrics',
      'books', 'budgets', 'career_goals', 'career_sources', 'contact_interactions',
      'contacts', 'courses', 'experiences', 'finance_achievements', 'finance_streaks',
      'google_calendar_integrations', 'habit_logs', 'habit_reminders', 'habits',
      'health_import_logs', 'hobby_projects', 'hobby_time_logs', 'investments',
      'job_history', 'journal_entries', 'mental_stats_logs', 'mood_logs',
      'net_worth_history', 'notification_log', 'notification_settings', 'notion_integrations',
      'quest_actions', 'quests', 'recurring_flows', 'reminder_delivery_log',
      'salary_entries', 'savings_goals', 'sleep_logs', 'social_events',
      'training_plans', 'transaction_categories', 'transactions', 'user_achievements',
      'user_api_keys', 'user_faction_stats', 'user_profiles', 'user_quest_preferences',
      'user_skills', 'workout_sessions', 'workouts'
    )
    AND NOT c.relrowsecurity;

  -- Fail migration if any tables lack RLS
  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE EXCEPTION 'RLS not enabled on tables: %. Enable RLS before running this migration.',
      array_to_string(tables_without_rls, ', ');
  END IF;

  RAISE NOTICE 'RLS verification passed: all 49 tables have RLS enabled';
END $$;

-- Verify RLS policies exist (not just enabled)
DO $$
DECLARE
  tables_without_policies TEXT[];
BEGIN
  SELECT array_agg(DISTINCT t.tablename)
  INTO tables_without_policies
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'habits', 'quests', 'user_skills', 'user_faction_stats',
      'journal_entries', 'contacts', 'mood_logs'  -- Critical user-data tables
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.tablename = t.tablename
        AND p.schemaname = 'public'
    );

  IF array_length(tables_without_policies, 1) > 0 THEN
    RAISE EXCEPTION 'Tables have RLS enabled but no policies defined: %. Create policies before running this migration.',
      array_to_string(tables_without_policies, ', ');
  END IF;

  RAISE NOTICE 'RLS policy verification passed: critical tables have policies defined';
END $$;

-- ============================================
-- PART 2: CREATE PERFORMANCE INDEXES
-- Only runs if Part 1 passed
-- ============================================
-- Note: Using CONCURRENTLY requires running outside transaction
-- If running via Supabase Dashboard, run each CREATE INDEX separately
-- ============================================

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts USING btree (user_id);

-- Activity Log
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log USING btree (user_id);

-- AI Faction Suggestions Feedback
CREATE INDEX IF NOT EXISTS idx_ai_faction_suggestions_feedback_user_id ON ai_faction_suggestions_feedback USING btree (user_id);

-- Body Metrics
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_id ON body_metrics USING btree (user_id);

-- Books
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books USING btree (user_id);

-- Budgets
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets USING btree (user_id);

-- Career Goals
CREATE INDEX IF NOT EXISTS idx_career_goals_user_id ON career_goals USING btree (user_id);

-- Career Sources
CREATE INDEX IF NOT EXISTS idx_career_sources_user_id ON career_sources USING btree (user_id);

-- Contact Interactions
CREATE INDEX IF NOT EXISTS idx_contact_interactions_user_id ON contact_interactions USING btree (user_id);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts USING btree (user_id);

-- Courses
CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses USING btree (user_id);

-- Experiences
CREATE INDEX IF NOT EXISTS idx_experiences_user_id ON experiences USING btree (user_id);

-- Finance Achievements
CREATE INDEX IF NOT EXISTS idx_finance_achievements_user_id ON finance_achievements USING btree (user_id);

-- Finance Streaks
CREATE INDEX IF NOT EXISTS idx_finance_streaks_user_id ON finance_streaks USING btree (user_id);

-- Google Calendar Integrations
CREATE INDEX IF NOT EXISTS idx_google_calendar_integrations_user_id ON google_calendar_integrations USING btree (user_id);

-- Habit Logs
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON habit_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs USING btree (user_id, logged_at);

-- Habit Reminders
CREATE INDEX IF NOT EXISTS idx_habit_reminders_user_id ON habit_reminders USING btree (user_id);

-- Habits
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits USING btree (user_id, is_active);

-- Health Import Logs
CREATE INDEX IF NOT EXISTS idx_health_import_logs_user_id ON health_import_logs USING btree (user_id);

-- Hobby Projects
CREATE INDEX IF NOT EXISTS idx_hobby_projects_user_id ON hobby_projects USING btree (user_id);

-- Hobby Time Logs
CREATE INDEX IF NOT EXISTS idx_hobby_time_logs_user_id ON hobby_time_logs USING btree (user_id);

-- Investments
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments USING btree (user_id);

-- Job History
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history USING btree (user_id);

-- Journal Entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries USING btree (user_id);

-- Mental Stats Logs
CREATE INDEX IF NOT EXISTS idx_mental_stats_logs_user_id ON mental_stats_logs USING btree (user_id);

-- Mood Logs
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_id ON mood_logs USING btree (user_id);

-- Net Worth History
CREATE INDEX IF NOT EXISTS idx_net_worth_history_user_id ON net_worth_history USING btree (user_id);

-- Notification Log
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log USING btree (user_id);

-- Notification Settings
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings USING btree (user_id);

-- Notion Integrations
CREATE INDEX IF NOT EXISTS idx_notion_integrations_user_id ON notion_integrations USING btree (user_id);

-- Quest Actions
CREATE INDEX IF NOT EXISTS idx_quest_actions_user_id ON quest_actions USING btree (user_id);

-- Quests
CREATE INDEX IF NOT EXISTS idx_quests_user_id ON quests USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_quests_user_status ON quests USING btree (user_id, status);

-- Recurring Flows
CREATE INDEX IF NOT EXISTS idx_recurring_flows_user_id ON recurring_flows USING btree (user_id);

-- Reminder Delivery Log
CREATE INDEX IF NOT EXISTS idx_reminder_delivery_log_user_id ON reminder_delivery_log USING btree (user_id);

-- Salary Entries
CREATE INDEX IF NOT EXISTS idx_salary_entries_user_id ON salary_entries USING btree (user_id);

-- Savings Goals
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals USING btree (user_id);

-- Sleep Logs
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_id ON sleep_logs USING btree (user_id);

-- Social Events
CREATE INDEX IF NOT EXISTS idx_social_events_user_id ON social_events USING btree (user_id);

-- Training Plans
CREATE INDEX IF NOT EXISTS idx_training_plans_user_id ON training_plans USING btree (user_id);

-- Transaction Categories
CREATE INDEX IF NOT EXISTS idx_transaction_categories_user_id ON transaction_categories USING btree (user_id);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions USING btree (user_id);

-- User Achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements USING btree (user_id);

-- User API Keys
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys USING btree (user_id);

-- User Faction Stats
CREATE INDEX IF NOT EXISTS idx_user_faction_stats_user_id ON user_faction_stats USING btree (user_id);

-- User Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles USING btree (user_id);

-- User Quest Preferences
CREATE INDEX IF NOT EXISTS idx_user_quest_preferences_user_id ON user_quest_preferences USING btree (user_id);

-- User Skills
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills USING btree (user_id);

-- Workout Sessions
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions USING btree (user_id);

-- Workouts
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts USING btree (user_id);

-- ============================================
-- SEC-03 VERIFICATION QUERIES
-- Run these after migration to verify RLS prevents cross-user access
-- ============================================

-- Test 1: Verify User A cannot see User B's habits
-- SET ROLE authenticated;
-- SET request.jwt.claims = '{"sub": "user-a-uuid"}';
-- SELECT * FROM habits WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows (RLS blocks cross-user access)

-- Test 2: Verify User A cannot see User B's quests
-- SET request.jwt.claims = '{"sub": "user-a-uuid"}';
-- SELECT * FROM quests WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows

-- Test 3: Verify User A cannot see User B's journal entries
-- SELECT * FROM journal_entries WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows

-- Test 4: Verify User A cannot see User B's contacts
-- SELECT * FROM contacts WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows

-- Test 5: Verify User A cannot see User B's user_skills
-- SELECT * FROM user_skills WHERE user_id = 'user-b-uuid';
-- Expected: 0 rows

-- Test 6: Check all indexes exist
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_%_user_id'
-- ORDER BY tablename;
-- Expected: 49+ rows (one per table + composite indexes)

-- Test 7: Verify Index Scan is used (not Seq Scan) for habits query
-- EXPLAIN ANALYZE SELECT * FROM habits WHERE user_id = 'your-uuid';
-- Expected: "Index Scan using idx_habits_user_id" in output
-- NOT: "Seq Scan on habits"

-- Test 8: Verify Index Scan is used for quests query
-- EXPLAIN ANALYZE SELECT * FROM quests WHERE user_id = 'your-uuid';
-- Expected: "Index Scan using idx_quests_user_id"

-- Test 9: Verify composite index is used for quests with status filter
-- EXPLAIN ANALYZE SELECT * FROM quests WHERE user_id = 'your-uuid' AND status = 'active';
-- Expected: "Index Scan using idx_quests_user_status"

-- Test 10: Verify composite index is used for habits with active filter
-- EXPLAIN ANALYZE SELECT * FROM habits WHERE user_id = 'your-uuid' AND is_active = true;
-- Expected: "Index Scan using idx_habits_user_active"

-- Test 11: Verify composite index is used for habit_logs with date range
-- EXPLAIN ANALYZE SELECT * FROM habit_logs
-- WHERE user_id = 'your-uuid' AND logged_at >= NOW() - INTERVAL '7 days';
-- Expected: "Index Scan using idx_habit_logs_user_date"

-- ============================================
-- RLS POLICY OPTIMIZATION NOTE
-- ============================================
-- For optimal performance, RLS policies should use:
--   USING ((SELECT auth.uid()) = user_id)
-- Instead of:
--   USING (auth.uid() = user_id)
-- The SELECT wrapper caches the auth.uid() call.
--
-- Current policies in 20260116_rls_policies.sql use auth.uid() directly.
-- Performance impact: Minimal at current scale, but consider optimizing
-- if queries become slow (auth.uid() called per-row without caching).
--
-- To optimize, run:
-- DO $$
-- DECLARE
--   t TEXT;
--   tables TEXT[] := ARRAY['habits', 'quests', 'user_skills', 'journal_entries'];
-- BEGIN
--   FOREACH t IN ARRAY tables LOOP
--     EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON %I', t, t);
--     EXECUTE format('CREATE POLICY "Users can view own %s" ON %I FOR SELECT USING ((SELECT auth.uid()) = user_id)', t, t);
--   END LOOP;
-- END $$;
-- ============================================
