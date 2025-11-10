-- ============================================
-- QUICK FIX: Create missing RPC functions
-- ============================================
-- Скопируйте и выполните этот скрипт в Supabase Dashboard SQL Editor
-- ============================================

-- ============================================
-- Function: Get student weak areas
-- ============================================
CREATE OR REPLACE FUNCTION get_student_weak_areas(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 3
)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_student_weak_areas TO authenticated;

-- ============================================
-- Function: Calculate proficiency score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_proficiency_score(p_student_id UUID)
RETURNS TABLE(score INTEGER, level TEXT) AS $$
DECLARE
  v_score INTEGER;
  v_level TEXT;
BEGIN
  -- Calculate score from skill proficiencies
  SELECT COALESCE(ROUND(AVG(proficiency)), 0)::INTEGER
  INTO v_score
  FROM user_skill_profile
  WHERE user_id = p_student_id;

  -- Determine level based on score
  IF v_score >= 71 THEN
    v_level := 'advanced';
  ELSIF v_score >= 41 THEN
    v_level := 'intermediate';
  ELSE
    v_level := 'beginner';
  END IF;

  RETURN QUERY SELECT v_score, v_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION calculate_proficiency_score TO authenticated;

-- ============================================
-- Function: Set student proficiency manually
-- ============================================
CREATE OR REPLACE FUNCTION set_student_proficiency_manual(
  p_student_id UUID,
  p_level TEXT,
  p_score INTEGER,
  p_reason TEXT DEFAULT 'Установлено учителем'
)
RETURNS VOID AS $$
DECLARE
  v_old_level TEXT;
  v_old_score INTEGER;
BEGIN
  -- Get current values
  SELECT proficiency_level, proficiency_score
  INTO v_old_level, v_old_score
  FROM profiles
  WHERE id = p_student_id;

  -- Update profile
  UPDATE profiles
  SET
    proficiency_level = p_level,
    proficiency_score = p_score,
    proficiency_manual_override = true,
    proficiency_last_assessed = NOW()
  WHERE id = p_student_id;

  -- Record history
  INSERT INTO proficiency_history (
    user_id,
    old_level,
    new_level,
    old_score,
    new_score,
    reason,
    changed_by,
    changed_at
  )
  VALUES (
    p_student_id,
    v_old_level,
    p_level,
    v_old_score,
    p_score,
    p_reason,
    auth.uid(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_student_proficiency_manual TO authenticated;

-- ============================================
-- Function: Enable auto proficiency
-- ============================================
CREATE OR REPLACE FUNCTION enable_auto_proficiency(p_student_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET proficiency_manual_override = false
  WHERE id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION enable_auto_proficiency TO authenticated;

-- ============================================
-- Verify functions were created
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM pg_proc
  WHERE proname IN (
    'get_student_weak_areas',
    'calculate_proficiency_score',
    'set_student_proficiency_manual',
    'enable_auto_proficiency'
  );

  RAISE NOTICE 'Created % functions successfully', v_count;
END $$;
