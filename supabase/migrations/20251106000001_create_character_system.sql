-- Character System Tables
-- Created: 2025-11-06
-- Description: Tables for character interaction system (Muskva, Johnny, Panda, Tapka & Potapka)

-- =====================================================
-- Table: character_interactions
-- Purpose: Store all interactions between users and characters
-- =====================================================
CREATE TABLE IF NOT EXISTS character_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,

  -- Character info
  character_name TEXT NOT NULL CHECK (character_name IN ('muskva', 'johnny', 'panda', 'tapka_potapka')),
  mood TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Interaction context
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('feedback', 'event', 'random')),
  event_type TEXT CHECK (event_type IN ('coffee_break', 'union_protest', 'fns_scare', 'glasha_mention', NULL)),

  -- Context data (for analytics)
  context JSONB DEFAULT '{}'::jsonb,
  -- Example: {
  --   "attemptNumber": 3,
  --   "qualityScore": 85,
  --   "isCorrect": true,
  --   "consecutiveErrors": 0
  -- }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_character_interactions_user ON character_interactions(user_id);
CREATE INDEX idx_character_interactions_character ON character_interactions(character_name);
CREATE INDEX idx_character_interactions_type ON character_interactions(interaction_type);
CREATE INDEX idx_character_interactions_created ON character_interactions(created_at DESC);

-- =====================================================
-- Table: character_events_history
-- Purpose: Track event triggers for cooldown management
-- =====================================================
CREATE TABLE IF NOT EXISTS character_events_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  cooldown_until TIMESTAMPTZ NOT NULL,

  -- Event metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_events_history_user ON character_events_history(user_id);
CREATE INDEX idx_events_history_cooldown ON character_events_history(cooldown_until);
CREATE INDEX idx_events_history_type ON character_events_history(event_type);

-- =====================================================
-- Table: user_character_preferences
-- Purpose: Adapt character behavior based on user reactions
-- =====================================================
CREATE TABLE IF NOT EXISTS user_character_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Favorite character tracking
  favorite_character TEXT,
  interaction_counts JSONB DEFAULT '{}'::jsonb,
  -- Example: {"muskva": 15, "johnny": 23, "panda": 5, "tapka_potapka": 3}

  -- Response tracking (for adaptation)
  response_to_muskva TEXT CHECK (response_to_muskva IN ('motivated', 'discouraged', 'neutral', NULL)),
  response_to_johnny TEXT CHECK (response_to_johnny IN ('motivated', 'discouraged', 'neutral', NULL)),

  -- Preferences
  prefers_support BOOLEAN DEFAULT TRUE,  -- Does user prefer supportive Johnny?

  -- Last event info
  last_event JSONB DEFAULT '{}'::jsonb,
  -- Example: {"type": "coffee_break", "timestamp": "2025-11-06T12:00:00Z"}

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE character_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_events_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_character_preferences ENABLE ROW LEVEL SECURITY;

-- character_interactions policies
CREATE POLICY "Users can view own character interactions"
  ON character_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all character interactions"
  ON character_interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "System can create character interactions"
  ON character_interactions FOR INSERT
  WITH CHECK (true);

-- character_events_history policies
CREATE POLICY "Users can view own event history"
  ON character_events_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage event history"
  ON character_events_history FOR ALL
  USING (true)
  WITH CHECK (true);

-- user_character_preferences policies
CREATE POLICY "Users can view own preferences"
  ON user_character_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_character_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert preferences"
  ON user_character_preferences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Teachers can view all preferences"
  ON user_character_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to check if event is on cooldown
CREATE OR REPLACE FUNCTION is_event_on_cooldown(
  p_user_id UUID,
  p_event_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM character_events_history
    WHERE user_id = p_user_id
      AND event_type = p_event_type
      AND cooldown_until > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's character interaction stats
CREATE OR REPLACE FUNCTION get_character_stats(p_user_id UUID)
RETURNS TABLE (
  character_name TEXT,
  total_interactions BIGINT,
  feedback_count BIGINT,
  event_count BIGINT,
  last_interaction TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.character_name,
    COUNT(*) as total_interactions,
    COUNT(*) FILTER (WHERE ci.interaction_type = 'feedback') as feedback_count,
    COUNT(*) FILTER (WHERE ci.interaction_type = 'event') as event_count,
    MAX(ci.created_at) as last_interaction
  FROM character_interactions ci
  WHERE ci.user_id = p_user_id
  GROUP BY ci.character_name
  ORDER BY total_interactions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE character_interactions IS 'Stores all character-user interactions for feedback and events';
COMMENT ON TABLE character_events_history IS 'Tracks event triggers for cooldown management';
COMMENT ON TABLE user_character_preferences IS 'Stores user preferences for adaptive character behavior';

COMMENT ON FUNCTION is_event_on_cooldown IS 'Check if a specific event type is on cooldown for a user';
COMMENT ON FUNCTION get_character_stats IS 'Get character interaction statistics for a user';
