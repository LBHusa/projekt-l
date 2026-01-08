-- Add recurring transaction scheduling fields
-- Extends existing is_recurring and recurring_frequency columns

-- Add next_occurrence to track when the next instance should be created
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS next_occurrence DATE;

-- Add recurrence_end_date to optionally end the recurring series
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;

-- Index for efficient recurring transaction queries
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_due
ON transactions(is_recurring, next_occurrence)
WHERE is_recurring = true;

-- Update existing recurring transactions to set next_occurrence
-- Sets it to one interval after the original occurred_at date
UPDATE transactions
SET next_occurrence = CASE recurring_frequency
    WHEN 'daily' THEN occurred_at + INTERVAL '1 day'
    WHEN 'weekly' THEN occurred_at + INTERVAL '1 week'
    WHEN 'biweekly' THEN occurred_at + INTERVAL '2 weeks'
    WHEN 'monthly' THEN occurred_at + INTERVAL '1 month'
    WHEN 'quarterly' THEN occurred_at + INTERVAL '3 months'
    WHEN 'yearly' THEN occurred_at + INTERVAL '1 year'
    ELSE occurred_at + INTERVAL '1 month'
END
WHERE is_recurring = true AND next_occurrence IS NULL;
