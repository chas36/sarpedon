-- ============================================
-- Диагностика системы мониторинга уроков
-- ============================================
-- Этот скрипт проверяет все компоненты системы

-- 1. Проверка таблиц
SELECT
  'Таблицы' as check_type,
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('lesson_sessions', 'lesson_grades')
ORDER BY table_name;

-- 2. Проверка колонок в submissions
SELECT
  'Колонка в submissions' as check_type,
  column_name,
  data_type,
  'EXISTS' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'submissions'
  AND column_name = 'lesson_session_id';

-- 3. Проверка функций
SELECT
  'Функции' as check_type,
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_active_lesson_for_class',
    'get_lesson_activity',
    'auto_assign_submission_to_lesson'
  )
ORDER BY routine_name;

-- 4. Проверка RLS политик для lesson_sessions
SELECT
  'RLS Policy lesson_sessions' as check_type,
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE tablename = 'lesson_sessions'
ORDER BY policyname;

-- 5. Проверка RLS политик для lesson_grades
SELECT
  'RLS Policy lesson_grades' as check_type,
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE tablename = 'lesson_grades'
ORDER BY policyname;

-- 6. Проверка триггеров
SELECT
  'Триггеры' as check_type,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'auto_assign_lesson_to_submission',
    'update_lesson_sessions_updated_at',
    'update_lesson_grades_updated_at'
  )
ORDER BY trigger_name;

-- 7. Проверка прав доступа к таблицам
SELECT
  'Права на таблицы' as check_type,
  table_name,
  grantee,
  string_agg(privilege_type, ', ') as privileges
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('lesson_sessions', 'lesson_grades')
  AND grantee = 'authenticated'
GROUP BY table_name, grantee
ORDER BY table_name;

-- 8. Проверка прав доступа к функциям
SELECT
  'Права на функции' as check_type,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_active_lesson_for_class',
    'get_lesson_activity'
  )
  AND grantee IN ('authenticated', 'anon')
ORDER BY routine_name, grantee;

-- 9. Проверка включен ли RLS
SELECT
  'RLS Enabled' as check_type,
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('lesson_sessions', 'lesson_grades');

-- 10. Итоговая информация
SELECT
  'Итог' as summary,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('lesson_sessions', 'lesson_grades')) as tables_count,
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name LIKE '%lesson%') as functions_count,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename IN ('lesson_sessions', 'lesson_grades')) as policies_count;
