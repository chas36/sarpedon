-- ============================================
-- Исправление функции complete_entrance_test
-- ============================================

-- Удаляем существующую функцию если есть
DROP FUNCTION IF EXISTS public.complete_entrance_test(UUID);

-- Создаем функцию заново
CREATE OR REPLACE FUNCTION public.complete_entrance_test(
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

-- Явно даем права на выполнение
GRANT EXECUTE ON FUNCTION public.complete_entrance_test(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_entrance_test(UUID) TO anon;

-- Комментарий
COMMENT ON FUNCTION public.complete_entrance_test IS 'Complete test attempt and assign proficiency level';

-- Проверяем что функция создана
SELECT
    routine_name,
    routine_type,
    security_type,
    'Success - Function created!' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'complete_entrance_test';
