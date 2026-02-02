-- AI Memory Tables
-- Phase 3: Lebendiger Buddy
-- conversation_history: ALL AI conversations (Single Source of Truth)
-- user_summaries: Weekly summaries and learned patterns

-- =============================================
-- CONVERSATION HISTORY TABLE
-- Stores ALL messages between user and AI
-- No cleanup limit - this is the permanent record
-- =============================================

CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Message Content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Tool Usage (optional, for AI responses with tool calls)
  tool_calls JSONB,
  tool_results JSONB,

  -- Metadata
  tokens_used INTEGER,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'telegram', 'api')),

  -- RAG Reference (populated by P3-01b)
  qdrant_point_id BIGINT, -- Reference to Qdrant embedding point
  embedding_created_at TIMESTAMPTZ, -- When embedding was created

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER SUMMARIES TABLE
-- AI-generated weekly summaries and patterns
-- One row per user (updated weekly by cron)
-- =============================================

CREATE TABLE IF NOT EXISTS user_summaries (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Weekly Summary (AI-generated, covers past week)
  weekly_summary TEXT,

  -- Learned Preferences (accumulated from conversations)
  -- e.g., {"prefers_morning_quests": true, "likes_fitness": true}
  preferences JSONB DEFAULT '{}',

  -- Recognized Patterns (AI-detected behavior patterns)
  -- e.g., {"active_days": ["monday", "wednesday"], "peak_hours": [9, 17]}
  patterns JSONB DEFAULT '{}',

  -- Statistics
  conversation_count INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  last_conversation_at TIMESTAMPTZ,

  -- Summary Generation Tracking
  last_summary_at TIMESTAMPTZ,
  last_summary_message_count INTEGER DEFAULT 0, -- Messages included in last summary

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- Optimized for common queries
-- =============================================

-- Find user conversations ordered by time (for sliding window)
CREATE INDEX IF NOT EXISTS idx_conv_history_user_created
  ON conversation_history(user_id, created_at DESC);

-- Find conversations without embeddings (for RAG backfill)
CREATE INDEX IF NOT EXISTS idx_conv_history_no_embedding
  ON conversation_history(user_id)
  WHERE qdrant_point_id IS NULL;

-- Find conversations by source (for analytics)
CREATE INDEX IF NOT EXISTS idx_conv_history_source
  ON conversation_history(source);

-- =============================================
-- ROW LEVEL SECURITY (CRITICAL for user isolation!)
-- =============================================

ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_summaries ENABLE ROW LEVEL SECURITY;

-- conversation_history: Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
  ON conversation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON conversation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert for API calls (Telegram, etc.)
CREATE POLICY "Service role can insert conversations"
  ON conversation_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- user_summaries: Users can only see their own summaries
CREATE POLICY "Users can view own summaries"
  ON user_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own summaries (for preferences)
CREATE POLICY "Users can update own summaries"
  ON user_summaries FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow upsert for system/cron (service role)
CREATE POLICY "Service role can manage summaries"
  ON user_summaries FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- AUTO-INIT FUNCTION
-- Creates user_summaries row on first conversation
-- =============================================

CREATE OR REPLACE FUNCTION init_user_summary_on_first_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert user_summaries row if not exists
  INSERT INTO user_summaries (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    conversation_count = user_summaries.conversation_count + 1,
    total_messages = user_summaries.total_messages + 1,
    last_conversation_at = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Trigger on conversation insert
DROP TRIGGER IF EXISTS init_user_summary_trigger ON conversation_history;
CREATE TRIGGER init_user_summary_trigger
  AFTER INSERT ON conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION init_user_summary_on_first_conversation();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get recent messages for sliding window (default 50)
CREATE OR REPLACE FUNCTION get_recent_messages(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  role TEXT,
  content TEXT,
  tool_calls JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT
    ch.id,
    ch.role,
    ch.content,
    ch.tool_calls,
    ch.created_at
  FROM conversation_history ch
  WHERE ch.user_id = p_user_id
  ORDER BY ch.created_at DESC
  LIMIT p_limit;
$$;

-- Get user summary with conversation stats
CREATE OR REPLACE FUNCTION get_user_memory_context(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_summary RECORD;
  v_result JSONB;
BEGIN
  -- Get user summary
  SELECT *
  INTO v_summary
  FROM user_summaries
  WHERE user_id = p_user_id;

  -- If no summary exists, return minimal context
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_history', false,
      'weekly_summary', null,
      'preferences', '{}'::jsonb,
      'patterns', '{}'::jsonb,
      'conversation_count', 0
    );
  END IF;

  -- Build context object
  v_result := jsonb_build_object(
    'has_history', true,
    'weekly_summary', v_summary.weekly_summary,
    'preferences', COALESCE(v_summary.preferences, '{}'::jsonb),
    'patterns', COALESCE(v_summary.patterns, '{}'::jsonb),
    'conversation_count', v_summary.conversation_count,
    'last_summary_at', v_summary.last_summary_at
  );

  RETURN v_result;
END;
$$;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

GRANT SELECT, INSERT ON conversation_history TO authenticated;
GRANT SELECT, UPDATE ON user_summaries TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_memory_context TO authenticated;
