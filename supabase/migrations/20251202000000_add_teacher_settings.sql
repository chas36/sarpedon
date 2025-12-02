-- Create teacher_settings table for AI model selection and preferences
CREATE TABLE IF NOT EXISTS teacher_settings (
  teacher_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- AI Provider Configuration
  ai_provider TEXT NOT NULL DEFAULT 'groq' CHECK (ai_provider IN ('groq', 'openrouter')),
  ai_model TEXT NOT NULL DEFAULT 'llama-3.1-8b-instant',

  -- API Keys (encrypted at application level)
  groq_api_key TEXT,
  openrouter_api_key TEXT,

  -- AI Parameters
  ai_temperature DECIMAL(3,2) DEFAULT 0.3 CHECK (ai_temperature >= 0 AND ai_temperature <= 2),
  ai_max_tokens INTEGER DEFAULT 1000 CHECK (ai_max_tokens > 0 AND ai_max_tokens <= 4096),
  ai_top_p DECIMAL(3,2) DEFAULT 0.9 CHECK (ai_top_p >= 0 AND ai_top_p <= 1),

  -- Feature Toggles
  ai_enabled BOOLEAN DEFAULT true,
  ai_hints_enabled BOOLEAN DEFAULT true,

  -- Feedback Style
  feedback_style TEXT DEFAULT 'adaptive' CHECK (feedback_style IN ('adaptive', 'detailed', 'concise', 'minimal')),

  -- Connection Status (for monitoring)
  last_connection_check TIMESTAMPTZ,
  connection_status TEXT DEFAULT 'unknown' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'unknown')),
  connection_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teacher_settings_teacher_id ON teacher_settings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_settings_ai_provider ON teacher_settings(ai_provider);

-- Add RLS policies
ALTER TABLE teacher_settings ENABLE ROW LEVEL SECURITY;

-- Teachers can only view and update their own settings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teacher_settings' AND policyname = 'Teachers can view own settings'
  ) THEN
    CREATE POLICY "Teachers can view own settings"
      ON teacher_settings
      FOR SELECT
      TO authenticated
      USING (
        teacher_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'teacher'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teacher_settings' AND policyname = 'Teachers can insert own settings'
  ) THEN
    CREATE POLICY "Teachers can insert own settings"
      ON teacher_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (
        teacher_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'teacher'
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'teacher_settings' AND policyname = 'Teachers can update own settings'
  ) THEN
    CREATE POLICY "Teachers can update own settings"
      ON teacher_settings
      FOR UPDATE
      TO authenticated
      USING (
        teacher_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'teacher'
        )
      );
  END IF;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teacher_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teacher_settings_updated_at ON teacher_settings;
CREATE TRIGGER teacher_settings_updated_at
  BEFORE UPDATE ON teacher_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_settings_updated_at();

-- Function to initialize default settings for a teacher
CREATE OR REPLACE FUNCTION initialize_teacher_settings(p_teacher_id UUID)
RETURNS teacher_settings AS $$
DECLARE
  v_settings teacher_settings;
BEGIN
  -- Insert default settings if they don't exist
  INSERT INTO teacher_settings (teacher_id)
  VALUES (p_teacher_id)
  ON CONFLICT (teacher_id) DO NOTHING
  RETURNING * INTO v_settings;

  -- If settings already existed, return them
  IF v_settings IS NULL THEN
    SELECT * INTO v_settings
    FROM teacher_settings
    WHERE teacher_id = p_teacher_id;
  END IF;

  RETURN v_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION initialize_teacher_settings(UUID) TO authenticated;

-- Comment on table and columns
COMMENT ON TABLE teacher_settings IS 'Stores teacher-specific AI assistant settings and preferences';
COMMENT ON COLUMN teacher_settings.ai_provider IS 'AI provider: groq or openrouter';
COMMENT ON COLUMN teacher_settings.ai_model IS 'Model identifier (e.g., llama-3.1-8b-instant, claude-3-5-sonnet)';
COMMENT ON COLUMN teacher_settings.feedback_style IS 'How AI feedback is presented to students';
COMMENT ON COLUMN teacher_settings.connection_status IS 'Current connection status with AI provider';
