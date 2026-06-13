-- ========================================
-- SARPEDON MIGRATIONS - DASHBOARD APPLICATION
-- ========================================
-- Apply these migrations in the Supabase Dashboard SQL Editor
-- Go to: https://app.supabase.com → Your Project → SQL Editor
-- Copy and paste this entire file, then click "Run"
-- ========================================

-- Migration 1: Character System (20251107000002)
-- ========================================
-- Character System Tables
-- Created: 2025-11-06
-- Description: Tables for character interaction system (Muskva, Johnny, Panda, Tapka & Potapka)

-- =====================================================
-- Enable UUID extension
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
CREATE INDEX IF NOT EXISTS idx_character_interactions_user ON character_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_character_interactions_character ON character_interactions(character_name);
CREATE INDEX IF NOT EXISTS idx_character_interactions_type ON character_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_character_interactions_created ON character_interactions(created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_events_history_user ON character_events_history(user_id);
CREATE INDEX IF NOT EXISTS idx_events_history_cooldown ON character_events_history(cooldown_until);
CREATE INDEX IF NOT EXISTS idx_events_history_type ON character_events_history(event_type);

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

-- Migration 2: Proficiency Levels (20251108000000)
-- ========================================
-- Migration: Add Proficiency Level System to Sarpedon
-- Description: Adds student proficiency tracking for adaptive AI feedback
-- Date: 2025-11-08
-- Version: 1.0
-- Author: AI Prompts Improvement Initiative

-- =============================================================================
-- 1. ADD PROFICIENCY COLUMNS TO PROFILES TABLE
-- =============================================================================

-- Add proficiency level tracking columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS proficiency_level TEXT DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS proficiency_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS proficiency_last_assessed TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS proficiency_manual_override BOOLEAN DEFAULT false;

-- Add check constraint for valid proficiency levels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_proficiency_level' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT check_proficiency_level
    CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced'));
  END IF;
END $$;

-- Add indexes for faster queries by proficiency level
CREATE INDEX IF NOT EXISTS idx_profiles_proficiency
ON public.profiles(proficiency_level)
WHERE role = 'student';

-- Add index for proficiency score queries
CREATE INDEX IF NOT EXISTS idx_profiles_proficiency_score
ON public.profiles(proficiency_score)
WHERE role = 'student';

COMMENT ON COLUMN public.profiles.proficiency_level IS 'Student skill level: beginner (0-40), intermediate (41-70), advanced (71-100)';
COMMENT ON COLUMN public.profiles.proficiency_score IS 'Calculated proficiency score (0-100) based on completion rate, quality, and issues';
COMMENT ON COLUMN public.profiles.proficiency_last_assessed IS 'Timestamp of last automatic proficiency calculation';
COMMENT ON COLUMN public.profiles.proficiency_manual_override IS 'If true, teacher manually set the level (prevents auto-updates)';

-- =============================================================================
-- 2. NOTE: DIFFICULTY FIELD
-- =============================================================================
-- NOTE: The 'difficulty' field in levels table already exists as INTEGER (1-10)
-- from migration 20251106000000_change_difficulty_to_scale.sql
-- No changes needed here.

-- =============================================================================
-- 3. CREATE PROFICIENCY HISTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.proficiency_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_level TEXT,
  new_level TEXT NOT NULL,
  old_score INTEGER,
  new_score INTEGER NOT NULL,
  reason TEXT NOT NULL,  -- 'auto_calculation' | 'manual_override' | 'initial_assessment' | 'migration'
  changed_by UUID REFERENCES public.profiles(id),  -- NULL for auto, teacher ID for manual
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proficiency_history_user
ON public.proficiency_history(user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_proficiency_history_reason
ON public.proficiency_history(reason);

COMMENT ON TABLE public.proficiency_history IS 'Tracks changes in student proficiency levels over time';
COMMENT ON COLUMN public.proficiency_history.reason IS 'Reason for level change: auto_calculation, manual_override, initial_assessment, migration';
COMMENT ON COLUMN public.proficiency_history.changed_by IS 'Teacher who made manual change, NULL for automatic updates';

-- =============================================================================
-- 4. CREATE FUNCTION TO CALCULATE PROFICIENCY SCORE
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_proficiency_score(p_student_id UUID)
RETURNS TABLE(score INTEGER, level TEXT) AS $$
DECLARE
  completion_rate FLOAT;
  avg_quality FLOAT;
  avg_issues_count FLOAT;
  final_score INTEGER;
  final_level TEXT;
BEGIN
  -- Calculate metrics
  SELECT
    -- Completion rate (40% weight)
    COALESCE(
      COUNT(*) FILTER (WHERE lp.status = 'completed')::FLOAT /
      NULLIF(COUNT(*), 0) * 40,
      0
    ),
    -- Average quality score (40% weight) - from quality_metrics JSONB
    COALESCE(
      AVG((s.quality_metrics->>'overall_score')::INTEGER) FILTER (WHERE s.quality_metrics->>'overall_score' IS NOT NULL) * 0.4,
      0
    ),
    -- Success rate penalty (20% weight - more failures = lower score)
    COALESCE(
      20 - LEAST(COUNT(*) FILTER (WHERE s.status = 'failed')::FLOAT / NULLIF(COUNT(*), 0) * 20, 20),
      0
    )
  INTO completion_rate, avg_quality, avg_issues_count
  FROM public.level_progress lp
  LEFT JOIN public.submissions s ON s.user_id = lp.student_id AND s.level_id = lp.level_id
  WHERE lp.student_id = p_student_id;

  -- Calculate final score
  final_score := GREATEST(0, LEAST(100,
    ROUND(completion_rate + avg_quality + avg_issues_count)::INTEGER
  ));

  -- Determine level based on score
  final_level := CASE
    WHEN final_score < 41 THEN 'beginner'
    WHEN final_score < 71 THEN 'intermediate'
    ELSE 'advanced'
  END;

  RETURN QUERY SELECT final_score, final_level;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_proficiency_score IS 'Calculates student proficiency score (0-100) and level based on completion, quality, and issues';

-- =============================================================================
-- 5. CREATE TRIGGER FUNCTION TO AUTO-UPDATE PROFICIENCY
-- =============================================================================

CREATE OR REPLACE FUNCTION update_student_proficiency()
RETURNS TRIGGER AS $$
DECLARE
  new_score INTEGER;
  new_level TEXT;
  old_level TEXT;
  old_score INTEGER;
BEGIN
  -- Get current level and score
  SELECT proficiency_level, proficiency_score
  INTO old_level, old_score
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Only update if not manually overridden
  IF (SELECT proficiency_manual_override FROM public.profiles WHERE id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Calculate new proficiency
  SELECT calc.score, calc.level INTO new_score, new_level
  FROM calculate_proficiency_score(NEW.user_id) AS calc;

  -- Update profile
  UPDATE public.profiles
  SET
    proficiency_score = new_score,
    proficiency_level = new_level,
    proficiency_last_assessed = NOW()
  WHERE id = NEW.user_id;

  -- Log history if level changed
  IF old_level IS DISTINCT FROM new_level THEN
    INSERT INTO public.proficiency_history (user_id, old_level, new_level, old_score, new_score, reason)
    VALUES (NEW.user_id, old_level, new_level, old_score, new_score, 'auto_calculation');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_student_proficiency IS 'Trigger function that recalculates student proficiency after each submission';

-- =============================================================================
-- 6. CREATE TRIGGER ON SUBMISSIONS TABLE
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_update_proficiency ON public.submissions;

CREATE TRIGGER trigger_update_proficiency
AFTER INSERT ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION update_student_proficiency();

COMMENT ON TRIGGER trigger_update_proficiency ON public.submissions IS 'Automatically updates student proficiency level after each submission';

-- =============================================================================
-- 7. CREATE HELPER FUNCTIONS FOR TEACHERS
-- =============================================================================

-- Function to manually set student proficiency level
CREATE OR REPLACE FUNCTION set_student_proficiency_manual(
  p_student_id UUID,
  p_new_level TEXT,
  p_teacher_id UUID,
  p_reason_text TEXT DEFAULT 'manual_override'
)
RETURNS BOOLEAN AS $$
DECLARE
  old_level TEXT;
  old_score INTEGER;
BEGIN
  -- Validate level
  IF p_new_level NOT IN ('beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'Invalid proficiency level: %', p_new_level;
  END IF;

  -- Validate student exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_student_id AND role = 'student') THEN
    RAISE EXCEPTION 'Student not found: %', p_student_id;
  END IF;

  -- Get current values
  SELECT proficiency_level, proficiency_score
  INTO old_level, old_score
  FROM public.profiles
  WHERE id = p_student_id;

  -- Update profile
  UPDATE public.profiles
  SET
    proficiency_level = p_new_level,
    proficiency_manual_override = true,
    proficiency_last_assessed = NOW()
  WHERE id = p_student_id;

  -- Log history
  INSERT INTO public.proficiency_history (
    user_id, old_level, new_level, old_score, new_score, reason, changed_by
  ) VALUES (
    p_student_id, old_level, p_new_level, old_score,
    CASE p_new_level
      WHEN 'beginner' THEN 20
      WHEN 'intermediate' THEN 55
      WHEN 'advanced' THEN 85
    END,
    p_reason_text, p_teacher_id
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_student_proficiency_manual IS 'Allows teachers to manually override student proficiency level';

-- Function to re-enable auto-calculation
CREATE OR REPLACE FUNCTION enable_auto_proficiency(p_student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.profiles
  SET proficiency_manual_override = false
  WHERE id = p_student_id AND role = 'student';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enable_auto_proficiency IS 'Re-enables automatic proficiency calculation for a student';

-- =============================================================================
-- 8. CREATE ANALYTICS VIEWS
-- =============================================================================

-- View: Class proficiency distribution
CREATE OR REPLACE VIEW class_proficiency_stats AS
SELECT
  class,
  COUNT(*) FILTER (WHERE proficiency_level = 'beginner') as beginners,
  COUNT(*) FILTER (WHERE proficiency_level = 'intermediate') as intermediate,
  COUNT(*) FILTER (WHERE proficiency_level = 'advanced') as advanced,
  ROUND(AVG(proficiency_score)::NUMERIC, 1) as avg_score,
  COUNT(*) as total_students
FROM public.profiles
WHERE role = 'student' AND class IS NOT NULL
GROUP BY class;

COMMENT ON VIEW class_proficiency_stats IS 'Proficiency distribution by class for teacher analytics';

-- View: Students who recently leveled up
CREATE OR REPLACE VIEW recent_proficiency_changes AS
SELECT
  ph.user_id,
  p.first_name,
  p.last_name,
  p.class,
  ph.old_level,
  ph.new_level,
  ph.new_score,
  ph.reason,
  ph.changed_at,
  CASE
    WHEN ph.new_level = 'intermediate' AND ph.old_level = 'beginner' THEN 'Beginner → Intermediate'
    WHEN ph.new_level = 'advanced' AND ph.old_level = 'intermediate' THEN 'Intermediate → Advanced'
    WHEN ph.new_level = 'advanced' AND ph.old_level = 'beginner' THEN 'Beginner → Advanced'
    ELSE 'Level Down'
  END as progression
FROM public.proficiency_history ph
JOIN public.profiles p ON p.id = ph.user_id
WHERE ph.changed_at > NOW() - INTERVAL '7 days'
  AND ph.old_level IS NOT NULL
  AND ph.new_level != ph.old_level
ORDER BY ph.changed_at DESC;

COMMENT ON VIEW recent_proficiency_changes IS 'Students who changed proficiency levels in the last 7 days';

-- =============================================================================
-- 9. RLS POLICIES (Row Level Security)
-- =============================================================================

-- Enable RLS on proficiency_history if not already enabled
ALTER TABLE public.proficiency_history ENABLE ROW LEVEL SECURITY;

-- Students can view their own proficiency history
DROP POLICY IF EXISTS proficiency_history_select_own ON public.proficiency_history;
CREATE POLICY proficiency_history_select_own
ON public.proficiency_history FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'editor')
  )
);

-- Only system can insert (via trigger)
DROP POLICY IF EXISTS proficiency_history_insert ON public.proficiency_history;
CREATE POLICY proficiency_history_insert
ON public.proficiency_history FOR INSERT
WITH CHECK (false);  -- Prevent manual inserts, only via trigger/function

-- =============================================================================
-- 10. GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.proficiency_history TO authenticated;
GRANT SELECT ON class_proficiency_stats TO authenticated;
GRANT SELECT ON recent_proficiency_changes TO authenticated;

-- Grant execute on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION set_student_proficiency_manual TO authenticated;
GRANT EXECUTE ON FUNCTION enable_auto_proficiency TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_proficiency_score TO authenticated;

-- =============================================================================
-- 11. MIGRATE EXISTING STUDENTS
-- =============================================================================

-- Calculate proficiency for all existing students
DO $$
DECLARE
  student_record RECORD;
  calc_score INTEGER;
  calc_level TEXT;
BEGIN
  FOR student_record IN
    SELECT id FROM public.profiles WHERE role = 'student'
  LOOP
    -- Calculate proficiency
    SELECT calc.score, calc.level INTO calc_score, calc_level
    FROM calculate_proficiency_score(student_record.id) AS calc;

    -- Update profile
    UPDATE public.profiles
    SET
      proficiency_score = calc_score,
      proficiency_level = calc_level,
      proficiency_last_assessed = NOW()
    WHERE id = student_record.id;

    -- Log initial assessment
    INSERT INTO public.proficiency_history (user_id, old_level, new_level, old_score, new_score, reason)
    VALUES (student_record.id, NULL, calc_level, NULL, calc_score, 'migration');
  END LOOP;

  RAISE NOTICE 'Migrated proficiency levels for existing students';
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Verify migration
DO $$
DECLARE
  total_students INTEGER;
  total_with_proficiency INTEGER;
  beginner_count INTEGER;
  intermediate_count INTEGER;
  advanced_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_students
  FROM public.profiles WHERE role = 'student';

  SELECT COUNT(*) INTO total_with_proficiency
  FROM public.profiles WHERE role = 'student' AND proficiency_level IS NOT NULL;

  SELECT COUNT(*) INTO beginner_count
  FROM public.profiles WHERE proficiency_level = 'beginner';

  SELECT COUNT(*) INTO intermediate_count
  FROM public.profiles WHERE proficiency_level = 'intermediate';

  SELECT COUNT(*) INTO advanced_count
  FROM public.profiles WHERE proficiency_level = 'advanced';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'PROFICIENCY SYSTEM MIGRATION COMPLETE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total students: %', total_students;
  RAISE NOTICE 'Students with proficiency: %', total_with_proficiency;
  RAISE NOTICE '';
  RAISE NOTICE 'Distribution:';
  RAISE NOTICE '  Beginner: %', beginner_count;
  RAISE NOTICE '  Intermediate: %', intermediate_count;
  RAISE NOTICE '  Advanced: %', advanced_count;
  RAISE NOTICE '===========================================';
END $$;

-- Migration 3: Skill Tracking (20251109000000)
-- ========================================
-- ============================================
-- Migration: Add Skill Tracking System
-- Description: Tracks student skills and weak areas for adaptive learning
-- ============================================

-- Create skill_categories table
CREATE TABLE IF NOT EXISTS public.skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category UUID REFERENCES public.skill_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_skill_profile table
CREATE TABLE IF NOT EXISTS public.user_skill_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_category_id UUID NOT NULL REFERENCES public.skill_categories(id) ON DELETE CASCADE,
  proficiency INTEGER NOT NULL DEFAULT 0 CHECK (proficiency >= 0 AND proficiency <= 100),
  mistake_count INTEGER NOT NULL DEFAULT 0,
  practice_count INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_category_id)
);

-- Add indexes
CREATE INDEX idx_user_skill_profile_user_id ON public.user_skill_profile(user_id);
CREATE INDEX idx_user_skill_profile_skill_category_id ON public.user_skill_profile(skill_category_id);
CREATE INDEX idx_user_skill_profile_proficiency ON public.user_skill_profile(proficiency);

-- Enable RLS
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill_categories (read-only for all authenticated users)
CREATE POLICY "Everyone can view skill categories"
  ON public.skill_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_skill_profile
CREATE POLICY "Students can view own skill profile"
  ON public.user_skill_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view all skill profiles"
  ON public.user_skill_profile FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

CREATE POLICY "System can insert skill profiles"
  ON public.user_skill_profile FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update skill profiles"
  ON public.user_skill_profile FOR UPDATE
  TO authenticated
  USING (true);

-- Insert default skill categories
INSERT INTO public.skill_categories (name, description) VALUES
  ('syntax', 'Синтаксис и базовые конструкции языка'),
  ('variables', 'Переменные и типы данных'),
  ('operators', 'Операторы и выражения'),
  ('conditionals', 'Условные операторы (if/else)'),
  ('loops', 'Циклы (for/while)'),
  ('functions', 'Функции и методы'),
  ('arrays', 'Массивы и списки'),
  ('strings', 'Строки и работа с текстом'),
  ('objects', 'Объекты и структуры данных'),
  ('debugging', 'Отладка и поиск ошибок'),
  ('algorithms', 'Алгоритмы и логика'),
  ('io', 'Ввод/вывод данных')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Function: Get student weak areas
-- ============================================
CREATE OR REPLACE FUNCTION get_student_weak_areas(p_user_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE(
  skill_name TEXT,
  proficiency INTEGER,
  mistake_count INTEGER,
  practice_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.name,
    usp.proficiency,
    usp.mistake_count,
    usp.practice_count
  FROM public.user_skill_profile usp
  JOIN public.skill_categories sc ON sc.id = usp.skill_category_id
  WHERE usp.user_id = p_user_id
  ORDER BY usp.proficiency ASC, usp.mistake_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Update skill proficiency based on submission
-- ============================================
CREATE OR REPLACE FUNCTION update_skill_proficiency(
  p_user_id UUID,
  p_skill_name TEXT,
  p_success BOOLEAN,
  p_quality_score INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_skill_category_id UUID;
  v_current_proficiency INTEGER;
  v_proficiency_change INTEGER;
BEGIN
  -- Get skill category ID
  SELECT id INTO v_skill_category_id
  FROM public.skill_categories
  WHERE name = p_skill_name;

  IF v_skill_category_id IS NULL THEN
    RAISE NOTICE 'Skill category % not found', p_skill_name;
    RETURN;
  END IF;

  -- Insert or get current proficiency
  INSERT INTO public.user_skill_profile (user_id, skill_category_id, proficiency, practice_count)
  VALUES (p_user_id, v_skill_category_id, 50, 0)
  ON CONFLICT (user_id, skill_category_id) DO NOTHING;

  SELECT proficiency INTO v_current_proficiency
  FROM public.user_skill_profile
  WHERE user_id = p_user_id AND skill_category_id = v_skill_category_id;

  -- Calculate proficiency change
  IF p_success THEN
    IF p_quality_score IS NOT NULL THEN
      -- Use quality score to adjust proficiency
      v_proficiency_change := CASE
        WHEN p_quality_score >= 90 THEN 5
        WHEN p_quality_score >= 70 THEN 3
        ELSE 2
      END;
    ELSE
      v_proficiency_change := 3;
    END IF;

    -- Update proficiency (increase)
    UPDATE public.user_skill_profile
    SET
      proficiency = LEAST(100, proficiency + v_proficiency_change),
      practice_count = practice_count + 1,
      last_practiced_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id AND skill_category_id = v_skill_category_id;
  ELSE
    -- Failed submission - increase mistake count, decrease proficiency
    UPDATE public.user_skill_profile
    SET
      proficiency = GREATEST(0, proficiency - 2),
      mistake_count = mistake_count + 1,
      practice_count = practice_count + 1,
      last_practiced_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id AND skill_category_id = v_skill_category_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Analyze submission and update skills
-- ============================================
CREATE OR REPLACE FUNCTION analyze_submission_skills(p_submission_id UUID)
RETURNS VOID AS $$
DECLARE
  v_submission RECORD;
  v_level RECORD;
  v_skill TEXT;
  v_quality_score INTEGER;
BEGIN
  -- Get submission details
  SELECT * INTO v_submission
  FROM public.submissions
  WHERE id = p_submission_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get level details
  SELECT * INTO v_level
  FROM public.levels
  WHERE id = v_submission.level_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Extract quality score
  v_quality_score := (v_submission.quality_metrics->>'overall_score')::INTEGER;

  -- Update proficiency for each target skill in the level
  IF v_level.target_skills IS NOT NULL THEN
    FOREACH v_skill IN ARRAY v_level.target_skills
    LOOP
      PERFORM update_skill_proficiency(
        v_submission.user_id,
        v_skill,
        v_submission.status = 'passed',
        v_quality_score
      );
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger: Auto-analyze skills on submission
-- ============================================
CREATE OR REPLACE FUNCTION trigger_analyze_submission_skills()
RETURNS TRIGGER AS $$
BEGIN
  -- Only analyze when submission is completed (not pending)
  IF NEW.status IN ('passed', 'failed') AND
     (OLD IS NULL OR OLD.status = 'pending') THEN
    PERFORM analyze_submission_skills(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_submission_complete_analyze_skills ON public.submissions;
CREATE TRIGGER after_submission_complete_analyze_skills
  AFTER INSERT OR UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analyze_submission_skills();

-- ============================================
-- Grant permissions
-- ============================================
GRANT SELECT ON public.skill_categories TO authenticated;
GRANT SELECT ON public.user_skill_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_weak_areas TO authenticated;
GRANT EXECUTE ON FUNCTION update_skill_proficiency TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_submission_skills TO authenticated;

COMMENT ON TABLE public.skill_categories IS 'Skill categories for tracking student proficiency';
COMMENT ON TABLE public.user_skill_profile IS 'Individual student skill proficiency tracking';
COMMENT ON FUNCTION get_student_weak_areas IS 'Returns top N weak areas for a student';
COMMENT ON FUNCTION update_skill_proficiency IS 'Updates skill proficiency based on submission result';
COMMENT ON FUNCTION analyze_submission_skills IS 'Analyzes submission and updates related skills';

-- Migration 4: Entrance Tests (20251110000000)
-- ========================================
-- ============================================
-- Migration: Entrance Test System
-- Description: System for assessing initial student proficiency level
-- ============================================

-- Create entrance_tests table
CREATE TABLE IF NOT EXISTS public.entrance_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL DEFAULT 'python',
  is_active BOOLEAN DEFAULT true,
  passing_score INTEGER DEFAULT 60 CHECK (passing_score >= 0 AND passing_score <= 100),
  time_limit_minutes INTEGER, -- NULL = no time limit
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create entrance_test_questions table
CREATE TABLE IF NOT EXISTS public.entrance_test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.entrance_tests(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'code', 'true_false')),
  question_text TEXT NOT NULL,
  code_template TEXT, -- For code questions
  correct_answer TEXT, -- For true_false and multiple_choice
  test_cases JSONB, -- For code questions: [{"input": "...", "output": "..."}]
  options JSONB, -- For multiple_choice: ["option1", "option2", ...]
  skill_category TEXT, -- Links to skill_categories.name
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  points INTEGER NOT NULL DEFAULT 1 CHECK (points > 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create entrance_test_attempts table
CREATE TABLE IF NOT EXISTS public.entrance_test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.entrance_tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  score INTEGER, -- Percentage 0-100
  total_points_earned INTEGER DEFAULT 0,
  total_points_possible INTEGER DEFAULT 0,
  proficiency_level_assigned TEXT CHECK (proficiency_level_assigned IN ('beginner', 'intermediate', 'advanced')),
  proficiency_score_assigned INTEGER CHECK (proficiency_score_assigned >= 0 AND proficiency_score_assigned <= 100),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create entrance_test_answers table
CREATE TABLE IF NOT EXISTS public.entrance_test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.entrance_test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.entrance_test_questions(id) ON DELETE CASCADE,
  student_answer TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  feedback TEXT, -- Optional feedback for incorrect answers
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- Add indexes
CREATE INDEX idx_entrance_tests_active ON public.entrance_tests(is_active);
CREATE INDEX idx_entrance_test_questions_test_id ON public.entrance_test_questions(test_id);
CREATE INDEX idx_entrance_test_questions_skill ON public.entrance_test_questions(skill_category);
CREATE INDEX idx_entrance_test_attempts_student_id ON public.entrance_test_attempts(student_id);
CREATE INDEX idx_entrance_test_attempts_test_id ON public.entrance_test_attempts(test_id);
CREATE INDEX idx_entrance_test_attempts_status ON public.entrance_test_attempts(status);
CREATE INDEX idx_entrance_test_answers_attempt_id ON public.entrance_test_answers(attempt_id);

-- Enable RLS
ALTER TABLE public.entrance_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrance_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrance_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrance_test_answers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- entrance_tests policies
CREATE POLICY "Everyone can view active tests"
  ON public.entrance_tests FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Teachers can manage all tests"
  ON public.entrance_tests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- entrance_test_questions policies
CREATE POLICY "Students can view questions of active tests"
  ON public.entrance_test_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entrance_tests
      WHERE id = entrance_test_questions.test_id AND is_active = true
    )
  );

CREATE POLICY "Teachers can manage all questions"
  ON public.entrance_test_questions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- entrance_test_attempts policies
CREATE POLICY "Students can view own attempts"
  ON public.entrance_test_attempts FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students can create own attempts"
  ON public.entrance_test_attempts FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update own attempts"
  ON public.entrance_test_attempts FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view all attempts"
  ON public.entrance_test_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- entrance_test_answers policies
CREATE POLICY "Students can view own answers"
  ON public.entrance_test_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entrance_test_attempts
      WHERE id = entrance_test_answers.attempt_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own answers"
  ON public.entrance_test_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.entrance_test_attempts
      WHERE id = entrance_test_answers.attempt_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view all answers"
  ON public.entrance_test_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- Function: Start entrance test attempt
-- ============================================
CREATE OR REPLACE FUNCTION start_entrance_test(
  p_test_id UUID,
  p_student_id UUID
) RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
  v_existing_attempt UUID;
BEGIN
  -- Check if student already has a completed attempt for this test
  SELECT id INTO v_existing_attempt
  FROM public.entrance_test_attempts
  WHERE test_id = p_test_id
    AND student_id = p_student_id
    AND status = 'completed'
  LIMIT 1;

  IF v_existing_attempt IS NOT NULL THEN
    RAISE EXCEPTION 'Student already completed this test';
  END IF;

  -- Create new attempt
  INSERT INTO public.entrance_test_attempts (test_id, student_id, status)
  VALUES (p_test_id, p_student_id, 'in_progress')
  RETURNING id INTO v_attempt_id;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Calculate proficiency from entrance test
-- ============================================
CREATE OR REPLACE FUNCTION calculate_entrance_test_proficiency(
  p_attempt_id UUID
) RETURNS TABLE(proficiency_level TEXT, proficiency_score INTEGER) AS $$
DECLARE
  v_total_possible INTEGER;
  v_total_earned INTEGER;
  v_score_percentage INTEGER;
  v_beginner_correct INTEGER;
  v_intermediate_correct INTEGER;
  v_advanced_correct INTEGER;
  v_level TEXT;
  v_score INTEGER;
BEGIN
  -- Get total points
  SELECT
    COALESCE(SUM(points_earned), 0),
    COALESCE(SUM(
      CASE
        WHEN eta.is_correct IS NOT NULL THEN etq.points
        ELSE 0
      END
    ), 0)
  INTO v_total_earned, v_total_possible
  FROM public.entrance_test_answers eta
  JOIN public.entrance_test_questions etq ON eta.question_id = etq.id
  WHERE eta.attempt_id = p_attempt_id;

  IF v_total_possible = 0 THEN
    RETURN QUERY SELECT 'beginner'::TEXT, 0::INTEGER;
    RETURN;
  END IF;

  -- Calculate overall percentage
  v_score_percentage := ROUND((v_total_earned::FLOAT / v_total_possible::FLOAT) * 100)::INTEGER;

  -- Count correct answers by difficulty
  SELECT
    COUNT(*) FILTER (WHERE etq.difficulty_level = 'beginner' AND eta.is_correct = true),
    COUNT(*) FILTER (WHERE etq.difficulty_level = 'intermediate' AND eta.is_correct = true),
    COUNT(*) FILTER (WHERE etq.difficulty_level = 'advanced' AND eta.is_correct = true)
  INTO v_beginner_correct, v_intermediate_correct, v_advanced_correct
  FROM public.entrance_test_answers eta
  JOIN public.entrance_test_questions etq ON eta.question_id = etq.id
  WHERE eta.attempt_id = p_attempt_id;

  -- Determine proficiency level based on performance
  IF v_advanced_correct >= 3 AND v_score_percentage >= 70 THEN
    v_level := 'advanced';
    v_score := GREATEST(71, LEAST(100, v_score_percentage));
  ELSIF v_intermediate_correct >= 3 AND v_score_percentage >= 50 THEN
    v_level := 'intermediate';
    v_score := GREATEST(41, LEAST(70, v_score_percentage));
  ELSE
    v_level := 'beginner';
    v_score := LEAST(40, v_score_percentage);
  END IF;

  RETURN QUERY SELECT v_level, v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: Complete entrance test attempt
-- ============================================
CREATE OR REPLACE FUNCTION complete_entrance_test(
  p_attempt_id UUID
) RETURNS VOID AS $$
DECLARE
  v_student_id UUID;
  v_test_id UUID;
  v_total_earned INTEGER;
  v_total_possible INTEGER;
  v_score_percentage INTEGER;
  v_proficiency_level TEXT;
  v_proficiency_score INTEGER;
  v_calc_result RECORD;
BEGIN
  -- Get attempt info
  SELECT student_id, test_id INTO v_student_id, v_test_id
  FROM public.entrance_test_attempts
  WHERE id = p_attempt_id;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  -- Calculate total points
  SELECT
    COALESCE(SUM(points_earned), 0),
    COALESCE(SUM(
      CASE
        WHEN eta.is_correct IS NOT NULL THEN etq.points
        ELSE 0
      END
    ), 0)
  INTO v_total_earned, v_total_possible
  FROM public.entrance_test_answers eta
  JOIN public.entrance_test_questions etq ON eta.question_id = etq.id
  WHERE eta.attempt_id = p_attempt_id;

  -- Calculate percentage score
  IF v_total_possible > 0 THEN
    v_score_percentage := ROUND((v_total_earned::FLOAT / v_total_possible::FLOAT) * 100)::INTEGER;
  ELSE
    v_score_percentage := 0;
  END IF;

  -- Calculate proficiency
  SELECT * INTO v_calc_result
  FROM calculate_entrance_test_proficiency(p_attempt_id);

  v_proficiency_level := v_calc_result.proficiency_level;
  v_proficiency_score := v_calc_result.proficiency_score;

  -- Update attempt
  UPDATE public.entrance_test_attempts
  SET
    completed_at = now(),
    status = 'completed',
    score = v_score_percentage,
    total_points_earned = v_total_earned,
    total_points_possible = v_total_possible,
    proficiency_level_assigned = v_proficiency_level,
    proficiency_score_assigned = v_proficiency_score,
    updated_at = now()
  WHERE id = p_attempt_id;

  -- Update student's proficiency using existing function
  PERFORM set_student_proficiency_manual(
    v_student_id,
    v_proficiency_level,
    v_proficiency_score,
    'Результат входного тестирования'
  );

  -- Override change_reason in proficiency_history to 'entrance_test'
  UPDATE public.proficiency_history
  SET change_reason = 'entrance_test'
  WHERE student_id = v_student_id
    AND changed_at = (
      SELECT MAX(changed_at)
      FROM public.proficiency_history
      WHERE student_id = v_student_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Grant permissions
-- ============================================
GRANT SELECT ON public.entrance_tests TO authenticated;
GRANT SELECT ON public.entrance_test_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.entrance_test_attempts TO authenticated;
GRANT SELECT, INSERT ON public.entrance_test_answers TO authenticated;

GRANT EXECUTE ON FUNCTION start_entrance_test TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_entrance_test_proficiency TO authenticated;
GRANT EXECUTE ON FUNCTION complete_entrance_test TO authenticated;

-- ============================================
-- Create default entrance test
-- ============================================
DO $$
DECLARE
  v_test_id UUID;
BEGIN
  -- Insert default test
  INSERT INTO public.entrance_tests (
    title,
    description,
    language,
    is_active,
    passing_score,
    time_limit_minutes
  ) VALUES (
    'Входное тестирование по Python',
    'Тест для определения начального уровня владения языком программирования Python',
    'python',
    true,
    60,
    30
  ) RETURNING id INTO v_test_id;

  -- Insert beginner questions
  INSERT INTO public.entrance_test_questions (test_id, question_type, question_text, correct_answer, difficulty_level, skill_category, points, order_index, options) VALUES
  (v_test_id, 'multiple_choice', 'Что выведет код: print(2 + 2 * 2)?', '6', 'beginner', 'operators', 1, 1, '["4", "6", "8", "Ошибка"]'::jsonb),
  (v_test_id, 'true_false', 'Python - это компилируемый язык программирования', 'false', 'beginner', 'syntax', 1, 2, NULL),
  (v_test_id, 'multiple_choice', 'Как объявить переменную x со значением 10 в Python?', 'x = 10', 'beginner', 'variables', 1, 3, '["x = 10", "var x = 10", "int x = 10", "x := 10"]'::jsonb),
  (v_test_id, 'multiple_choice', 'Какая функция используется для вывода текста на экран?', 'print()', 'beginner', 'io', 1, 4, '["print()", "console.log()", "echo()", "write()"]'::jsonb);

  -- Insert intermediate questions
  INSERT INTO public.entrance_test_questions (test_id, question_type, question_text, correct_answer, difficulty_level, skill_category, points, order_index, options) VALUES
  (v_test_id, 'multiple_choice', 'Что выведет: range(5)?', 'range(0, 5)', 'intermediate', 'loops', 2, 5, '["[0, 1, 2, 3, 4]", "range(0, 5)", "[1, 2, 3, 4, 5]", "5"]'::jsonb),
  (v_test_id, 'multiple_choice', 'Как создать функцию в Python?', 'def func_name():', 'intermediate', 'functions', 2, 6, '["function func_name()", "def func_name():", "func func_name()", "create func_name()"]'::jsonb),
  (v_test_id, 'true_false', 'Списки в Python могут содержать элементы разных типов', 'true', 'intermediate', 'arrays', 2, 7, NULL),
  (v_test_id, 'multiple_choice', 'Как получить длину списка lst?', 'len(lst)', 'intermediate', 'arrays', 2, 8, '["len(lst)", "lst.length", "size(lst)", "lst.size()"]'::jsonb);

  -- Insert advanced questions
  INSERT INTO public.entrance_test_questions (test_id, question_type, question_text, correct_answer, difficulty_level, skill_category, points, order_index, options) VALUES
  (v_test_id, 'multiple_choice', 'Что такое list comprehension?', 'Способ создания списков в одну строку', 'advanced', 'arrays', 3, 9, '["Способ создания списков в одну строку", "Функция для сжатия списков", "Метод сортировки", "Тип данных"]'::jsonb),
  (v_test_id, 'multiple_choice', 'Какая временная сложность поиска элемента в словаре (dict)?', 'O(1)', 'advanced', 'algorithms', 3, 10, '["O(1)", "O(n)", "O(log n)", "O(n^2)"]'::jsonb),
  (v_test_id, 'true_false', 'В Python можно изменить элементы кортежа (tuple)', 'false', 'advanced', 'objects', 3, 11, NULL),
  (v_test_id, 'multiple_choice', 'Что делает оператор **?', 'Возведение в степень', 'advanced', 'operators', 3, 12, '["Умножение", "Возведение в степень", "Деление", "Остаток от деления"]'::jsonb);

END $$;

COMMENT ON TABLE public.entrance_tests IS 'Entrance tests for determining initial student proficiency';
COMMENT ON TABLE public.entrance_test_questions IS 'Questions for entrance tests';
COMMENT ON TABLE public.entrance_test_attempts IS 'Student attempts at entrance tests';
COMMENT ON TABLE public.entrance_test_answers IS 'Student answers to entrance test questions';
COMMENT ON FUNCTION start_entrance_test IS 'Start a new entrance test attempt';
COMMENT ON FUNCTION calculate_entrance_test_proficiency IS 'Calculate proficiency level from test results';
COMMENT ON FUNCTION complete_entrance_test IS 'Complete test attempt and assign proficiency level';

-- ========================================
-- MIGRATIONS COMPLETE!
-- Now run the verification queries from docs/verification_queries.sql
-- ========================================
