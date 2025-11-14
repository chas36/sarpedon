-- ============================================
-- ИСПРАВЛЕНИЕ: Устранение циклической зависимости в RLS
-- ============================================
-- Проблема: RLS политики на lesson_sessions используют EXISTS запрос к profiles,
-- но если на profiles также есть RLS с EXISTS к profiles, возникает бесконечная рекурсия.
--
-- Решение: Использовать SECURITY DEFINER функцию, которая обходит RLS при проверке роли

-- ============================================
-- Шаг 1: Создать безопасную функцию проверки роли
-- ============================================

CREATE OR REPLACE FUNCTION public.check_user_role(user_id UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- Функция выполняется с правами владельца, обходя RLS
SET search_path = public
AS $$
BEGIN
  -- Проверяем роль пользователя напрямую из таблицы profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = ANY(required_roles)
  );
END;
$$;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION public.check_user_role(UUID, TEXT[]) TO authenticated;

-- ============================================
-- Шаг 2: Удалить проблемные политики на profiles
-- ============================================

-- Удаляем политику, вызывающую циклическую зависимость
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;

-- Удаляем старую политику просмотра своего профиля
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- ============================================
-- Шаг 3: Создать простые политики на profiles БЕЗ рекурсии
-- ============================================

-- Пользователи могут видеть свой профиль
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Пользователи могут обновлять свой профиль
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- Шаг 4: Обновить политики на lesson_sessions
-- ============================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Teachers can manage own lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can view all lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Students can view own class lessons" ON public.lesson_sessions;

-- Учителя могут управлять своими уроками (используем функцию вместо EXISTS)
CREATE POLICY "Teachers can manage own lessons"
  ON public.lesson_sessions
  FOR ALL
  USING (
    auth.uid() = teacher_id AND
    public.check_user_role(auth.uid(), ARRAY['teacher'])
  )
  WITH CHECK (
    auth.uid() = teacher_id AND
    public.check_user_role(auth.uid(), ARRAY['teacher'])
  );

-- Учителя и редакторы могут видеть все уроки
CREATE POLICY "Teachers can view all lessons"
  ON public.lesson_sessions
  FOR SELECT
  USING (
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
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
-- Шаг 5: Обновить политики на lesson_grades
-- ============================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Teachers can manage grades for own lessons" ON public.lesson_grades;
DROP POLICY IF EXISTS "Students can view own grades" ON public.lesson_grades;

-- Учителя могут управлять оценками для своих уроков
CREATE POLICY "Teachers can manage grades for own lessons"
  ON public.lesson_grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lesson_sessions ls
      WHERE ls.id = lesson_grades.lesson_session_id
        AND ls.teacher_id = auth.uid()
        AND public.check_user_role(auth.uid(), ARRAY['teacher'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lesson_sessions ls
      WHERE ls.id = lesson_grades.lesson_session_id
        AND ls.teacher_id = auth.uid()
        AND public.check_user_role(auth.uid(), ARRAY['teacher'])
    )
  );

-- Ученики могут видеть свои оценки
CREATE POLICY "Students can view own grades"
  ON public.lesson_grades
  FOR SELECT
  USING (
    auth.uid() = student_id AND
    public.check_user_role(auth.uid(), ARRAY['student'])
  );

-- ============================================
-- Шаг 6: Перезагрузить схему PostgREST
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- Результат
-- ============================================

SELECT '✅ Циклическая зависимость устранена!' as status;
SELECT 'Создана функция check_user_role() с SECURITY DEFINER' as fix_1;
SELECT 'Политики на profiles упрощены (только auth.uid() = id)' as fix_2;
SELECT 'Политики на lesson_sessions используют безопасную функцию' as fix_3;
SELECT 'Теперь можно войти в систему и создавать уроки!' as next_step;
