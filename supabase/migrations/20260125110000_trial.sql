-- KI Trial-System Migration
-- Adds trial_started_at column to user_profiles for tracking 5-hour free AI trial

-- Add trial_started_at column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.trial_started_at
IS 'Timestamp when AI trial started (after onboarding completion). Users get 5 hours of free AI usage with server key.';

-- Create index for efficient trial status queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_started_at
ON user_profiles(trial_started_at)
WHERE trial_started_at IS NOT NULL;
