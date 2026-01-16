-- ============================================
-- RLS POLICIES FOR MULTI-TENANCY SECURITY
-- ============================================
-- Created: 2026-01-16
-- Purpose: Ensure each user can only access their own data
-- ============================================

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS uuid AS $$
  SELECT auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- ENABLE RLS ON ALL USER-DATA TABLES
-- ============================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_faction_suggestions_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hobby_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE hobby_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mental_stats_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_faction_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE POLICIES FOR EACH TABLE
-- Pattern: Users can only access rows where user_id = their auth.uid()
-- ============================================

-- Function to create standard CRUD policies for a table
DO $$
DECLARE
    tables TEXT[] := ARRAY[
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
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Drop existing policies first
        EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %s" ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update own %s" ON %I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %s" ON %I', t, t);
        
        -- Create SELECT policy
        EXECUTE format('CREATE POLICY "Users can view own %s" ON %I FOR SELECT USING (auth.uid() = user_id)', t, t);
        
        -- Create INSERT policy
        EXECUTE format('CREATE POLICY "Users can insert own %s" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', t, t);
        
        -- Create UPDATE policy
        EXECUTE format('CREATE POLICY "Users can update own %s" ON %I FOR UPDATE USING (auth.uid() = user_id)', t, t);
        
        -- Create DELETE policy
        EXECUTE format('CREATE POLICY "Users can delete own %s" ON %I FOR DELETE USING (auth.uid() = user_id)', t, t);
    END LOOP;
END $$;

-- ============================================
-- SERVICE ROLE BYPASS
-- The service_role key can still access all data (for backend jobs)
-- ============================================

-- Grant service_role full access (already has it via being superuser)
-- This is implicit in Supabase

-- ============================================
-- VERIFICATION
-- ============================================
-- Run: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
-- Should show all 49 tables with RLS enabled
