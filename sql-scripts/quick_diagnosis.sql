-- ============================================
-- БЫСТРАЯ ДИАГНОСТИКА: Что сейчас не так?
-- ============================================

SELECT '🚨 ПРОБЛЕМНАЯ ПОЛИТИКА (должна быть УДАЛЕНА):' as check;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles'
        AND policyname = 'Teachers can view all profiles'
    )
    THEN '❌❌❌ НАЙДЕНА ПРОБЛЕМНАЯ ПОЛИТИКА! Она вызывает 500 ошибку!'
    ELSE '✅ Проблемная политика отсутствует'
  END as status;

SELECT '' as space;
SELECT '🔧 ФУНКЦИЯ check_user_role:' as check;

SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'check_user_role'
    )
    THEN '❌ Функция НЕ существует'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'check_user_role' AND p.prosecdef = true
    )
    THEN '⚠️ Функция существует, но БЕЗ SECURITY DEFINER'
    ELSE '✅ Функция существует с SECURITY DEFINER'
  END as status;

SELECT '' as space;
SELECT '📋 ПОЛИТИКИ НА TABLES:' as check;

SELECT
  'profiles' as table_name,
  COUNT(*) as policies,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'profiles'

UNION ALL

SELECT
  'lesson_sessions' as table_name,
  COUNT(*) as policies,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'lesson_sessions'

UNION ALL

SELECT
  'lesson_grades' as table_name,
  COUNT(*) as policies,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'lesson_grades';

SELECT '' as space;
SELECT '🎯 ЧТО ДЕЛАТЬ:' as next_action;

SELECT
  CASE
    -- Проблемная политика существует
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles' AND policyname = 'Teachers can view all profiles'
    )
    THEN '👉 Выполните fix_rls_circular_dependency_v2.sql для удаления проблемной политики'

    -- Функции нет
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'check_user_role' AND p.prosecdef = true
    )
    THEN '👉 Выполните fix_rls_circular_dependency_v2.sql для создания функции'

    -- Все хорошо
    ELSE '✅ Все исправлено! Попробуйте войти в систему в режиме инкогнито'
  END as recommendation;
