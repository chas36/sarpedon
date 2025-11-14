-- ============================================
-- Проверка: Исправлена ли циклическая зависимость?
-- ============================================

-- 1. Проверяем, что функция check_user_role создана
SELECT
  'ФУНКЦИЯ check_user_role' as check,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'check_user_role'
    )
    THEN '✅ Функция существует'
    ELSE '❌ Функция НЕ создана!'
  END as result;

-- 2. Проверяем, что функция имеет SECURITY DEFINER
SELECT
  'SECURITY DEFINER' as check,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'check_user_role'
        AND p.prosecdef = true
    )
    THEN '✅ Функция имеет SECURITY DEFINER (обходит RLS)'
    ELSE '❌ Функция НЕ имеет SECURITY DEFINER!'
  END as result;

-- 3. Проверяем политики на profiles (не должно быть рекурсивных)
SELECT
  'ПОЛИТИКИ на profiles' as check,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'profiles';

-- 4. Убедимся, что нет проблемной политики "Teachers can view all profiles"
SELECT
  'ПРОБЛЕМНАЯ ПОЛИТИКА' as check,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles'
        AND policyname = 'Teachers can view all profiles'
    )
    THEN '❌ ПРОБЛЕМНАЯ ПОЛИТИКА ЕЩЕ ЕСТЬ! Удалите её!'
    ELSE '✅ Проблемная политика удалена'
  END as result;

-- 5. Проверяем политики на lesson_sessions
SELECT
  'ПОЛИТИКИ на lesson_sessions' as check,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies
WHERE tablename = 'lesson_sessions';

-- 6. Проверяем, что новые политики используют функцию (не EXISTS к profiles)
SELECT
  'ИСПОЛЬЗОВАНИЕ check_user_role' as check,
  policyname,
  CASE
    WHEN qual LIKE '%check_user_role%' THEN '✅ Использует безопасную функцию'
    WHEN qual LIKE '%EXISTS%profiles%' THEN '⚠️ Использует EXISTS (может быть OK для students)'
    ELSE '❓ Неизвестный тип политики'
  END as policy_type
FROM pg_policies
WHERE tablename = 'lesson_sessions'
ORDER BY policyname;

-- 7. ИТОГОВАЯ ПРОВЕРКА
SELECT
  'ИТОГ' as check,
  CASE
    -- Проверяем все условия
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'check_user_role'
        AND p.prosecdef = true
    )
    THEN '❌ ОШИБКА: Функция check_user_role не создана или не имеет SECURITY DEFINER'

    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles'
        AND policyname = 'Teachers can view all profiles'
    )
    THEN '❌ ОШИБКА: Проблемная политика на profiles все еще существует'

    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'lesson_sessions'
        AND qual LIKE '%check_user_role%'
    )
    THEN '⚠️ ПРЕДУПРЕЖДЕНИЕ: Политики lesson_sessions не используют check_user_role'

    ELSE '✅ ВСЕ ИСПРАВЛЕНО! Циклическая зависимость устранена!'
  END as result;
