-- ============================================
-- ИСПРАВЛЕНИЕ RLS ДЛЯ SUBMISSIONS
-- ============================================
-- Убираем циркулярные зависимости из submissions политик
-- Используем check_user_role() вместо прямых запросов к profiles
-- ============================================

-- Убедимся что функция check_user_role существует
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_user_role'
  ) THEN
    RAISE EXCEPTION 'Функция check_user_role не существует! Сначала примените fix_rls_circular_dependency_v2.sql';
  END IF;
END $$;

-- Удаляем все старые политики
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can create own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can update all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can delete submissions" ON public.submissions;

SELECT '✅ Старые политики удалены' as status;

-- Создаем новые политики БЕЗ циркулярных зависимостей

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions"
  ON public.submissions
  FOR SELECT
  USING (
    auth.uid() = user_id AND
    public.check_user_role(auth.uid(), ARRAY['student'])
  );

-- Students can insert their own submissions
CREATE POLICY "Students can create own submissions"
  ON public.submissions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    public.check_user_role(auth.uid(), ARRAY['student'])
  );

-- Students can update their own submissions
CREATE POLICY "Students can update own submissions"
  ON public.submissions
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    public.check_user_role(auth.uid(), ARRAY['student'])
  );

-- Teachers and editors can view all submissions
CREATE POLICY "Teachers can view all submissions"
  ON public.submissions
  FOR SELECT
  USING (
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

-- Teachers and editors can update all submissions (for grading)
CREATE POLICY "Teachers can update all submissions"
  ON public.submissions
  FOR UPDATE
  USING (
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

-- Teachers and editors can delete submissions
CREATE POLICY "Teachers can delete submissions"
  ON public.submissions
  FOR DELETE
  USING (
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

-- Перезагрузить схему PostgREST
NOTIFY pgrst, 'reload schema';

SELECT '✅ Новые политики для submissions созданы БЕЗ циркулярных зависимостей' as status;

-- Проверка
SELECT
  'submissions' as table_name,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename = 'submissions'
GROUP BY tablename;
