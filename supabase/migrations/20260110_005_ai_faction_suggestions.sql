-- ============================================
-- AI FACTION SUGGESTIONS & FEEDBACK
-- Phase 5: ML Training Data Collection
-- ============================================

-- Table: ai_faction_suggestions_feedback
-- Stores user feedback on AI faction suggestions for ML training

CREATE TABLE IF NOT EXISTS ai_faction_suggestions_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Activity Context
  activity_description TEXT NOT NULL,
  activity_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activity_hour INT NOT NULL CHECK (activity_hour >= 0 AND activity_hour <= 23),
  activity_day_of_week TEXT NOT NULL,
  duration_minutes INT,
  location TEXT,

  -- AI Suggestion
  suggested_faction_id faction_key NOT NULL,
  confidence_score INT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  suggestion_reasoning TEXT,

  -- User Feedback
  actual_faction_id faction_key NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE if user accepted suggestion

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  CONSTRAINT unique_feedback UNIQUE (user_id, activity_timestamp, suggested_faction_id)
);

-- Index for ML training queries
CREATE INDEX idx_faction_feedback_user ON ai_faction_suggestions_feedback(user_id);
CREATE INDEX idx_faction_feedback_timestamp ON ai_faction_suggestions_feedback(activity_timestamp DESC);
CREATE INDEX idx_faction_feedback_accepted ON ai_faction_suggestions_feedback(accepted);

-- RLS Policies
ALTER TABLE ai_faction_suggestions_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON ai_faction_suggestions_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON ai_faction_suggestions_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Analytics View: Suggestion Accuracy per User
CREATE OR REPLACE VIEW ai_faction_suggestion_accuracy AS
SELECT
  user_id,
  COUNT(*) as total_suggestions,
  SUM(CASE WHEN accepted THEN 1 ELSE 0 END) as accepted_suggestions,
  ROUND(
    (SUM(CASE WHEN accepted THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100,
    2
  ) as acceptance_rate_percent,
  AVG(confidence_score) as avg_confidence,
  AVG(CASE WHEN accepted THEN confidence_score END) as avg_confidence_when_accepted,
  AVG(CASE WHEN NOT accepted THEN confidence_score END) as avg_confidence_when_rejected
FROM ai_faction_suggestions_feedback
GROUP BY user_id;

-- Analytics View: Faction Confusion Matrix
-- Shows which factions are often confused (suggested vs actual)
CREATE OR REPLACE VIEW ai_faction_confusion_matrix AS
SELECT
  suggested_faction_id,
  actual_faction_id,
  COUNT(*) as frequency,
  AVG(confidence_score) as avg_confidence,
  SUM(CASE WHEN accepted THEN 1 ELSE 0 END) as times_accepted
FROM ai_faction_suggestions_feedback
GROUP BY suggested_faction_id, actual_faction_id
ORDER BY frequency DESC;

COMMENT ON TABLE ai_faction_suggestions_feedback IS
'Stores user feedback on AI-suggested factions for ML training and accuracy improvement';
