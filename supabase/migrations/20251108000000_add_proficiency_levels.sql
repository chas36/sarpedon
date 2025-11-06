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
