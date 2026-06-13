-- ============================================
-- Fix Lesson Sessions RLS Policies
-- ============================================
-- Проблема: Политики проверяют teacher_id при INSERT,
-- но это поле ещё не установлено, что вызывает 403 ошибку

-- Удалим старые проблемные политики
DROP POLICY IF EXISTS "Teachers can manage own lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can view all lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Students can view own class lessons" ON public.lesson_sessions;

-- ============================================
-- Проверка существования функции check_user_role
-- ============================================
DO $$
BEGIN
  -- Если функция не существует, создадим её
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'check_user_role'
  ) THEN
    CREATE FUNCTION check_user_role(user_id UUID, required_roles TEXT[])
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      user_role TEXT;
    BEGIN
      -- Get role from profiles table
      SELECT role INTO user_role
      FROM public.profiles
      WHERE id = user_id;

      -- Check if user's role is in required roles
      RETURN user_role = ANY(required_roles);
    END;
    $func$;

    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION check_user_role TO authenticated;
  END IF;
END $$;

-- ============================================
-- Новые безопасные RLS политики
-- ============================================

-- Teachers can INSERT lessons (для создания)
CREATE POLICY "Teachers can insert lessons"
  ON public.lesson_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    check_user_role(auth.uid(), ARRAY['teacher'])
  );

-- Teachers can SELECT all lessons (для просмотра)
CREATE POLICY "Teachers can view all lessons"
  ON public.lesson_sessions
  FOR SELECT
  TO authenticated
  USING (
    check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

-- Teachers can UPDATE their own lessons
CREATE POLICY "Teachers can update own lessons"
  ON public.lesson_sessions
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid() AND
    check_user_role(auth.uid(), ARRAY['teacher'])
  )
  WITH CHECK (
    teacher_id = auth.uid() AND
    check_user_role(auth.uid(), ARRAY['teacher'])
  );

-- Teachers can DELETE their own lessons
CREATE POLICY "Teachers can delete own lessons"
  ON public.lesson_sessions
  FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid() AND
    check_user_role(auth.uid(), ARRAY['teacher'])
  );

-- Students can view lessons for their class
CREATE POLICY "Students can view own class lessons"
  ON public.lesson_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'student'
        AND class = lesson_sessions.class
    )
  );

-- ============================================
-- Исправление политик для lesson_grades
-- ============================================

-- Удалим старые политики для lesson_grades
DROP POLICY IF EXISTS "Teachers can manage grades for own lessons" ON public.lesson_grades;
DROP POLICY IF EXISTS "Students can view own grades" ON public.lesson_grades;

-- Teachers can INSERT grades
CREATE POLICY "Teachers can insert grades"
  ON public.lesson_grades
  FOR INSERT
  TO authenticated
  WITH CHECK (
    check_user_role(auth.uid(), ARRAY['teacher']) AND
    EXISTS (
      SELECT 1 FROM public.lesson_sessions
      WHERE id = lesson_session_id
        AND teacher_id = auth.uid()
    )
  );

-- Teachers can SELECT grades for their lessons
CREATE POLICY "Teachers can view grades for own lessons"
  ON public.lesson_grades
  FOR SELECT
  TO authenticated
  USING (
    check_user_role(auth.uid(), ARRAY['teacher']) AND
    EXISTS (
      SELECT 1 FROM public.lesson_sessions
      WHERE id = lesson_session_id
        AND teacher_id = auth.uid()
    )
  );

-- Teachers can UPDATE grades for their lessons
CREATE POLICY "Teachers can update grades for own lessons"
  ON public.lesson_grades
  FOR UPDATE
  TO authenticated
  USING (
    check_user_role(auth.uid(), ARRAY['teacher']) AND
    EXISTS (
      SELECT 1 FROM public.lesson_sessions
      WHERE id = lesson_session_id
        AND teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    check_user_role(auth.uid(), ARRAY['teacher']) AND
    EXISTS (
      SELECT 1 FROM public.lesson_sessions
      WHERE id = lesson_session_id
        AND teacher_id = auth.uid()
    )
  );

-- Teachers can DELETE grades for their lessons
CREATE POLICY "Teachers can delete grades for own lessons"
  ON public.lesson_grades
  FOR DELETE
  TO authenticated
  USING (
    check_user_role(auth.uid(), ARRAY['teacher']) AND
    EXISTS (
      SELECT 1 FROM public.lesson_sessions
      WHERE id = lesson_session_id
        AND teacher_id = auth.uid()
    )
  );

-- Students can view their own grades
CREATE POLICY "Students can view own grades"
  ON public.lesson_grades
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() AND
    check_user_role(auth.uid(), ARRAY['student'])
  );

-- ============================================
-- Проверка
-- ============================================
SELECT
  'lesson_sessions RLS policies' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'lesson_sessions'
UNION ALL
SELECT
  'lesson_grades RLS policies' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'lesson_grades';
