-- Add bio and display_name columns to user_profiles table
-- Required for profile editing feature

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS display_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.display_name IS 'User display name (max 50 characters)';
COMMENT ON COLUMN user_profiles.bio IS 'User biography text (max 500 characters, sanitized HTML allowed)';
