-- ============================================
-- Показать ТОЧНЫЕ RLS политики на lesson_sessions
-- ============================================

-- Показать политики с полными выражениями
SELECT
  'LESSON_SESSIONS POLICIES' as section,
  policyname,
  cmd as operation,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'lesson_sessions'
ORDER BY policyname, cmd;

-- Проверка: есть ли политика для INSERT?
SELECT
  'INSERT POLICY CHECK' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'lesson_sessions'
        AND (cmd = 'INSERT' OR cmd = '*')
    )
    THEN '✅ Есть политика для INSERT'
    ELSE '❌ НЕТ политики для INSERT!'
  END as result;

-- Проверка: есть ли политика ALL (покрывающая все операции)?
SELECT
  'ALL POLICY CHECK' as section,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'lesson_sessions'
        AND cmd = '*'
        AND policyname LIKE '%Teachers can manage own lessons%'
    )
    THEN '✅ Есть политика ALL для учителей'
    ELSE '❌ НЕТ политики ALL!'
  END as result;
