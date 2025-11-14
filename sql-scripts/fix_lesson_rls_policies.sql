-- ============================================
-- ИСПРАВЛЕНИЕ RLS ПОЛИТИК - проверка роли из profiles
-- ============================================
-- Проблема: JWT токен может не содержать актуальную роль
-- Решение: проверяем роль напрямую из таблицы profiles

-- Удаляем старые политики
DROP POLICY IF EXISTS "Teachers can manage own lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can view all lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Students can view own class lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can manage grades for own lessons" ON public.lesson_grades;
DROP POLICY IF EXISTS "Students can view own grades" ON public.lesson_grades;

-- ============================================
-- НОВЫЕ ПОЛИТИКИ для lesson_sessions
-- ============================================

-- Учителя могут управлять своими уроками
CREATE POLICY "Teachers can manage own lessons"
  ON public.lesson_sessions
  FOR ALL
  USING (
    auth.uid() = teacher_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  )
  WITH CHECK (
    auth.uid() = teacher_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Учителя могут видеть все уроки
CREATE POLICY "Teachers can view all lessons"
  ON public.lesson_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- Ученики могут видеть уроки своего класса
CREATE POLICY "Students can view own class lessons"
  ON public.lesson_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'student'
        AND class = lesson_sessions.class
    )
  );

-- ============================================
-- НОВЫЕ ПОЛИТИКИ для lesson_grades
-- ============================================

-- Учителя могут управлять оценками для своих уроков
CREATE POLICY "Teachers can manage grades for own lessons"
  ON public.lesson_grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lesson_sessions ls
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE ls.id = lesson_grades.lesson_session_id
        AND ls.teacher_id = auth.uid()
        AND p.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lesson_sessions ls
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE ls.id = lesson_grades.lesson_session_id
        AND ls.teacher_id = auth.uid()
        AND p.role = 'teacher'
    )
  );

-- Ученики могут видеть свои оценки
CREATE POLICY "Students can view own grades"
  ON public.lesson_grades
  FOR SELECT
  USING (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- Перезагрузка схемы PostgREST
NOTIFY pgrst, 'reload schema';

SELECT '✅ RLS политики обновлены! Теперь они проверяют роль из таблицы profiles.' as status;
SELECT 'Обновите страницу приложения (Ctrl+F5) и попробуйте снова.' as next_step;
