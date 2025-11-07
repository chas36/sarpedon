-- ============================================
-- APPLY: Level Recommendations Migration
-- ============================================
-- Скопируйте этот файл в Supabase Dashboard SQL Editor
-- ============================================

-- ============================================
-- Adaptive Learning: Level Recommendations
-- ============================================
-- Functions for personalized level recommendations based on:
-- 1. Student's weak areas (skills that need practice)
-- 2. Student's proficiency level (difficulty matching)
-- 3. Uncompleted levels
-- ============================================

-- ============================================
-- Function: Get recommended levels for student
-- ============================================
CREATE OR REPLACE FUNCTION get_recommended_levels(
  p_student_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  level_id UUID,
  title TEXT,
  description TEXT,
  difficulty INTEGER,
  language TEXT,
  target_skills JSONB,
  match_score INTEGER,
  recommendation_reason TEXT
) AS $$
DECLARE
  v_proficiency_level TEXT;
  v_weak_skills TEXT[];
BEGIN
  -- Get student's proficiency level
  SELECT proficiency_level INTO v_proficiency_level
  FROM profiles
  WHERE id = p_student_id;

  -- Default to beginner if not set
  v_proficiency_level := COALESCE(v_proficiency_level, 'beginner');

  -- Get student's weak areas (top 3 weakest skills)
  SELECT ARRAY_AGG(skill_name) INTO v_weak_skills
  FROM (
    SELECT skill_name
    FROM get_student_weak_areas(p_student_id, 3)
  ) AS weak;

  -- Return recommended levels
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.description,
    l.difficulty,
    l.language,
    l.target_skills,
    -- Calculate match score (0-100)
    (
      -- Difficulty match (40 points max)
      CASE
        WHEN v_proficiency_level = 'beginner' AND l.difficulty BETWEEN 1 AND 4 THEN 40
        WHEN v_proficiency_level = 'intermediate' AND l.difficulty BETWEEN 4 AND 7 THEN 40
        WHEN v_proficiency_level = 'advanced' AND l.difficulty BETWEEN 7 AND 10 THEN 40
        WHEN v_proficiency_level = 'beginner' AND l.difficulty BETWEEN 5 AND 6 THEN 20
        WHEN v_proficiency_level = 'intermediate' AND l.difficulty BETWEEN 3 AND 4 OR l.difficulty BETWEEN 8 AND 9 THEN 20
        WHEN v_proficiency_level = 'advanced' AND l.difficulty BETWEEN 5 AND 7 THEN 20
        ELSE 0
      END
      +
      -- Weak skills match (60 points max)
      CASE
        WHEN v_weak_skills IS NULL OR ARRAY_LENGTH(v_weak_skills, 1) IS NULL THEN 30
        ELSE (
          -- Count how many weak skills are in target_skills
          SELECT COUNT(*)::INTEGER * 20
          FROM jsonb_array_elements_text(l.target_skills) AS skill
          WHERE skill = ANY(v_weak_skills)
        )
      END
    ) AS match_score,
    -- Generate recommendation reason
    CASE
      WHEN v_weak_skills IS NOT NULL AND ARRAY_LENGTH(v_weak_skills, 1) > 0 AND
           EXISTS (
             SELECT 1 FROM jsonb_array_elements_text(l.target_skills) AS skill
             WHERE skill = ANY(v_weak_skills)
           )
      THEN 'Поможет улучшить слабые навыки: ' ||
           ARRAY_TO_STRING(
             ARRAY(
               SELECT jsonb_array_elements_text(l.target_skills)
               WHERE jsonb_array_elements_text = ANY(v_weak_skills)
               LIMIT 2
             ),
             ', '
           )
      WHEN v_proficiency_level = 'beginner' AND l.difficulty <= 4
      THEN 'Подходит для начинающих'
      WHEN v_proficiency_level = 'intermediate' AND l.difficulty BETWEEN 4 AND 7
      THEN 'Соответствует вашему уровню'
      WHEN v_proficiency_level = 'advanced' AND l.difficulty >= 7
      THEN 'Сложная задача для продвинутых'
      ELSE 'Рекомендуется для практики'
    END AS recommendation_reason
  FROM levels l
  WHERE
    -- Exclude completed levels
    NOT EXISTS (
      SELECT 1 FROM level_progress lp
      WHERE lp.level_id = l.id
        AND lp.student_id = p_student_id
        AND lp.status = 'completed'
    )
    -- Include only levels for student's class (if class restriction exists)
    AND (
      l.allowed_classes IS NULL
      OR l.allowed_classes = ARRAY[]::TEXT[]
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = p_student_id
          AND p.class = ANY(l.allowed_classes)
      )
    )
  ORDER BY match_score DESC, l.difficulty ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_recommended_levels IS 'Returns personalized level recommendations based on proficiency and weak areas';

-- ============================================
-- Function: Get difficulty range for proficiency level
-- ============================================
CREATE OR REPLACE FUNCTION get_difficulty_range_for_proficiency(
  p_proficiency_level TEXT
)
RETURNS TABLE (
  min_difficulty INTEGER,
  max_difficulty INTEGER,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE p_proficiency_level
      WHEN 'beginner' THEN 1
      WHEN 'intermediate' THEN 4
      WHEN 'advanced' THEN 7
      ELSE 1
    END AS min_difficulty,
    CASE p_proficiency_level
      WHEN 'beginner' THEN 4
      WHEN 'intermediate' THEN 7
      WHEN 'advanced' THEN 10
      ELSE 10
    END AS max_difficulty,
    CASE p_proficiency_level
      WHEN 'beginner' THEN 'Задачи для начинающих (сложность 1-4)'
      WHEN 'intermediate' THEN 'Задачи среднего уровня (сложность 4-7)'
      WHEN 'advanced' THEN 'Продвинутые задачи (сложность 7-10)'
      ELSE 'Все уровни сложности'
    END AS description;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_difficulty_range_for_proficiency IS 'Returns recommended difficulty range for a proficiency level';

-- ============================================
-- Function: Get levels filtered by proficiency
-- ============================================
CREATE OR REPLACE FUNCTION get_levels_for_proficiency(
  p_student_id UUID,
  p_include_completed BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  difficulty INTEGER,
  language TEXT,
  target_skills JSONB,
  status TEXT,
  is_recommended BOOLEAN
) AS $$
DECLARE
  v_proficiency_level TEXT;
  v_min_difficulty INTEGER;
  v_max_difficulty INTEGER;
BEGIN
  -- Get student's proficiency level
  SELECT proficiency_level INTO v_proficiency_level
  FROM profiles
  WHERE id = p_student_id;

  v_proficiency_level := COALESCE(v_proficiency_level, 'beginner');

  -- Get difficulty range
  SELECT gdr.min_difficulty, gdr.max_difficulty
  INTO v_min_difficulty, v_max_difficulty
  FROM get_difficulty_range_for_proficiency(v_proficiency_level) gdr;

  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.description,
    l.difficulty,
    l.language,
    l.target_skills,
    COALESCE(lp.status, 'not_started')::TEXT AS status,
    -- Mark as recommended if in top 10 recommendations
    EXISTS (
      SELECT 1 FROM get_recommended_levels(p_student_id, 10) rec
      WHERE rec.level_id = l.id
    ) AS is_recommended
  FROM levels l
  LEFT JOIN level_progress lp ON lp.level_id = l.id AND lp.student_id = p_student_id
  WHERE
    -- Filter by difficulty range
    l.difficulty BETWEEN v_min_difficulty AND v_max_difficulty
    -- Optionally exclude completed
    AND (p_include_completed OR COALESCE(lp.status, 'not_started') != 'completed')
    -- Class restriction
    AND (
      l.allowed_classes IS NULL
      OR l.allowed_classes = ARRAY[]::TEXT[]
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = p_student_id
          AND p.class = ANY(l.allowed_classes)
      )
    )
  ORDER BY
    is_recommended DESC,
    l.difficulty ASC,
    l.order_index ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_levels_for_proficiency IS 'Returns levels filtered by student proficiency level with recommendation flags';

-- ============================================
-- Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION get_recommended_levels TO authenticated;
GRANT EXECUTE ON FUNCTION get_difficulty_range_for_proficiency TO authenticated;
GRANT EXECUTE ON FUNCTION get_levels_for_proficiency TO authenticated;
