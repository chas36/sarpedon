-- ============================================
-- МАСТЕР-СКРИПТ: ИСПРАВЛЕНИЕ ВСЕХ RLS ПРОБЛЕМ
-- ============================================
-- Этот скрипт исправляет:
-- 1. Добавляет политику для учителей чтобы видеть студентов
-- 2. Исправляет submissions политики (убирает циркулярные зависимости)
-- ============================================
-- ВАЖНО: Сначала должен быть применён fix_rls_circular_dependency_v2.sql
-- ============================================

-- Убедимся что функция check_user_role существует
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_user_role'
      AND p.prosecdef = true
  ) THEN
    RAISE EXCEPTION '❌ Функция check_user_role не существует или не имеет SECURITY DEFINER! Сначала примените fix_rls_circular_dependency_v2.sql';
  END IF;
END $$;

SELECT '✅ Функция check_user_role найдена' as status;

-- ============================================
-- ЧАСТЬ 1: ДОБАВИТЬ ПОЛИТИКУ ДЛЯ УЧИТЕЛЕЙ
-- ============================================

-- Удаляем старую политику если она есть
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;

-- Создаем НОВУЮ политику БЕЗ рекурсии
CREATE POLICY "Teachers can view student profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Учителя и редакторы могут видеть всех
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

SELECT '✅ Политика "Teachers can view student profiles" создана' as status;

-- ============================================
-- ЧАСТЬ 2: ИСПРАВИТЬ SUBMISSIONS ПОЛИТИКИ
-- ============================================

-- Удаляем все старые политики
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can create own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can update all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can delete submissions" ON public.submissions;

SELECT '✅ Старые submissions политики удалены' as status;

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

SELECT '✅ Новые submissions политики созданы' as status;

-- ============================================
-- ЧАСТЬ 3: ПЕРЕЗАГРУЗИТЬ СХЕМУ
-- ============================================

NOTIFY pgrst, 'reload schema';

SELECT '✅ Схема PostgREST перезагружена' as status;

-- ============================================
-- ИТОГОВАЯ ПРОВЕРКА
-- ============================================

SELECT '═══════════════════════════════════════════════' as separator;
SELECT '✅ ВСЕ ИСПРАВЛЕНО!' as final_status;
SELECT '═══════════════════════════════════════════════' as separator;

-- Проверяем profiles политики
SELECT
  'profiles' as table_name,
  COUNT(*) as policy_count,
  string_agg(policyname, E'\n  - ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename = 'profiles'
GROUP BY tablename;

-- Проверяем submissions политики
SELECT
  'submissions' as table_name,
  COUNT(*) as policy_count,
  string_agg(policyname, E'\n  - ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename = 'submissions'
GROUP BY tablename;

-- Проверяем что функция есть
SELECT
  '✅ check_user_role' as function_name,
  'SECURITY DEFINER' as security,
  'Используется для проверки ролей БЕЗ циркулярных зависимостей' as description
WHERE EXISTS (
  SELECT 1 FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'check_user_role'
    AND p.prosecdef = true
);
