-- ============================================
-- Projekt L - Quest Expiry Notification Tracking
-- Migration: 20260201_quest_expiry_notification.sql
-- Purpose: Track when users have been notified about expiring quests
-- ============================================

-- Add expiry_notified_at column to track when notification was sent
-- This prevents duplicate notifications for the same quest expiry
ALTER TABLE quests
ADD COLUMN IF NOT EXISTS expiry_notified_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quests.expiry_notified_at IS 'Timestamp when the 24h expiry warning notification was sent. NULL means not yet notified.';

-- Create index for efficient lookup of quests needing expiry notification
-- Only index active quests that haven't been notified yet and have an expiry date
CREATE INDEX IF NOT EXISTS idx_quests_expiry_notification
ON quests(expires_at, user_id)
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expiry_notified_at IS NULL;

-- ============================================
-- End Migration
-- ============================================
