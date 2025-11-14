-- ============================================
-- Проверка текущих RLS политик для lesson_sessions
-- ============================================

SELECT
  'ТЕКУЩИЕ RLS ПОЛИТИКИ' as section,
  policyname,
  cmd as operation,
  CASE
    WHEN qual LIKE '%user_metadata%' THEN '❌ СТАРАЯ (проверяет JWT user_metadata)'
    WHEN qual LIKE '%app_metadata%' THEN '❌ СТАРАЯ (проверяет JWT app_metadata)'
    WHEN qual LIKE '%profiles%' THEN '✅ НОВАЯ (проверяет таблицу profiles)'
    ELSE 'НЕИЗВЕСТНАЯ'
  END as policy_type,
  qual as using_condition
FROM pg_policies
WHERE tablename = 'lesson_sessions'
ORDER BY policyname;

-- Детальная проверка политики "Teachers can manage own lessons"
SELECT
  'ДЕТАЛИ ПОЛИТИКИ INSERT' as section,
  policyname,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'lesson_sessions'
  AND cmd = 'INSERT';

-- Что нужно сделать?
SELECT
  'РЕКОМЕНДАЦИЯ' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'lesson_sessions'
        AND qual LIKE '%user_metadata%'
    )
    THEN '❌ СТАРЫЕ ПОЛИТИКИ! Выполните: sql-scripts/fix_lesson_rls_policies.sql'
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'lesson_sessions'
        AND qual LIKE '%profiles%'
    )
    THEN '✅ НОВЫЕ ПОЛИТИКИ ПРИМЕНЕНЫ! Проверьте JWT токен в консоли браузера.'
    ELSE '⚠️ ПОЛИТИК НЕТ! Выполните: sql-scripts/apply_lesson_monitoring_safe.sql'
  END as action;
