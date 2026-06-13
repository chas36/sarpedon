-- ============================================
-- ПРОВЕРКА V2: Детальная проверка исправления
-- ============================================

SELECT '═══════════════════════════════════════════════' as separator;
SELECT '🔍 ПРОВЕРКА ИСПРАВЛЕНИЯ RLS' as title;
SELECT '═══════════════════════════════════════════════' as separator;

-- ============================================
-- 1. КРИТИЧЕСКАЯ ПРОВЕРКА: Проблемная политика удалена?
-- ============================================

SELECT
  '1️⃣ КРИТИЧЕСКАЯ ПРОВЕРКА' as step,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles'
        AND policyname = 'Teachers can view all profiles'
    )
    THEN '❌ ОШИБКА: Проблемная политика "Teachers can view all profiles" ЕЩЕ СУЩЕСТВУЕТ!'
    ELSE '✅ Проблемная политика удалена'
  END as result;

-- ============================================
-- 2. Функция check_user_role существует?
-- ============================================

SELECT
  '2️⃣ Функция check_user_role' as step,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'check_user_role'
    )
    THEN '❌ Функция НЕ создана'
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'check_user_role' AND p.prosecdef = true
    )
    THEN '❌ Функция создана, но НЕ имеет SECURITY DEFINER'
    ELSE '✅ Функция создана с SECURITY DEFINER'
  END as result;

-- ============================================
-- 3. Политики на profiles (должны быть простыми)
-- ============================================

SELECT
  '3️⃣ Политики на profiles' as step,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================
-- 4. Политики на lesson_sessions
-- ============================================

SELECT
  '4️⃣ Политики на lesson_sessions' as step,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename = 'lesson_sessions';

-- ============================================
-- 5. Политики на lesson_grades
-- ============================================

SELECT
  '5️⃣ Политики на lesson_grades' as step,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename = 'lesson_grades';

-- ============================================
-- 6. Проверка использования check_user_role в политиках
-- ============================================

SELECT
  '6️⃣ Использование check_user_role' as step,
  tablename,
  policyname,
  CASE
    WHEN qual LIKE '%check_user_role%' OR with_check LIKE '%check_user_role%'
    THEN '✅ Использует безопасную функцию'
    ELSE '⚠️ НЕ использует check_user_role'
  END as uses_safe_function
FROM pg_policies
WHERE tablename IN ('lesson_sessions', 'lesson_grades')
ORDER BY tablename, policyname;

-- ============================================
-- 7. ТЕСТ: Может ли функция проверить роль?
-- ============================================

SELECT
  '7️⃣ ТЕСТ функции' as step,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'check_user_role'
    )
    THEN (
      -- Пробуем вызвать функцию с auth.uid()
      SELECT
        CASE
          WHEN public.check_user_role(auth.uid(), ARRAY['teacher', 'student', 'editor'])
          THEN '✅ Функция работает и нашла роль для текущего пользователя'
          ELSE '⚠️ Функция работает, но не нашла роль (проверьте profiles)'
        END
    )
    ELSE '❌ Функция не существует, тест невозможен'
  END as test_result;

-- ============================================
-- 8. ИТОГОВАЯ ПРОВЕРКА
-- ============================================

SELECT '═══════════════════════════════════════════════' as separator;

SELECT
  '8️⃣ ИТОГОВАЯ ОЦЕНКА' as step,
  CASE
    -- Критическая ошибка: проблемная политика существует
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles' AND policyname = 'Teachers can view all profiles'
    )
    THEN '❌ КРИТИЧЕСКАЯ ОШИБКА: Проблемная политика все еще существует!'

    -- Ошибка: функции нет
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'check_user_role'
    )
    THEN '❌ ОШИБКА: Функция check_user_role не создана'

    -- Ошибка: функция без SECURITY DEFINER
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'check_user_role' AND p.prosecdef = true
    )
    THEN '❌ ОШИБКА: Функция существует, но НЕ имеет SECURITY DEFINER'

    -- Ошибка: нет политик на lesson_sessions
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = 'lesson_sessions'
    )
    THEN '❌ ОШИБКА: Нет политик на lesson_sessions'

    -- Предупреждение: политики не используют функцию
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'lesson_sessions'
        AND (qual LIKE '%check_user_role%' OR with_check LIKE '%check_user_role%')
    )
    THEN '⚠️ ПРЕДУПРЕЖДЕНИЕ: Политики lesson_sessions не используют check_user_role'

    -- Все хорошо!
    ELSE '✅✅✅ ВСЕ ИСПРАВЛЕНО! Можно пробовать входить в систему!'
  END as final_result;

SELECT '═══════════════════════════════════════════════' as separator;

-- ============================================
-- 9. СЛЕДУЮЩИЕ ШАГИ
-- ============================================

SELECT
  '9️⃣ СЛЕДУЮЩИЕ ШАГИ' as step,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'check_user_role' AND p.prosecdef = true
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles' AND policyname = 'Teachers can view all profiles'
    )
    THEN E'1. Закройте все вкладки с приложением\n2. Откройте новую вкладку в режиме инкогнито\n3. Войдите в систему\n4. Попробуйте создать урок в "Мониторинг урока"'
    ELSE 'Сначала исправьте ошибки выше!'
  END as instructions;
