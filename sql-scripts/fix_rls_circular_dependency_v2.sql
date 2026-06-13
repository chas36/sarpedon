-- ============================================
-- ИСПРАВЛЕНИЕ V2: Полная очистка и переустановка RLS
-- ============================================

-- ============================================
-- ШАГ 1: ПОЛНАЯ ОЧИСТКА всех политик
-- ============================================

-- Удаляем ВСЕ политики на profiles
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Удаляем ВСЕ политики на lesson_sessions
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lesson_sessions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lesson_sessions', pol.policyname);
  END LOOP;
END $$;

-- Удаляем ВСЕ политики на lesson_grades
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lesson_grades'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.lesson_grades', pol.policyname);
  END LOOP;
END $$;

SELECT '✅ Шаг 1: Все старые политики удалены' as status;

-- ============================================
-- ШАГ 2: Создать безопасную функцию проверки роли
-- ============================================

-- Сначала удаляем функцию если она существует
DROP FUNCTION IF EXISTS public.check_user_role(UUID, TEXT[]);

-- Создаем функцию с SECURITY DEFINER
CREATE FUNCTION public.check_user_role(user_id UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = ANY(required_roles)
  );
END;
$$;

-- Даем права
GRANT EXECUTE ON FUNCTION public.check_user_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_role(UUID, TEXT[]) TO anon;

SELECT '✅ Шаг 2: Функция check_user_role создана с SECURITY DEFINER' as status;

-- ============================================
-- ШАГ 3: Создать ПРОСТЫЕ политики на profiles
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

-- Пользователи могут создавать свой профиль при регистрации
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

SELECT '✅ Шаг 3: Простые политики на profiles созданы (БЕЗ рекурсии)' as status;

-- ============================================
-- ШАГ 4: Создать политики на lesson_sessions
-- ============================================

-- Учителя могут создавать и управлять своими уроками
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

-- Учителя и редакторы могут просматривать все уроки
CREATE POLICY "Teachers and editors can view all lessons"
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

SELECT '✅ Шаг 4: Политики на lesson_sessions созданы с использованием check_user_role()' as status;

-- ============================================
-- ШАГ 5: Создать политики на lesson_grades
-- ============================================

-- Учителя могут управлять оценками для своих уроков
CREATE POLICY "Teachers can manage grades for own lessons"
  ON public.lesson_grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lesson_sessions ls
      WHERE ls.id = lesson_grades.lesson_session_id
        AND ls.teacher_id = auth.uid()
    ) AND
    public.check_user_role(auth.uid(), ARRAY['teacher'])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lesson_sessions ls
      WHERE ls.id = lesson_grades.lesson_session_id
        AND ls.teacher_id = auth.uid()
    ) AND
    public.check_user_role(auth.uid(), ARRAY['teacher'])
  );

-- Ученики могут видеть свои оценки
CREATE POLICY "Students can view own grades"
  ON public.lesson_grades
  FOR SELECT
  USING (
    auth.uid() = student_id AND
    public.check_user_role(auth.uid(), ARRAY['student'])
  );

SELECT '✅ Шаг 5: Политики на lesson_grades созданы' as status;

-- ============================================
-- ШАГ 6: Перезагрузить схему PostgREST
-- ============================================

NOTIFY pgrst, 'reload schema';

SELECT '✅ Шаг 6: Схема PostgREST перезагружена' as status;

-- ============================================
-- ИТОГОВАЯ ПРОВЕРКА
-- ============================================

SELECT '═══════════════════════════════════════════════' as separator;
SELECT '✅ ВСЕ ИСПРАВЛЕНО!' as final_status;
SELECT '═══════════════════════════════════════════════' as separator;

-- Проверяем функцию
SELECT
  '✅ Функция check_user_role создана с SECURITY DEFINER' as check
WHERE EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'check_user_role'
    AND p.prosecdef = true
);

-- Считаем политики
SELECT
  'profiles' as table_name,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policies
FROM pg_policies
WHERE tablename = 'profiles'
GROUP BY tablename

UNION ALL

SELECT
  'lesson_sessions' as table_name,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policies
FROM pg_policies
WHERE tablename = 'lesson_sessions'
GROUP BY tablename

UNION ALL

SELECT
  'lesson_grades' as table_name,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policies
FROM pg_policies
WHERE tablename = 'lesson_grades'
GROUP BY tablename;

-- Проверяем, что проблемной политики НЕТ
SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles'
        AND policyname = 'Teachers can view all profiles'
    )
    THEN '✅ Проблемная политика "Teachers can view all profiles" удалена'
    ELSE '❌ ПРОБЛЕМА: Проблемная политика все еще существует!'
  END as critical_check;
