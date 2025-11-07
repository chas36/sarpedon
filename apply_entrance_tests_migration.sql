-- ============================================
-- APPLY ONLY: Entrance Tests Migration
-- ============================================
-- This applies ONLY the entrance_tests migration (20251110000000)
-- The other 3 migrations have already been applied via Dashboard
-- ============================================

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
CREATE INDEX IF NOT EXISTS idx_entrance_tests_active ON public.entrance_tests(is_active);
CREATE INDEX IF NOT EXISTS idx_entrance_test_questions_test_id ON public.entrance_test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_entrance_test_questions_skill ON public.entrance_test_questions(skill_category);
CREATE INDEX IF NOT EXISTS idx_entrance_test_attempts_student_id ON public.entrance_test_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_entrance_test_attempts_test_id ON public.entrance_test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_entrance_test_attempts_status ON public.entrance_test_attempts(status);
CREATE INDEX IF NOT EXISTS idx_entrance_test_answers_attempt_id ON public.entrance_test_answers(attempt_id);

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
