-- Migration: Add Proficiency Level System to Sarpedon
-- Description: Adds student proficiency tracking for adaptive AI feedback
-- Date: 2025-11-06
-- Version: 1.0

-- =============================================================================
-- 1. ADD PROFICIENCY COLUMNS TO PROFILES TABLE
-- =============================================================================

-- Add proficiency level tracking columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS proficiency_level TEXT DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS proficiency_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS proficiency_last_assessed TIMESTAMP,
ADD COLUMN IF NOT EXISTS proficiency_manual_override BOOLEAN DEFAULT false;

-- Add check constraint for valid proficiency levels
ALTER TABLE profiles
ADD CONSTRAINT check_proficiency_level
CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced'));

-- Add index for faster queries by proficiency level
CREATE INDEX IF NOT EXISTS idx_profiles_proficiency
ON profiles(proficiency_level)
WHERE role = 'student';

-- Add index for proficiency score queries
CREATE INDEX IF NOT EXISTS idx_profiles_proficiency_score
ON profiles(proficiency_score)
WHERE role = 'student';

COMMENT ON COLUMN profiles.proficiency_level IS 'Student skill level: beginner (0-40), intermediate (41-70), advanced (71-100)';
COMMENT ON COLUMN profiles.proficiency_score IS 'Calculated proficiency score (0-100) based on completion rate, quality, and issues';
COMMENT ON COLUMN profiles.proficiency_last_assessed IS 'Timestamp of last automatic proficiency calculation';
COMMENT ON COLUMN profiles.proficiency_manual_override IS 'If true, teacher manually set the level (prevents auto-updates)';

-- =============================================================================
-- 2. ADD DIFFICULTY TO LEVELS TABLE (if not exists)
-- =============================================================================

ALTER TABLE levels
ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';

ALTER TABLE levels
ADD CONSTRAINT check_difficulty
CHECK (difficulty IN ('easy', 'medium', 'hard'));

CREATE INDEX IF NOT EXISTS idx_levels_difficulty
ON levels(difficulty);

COMMENT ON COLUMN levels.difficulty IS 'Assignment difficulty level affecting evaluation expectations';

-- =============================================================================
-- 3. CREATE PROFICIENCY HISTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS proficiency_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_level TEXT,
  new_level TEXT NOT NULL,
  old_score INTEGER,
  new_score INTEGER NOT NULL,
  reason TEXT NOT NULL,  -- 'auto_calculation' | 'manual_override' | 'initial_assessment' | 'migration'
  changed_by UUID REFERENCES profiles(id),  -- NULL for auto, teacher ID for manual
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proficiency_history_user
ON proficiency_history(user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_proficiency_history_reason
ON proficiency_history(reason);

COMMENT ON TABLE proficiency_history IS 'Tracks changes in student proficiency levels over time';
COMMENT ON COLUMN proficiency_history.reason IS 'Reason for level change: auto_calculation, manual_override, initial_assessment, migration';
COMMENT ON COLUMN proficiency_history.changed_by IS 'Teacher who made manual change, NULL for automatic updates';

-- =============================================================================
-- 4. CREATE FUNCTION TO CALCULATE PROFICIENCY SCORE
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_proficiency_score(student_id UUID)
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
      COUNT(*) FILTER (WHERE up.status = 'completed')::FLOAT /
      NULLIF(COUNT(*), 0) * 40,
      0
    ),
    -- Average quality score (40% weight)
    COALESCE(
      AVG(ca.quality_score) FILTER (WHERE ca.quality_score IS NOT NULL) * 0.4,
      0
    ),
    -- Issues penalty (20% weight - fewer issues = higher score)
    COALESCE(
      20 - LEAST(AVG(JSONB_ARRAY_LENGTH(ca.issues)) * 2, 20),
      0
    )
  INTO completion_rate, avg_quality, avg_issues_count
  FROM user_progress up
  LEFT JOIN submissions s ON s.level_id = up.level_id AND s.user_id = up.user_id
  LEFT JOIN code_analysis ca ON ca.submission_id = s.id
  WHERE up.user_id = student_id;

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
  FROM profiles
  WHERE id = NEW.user_id;

  -- Only update if not manually overridden
  IF (SELECT proficiency_manual_override FROM profiles WHERE id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Calculate new proficiency
  SELECT * INTO new_score, new_level
  FROM calculate_proficiency_score(NEW.user_id);

  -- Update profile
  UPDATE profiles
  SET
    proficiency_score = new_score,
    proficiency_level = new_level,
    proficiency_last_assessed = NOW()
  WHERE id = NEW.user_id;

  -- Log history if level changed
  IF old_level IS DISTINCT FROM new_level THEN
    INSERT INTO proficiency_history (user_id, old_level, new_level, old_score, new_score, reason)
    VALUES (NEW.user_id, old_level, new_level, old_score, new_score, 'auto_calculation');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_student_proficiency IS 'Trigger function that recalculates student proficiency after each code analysis';

-- =============================================================================
-- 6. CREATE TRIGGER ON CODE_ANALYSIS TABLE
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_update_proficiency ON code_analysis;

CREATE TRIGGER trigger_update_proficiency
AFTER INSERT ON code_analysis
FOR EACH ROW
EXECUTE FUNCTION update_student_proficiency();

COMMENT ON TRIGGER trigger_update_proficiency ON code_analysis IS 'Automatically updates student proficiency level after each submission analysis';

-- =============================================================================
-- 7. MIGRATE EXISTING STUDENTS
-- =============================================================================

-- Calculate proficiency for all existing students
DO $$
DECLARE
  student_record RECORD;
  calc_score INTEGER;
  calc_level TEXT;
BEGIN
  FOR student_record IN
    SELECT id FROM profiles WHERE role = 'student'
  LOOP
    -- Calculate proficiency
    SELECT * INTO calc_score, calc_level
    FROM calculate_proficiency_score(student_record.id);

    -- Update profile
    UPDATE profiles
    SET
      proficiency_score = calc_score,
      proficiency_level = calc_level,
      proficiency_last_assessed = NOW()
    WHERE id = student_record.id;

    -- Log initial assessment
    INSERT INTO proficiency_history (user_id, old_level, new_level, old_score, new_score, reason)
    VALUES (student_record.id, NULL, calc_level, NULL, calc_score, 'migration');
  END LOOP;

  RAISE NOTICE 'Migrated proficiency levels for existing students';
END $$;

-- =============================================================================
-- 8. CREATE HELPER FUNCTIONS FOR TEACHERS
-- =============================================================================

-- Function to manually set student proficiency level
CREATE OR REPLACE FUNCTION set_student_proficiency_manual(
  student_id UUID,
  new_level TEXT,
  teacher_id UUID,
  reason_text TEXT DEFAULT 'manual_override'
)
RETURNS BOOLEAN AS $$
DECLARE
  old_level TEXT;
  old_score INTEGER;
BEGIN
  -- Validate level
  IF new_level NOT IN ('beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'Invalid proficiency level: %', new_level;
  END IF;

  -- Validate student exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = student_id AND role = 'student') THEN
    RAISE EXCEPTION 'Student not found: %', student_id;
  END IF;

  -- Get current values
  SELECT proficiency_level, proficiency_score
  INTO old_level, old_score
  FROM profiles
  WHERE id = student_id;

  -- Update profile
  UPDATE profiles
  SET
    proficiency_level = new_level,
    proficiency_manual_override = true,
    proficiency_last_assessed = NOW()
  WHERE id = student_id;

  -- Log history
  INSERT INTO proficiency_history (
    user_id, old_level, new_level, old_score, new_score, reason, changed_by
  ) VALUES (
    student_id, old_level, new_level, old_score,
    CASE new_level
      WHEN 'beginner' THEN 20
      WHEN 'intermediate' THEN 55
      WHEN 'advanced' THEN 85
    END,
    reason_text, teacher_id
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_student_proficiency_manual IS 'Allows teachers to manually override student proficiency level';

-- Function to re-enable auto-calculation
CREATE OR REPLACE FUNCTION enable_auto_proficiency(student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE profiles
  SET proficiency_manual_override = false
  WHERE id = student_id AND role = 'student';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enable_auto_proficiency IS 'Re-enables automatic proficiency calculation for a student';

-- =============================================================================
-- 9. CREATE ANALYTICS VIEWS
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
FROM profiles
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
FROM proficiency_history ph
JOIN profiles p ON p.id = ph.user_id
WHERE ph.changed_at > NOW() - INTERVAL '7 days'
  AND ph.old_level IS NOT NULL
  AND ph.new_level != ph.old_level
ORDER BY ph.changed_at DESC;

COMMENT ON VIEW recent_proficiency_changes IS 'Students who changed proficiency levels in the last 7 days';

-- =============================================================================
-- 10. RLS POLICIES (Row Level Security)
-- =============================================================================

-- Enable RLS on proficiency_history if not already enabled
ALTER TABLE proficiency_history ENABLE ROW LEVEL SECURITY;

-- Students can view their own proficiency history
DROP POLICY IF EXISTS proficiency_history_select_own ON proficiency_history;
CREATE POLICY proficiency_history_select_own
ON proficiency_history FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'editor')
  )
);

-- Teachers can view all proficiency history
DROP POLICY IF EXISTS proficiency_history_select_all ON proficiency_history;
CREATE POLICY proficiency_history_select_all
ON proficiency_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'editor')
  )
);

-- Only system can insert (via trigger)
DROP POLICY IF EXISTS proficiency_history_insert ON proficiency_history;
CREATE POLICY proficiency_history_insert
ON proficiency_history FOR INSERT
WITH CHECK (false);  -- Prevent manual inserts, only via trigger/function

-- =============================================================================
-- 11. GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON proficiency_history TO authenticated;
GRANT SELECT ON class_proficiency_stats TO authenticated;
GRANT SELECT ON recent_proficiency_changes TO authenticated;

-- Grant execute on helper functions to teachers
GRANT EXECUTE ON FUNCTION set_student_proficiency_manual TO authenticated;
GRANT EXECUTE ON FUNCTION enable_auto_proficiency TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_proficiency_score TO authenticated;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Verify migration
DO $$
DECLARE
  total_students INTEGER;
  total_with_proficiency INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_students
  FROM profiles WHERE role = 'student';

  SELECT COUNT(*) INTO total_with_proficiency
  FROM profiles WHERE role = 'student' AND proficiency_level IS NOT NULL;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'PROFICIENCY SYSTEM MIGRATION COMPLETE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total students: %', total_students;
  RAISE NOTICE 'Students with proficiency: %', total_with_proficiency;
  RAISE NOTICE '';
  RAISE NOTICE 'Distribution:';
  RAISE NOTICE '  Beginner: %', (SELECT COUNT(*) FROM profiles WHERE proficiency_level = 'beginner');
  RAISE NOTICE '  Intermediate: %', (SELECT COUNT(*) FROM profiles WHERE proficiency_level = 'intermediate');
  RAISE NOTICE '  Advanced: %', (SELECT COUNT(*) FROM profiles WHERE proficiency_level = 'advanced');
  RAISE NOTICE '===========================================';
END $$;
