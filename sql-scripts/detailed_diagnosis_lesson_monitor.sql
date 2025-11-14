-- ============================================
-- ДЕТАЛЬНАЯ ДИАГНОСТИКА - Мониторинг уроков
-- ============================================
-- Этот скрипт покажет точную причину ошибок 403/400

-- ========================================
-- ЧАСТЬ 1: КТО ВЫ?
-- ========================================
SELECT
  '1. ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ' as section,
  auth.uid() as your_user_id,
  auth.jwt() ->> 'email' as your_email,
  auth.jwt() -> 'user_metadata' ->> 'role' as your_role_from_jwt;

-- Ваш профиль из таблицы profiles
SELECT
  '1. ВАШ ПРОФИЛЬ' as section,
  id,
  first_name,
  last_name,
  role,
  class,
  email
FROM public.profiles
WHERE id = auth.uid();

-- ========================================
-- ЧАСТЬ 2: СУЩЕСТВУЮТ ЛИ ТАБЛИЦЫ?
-- ========================================
SELECT
  '2. ТАБЛИЦЫ' as section,
  table_name,
  'EXISTS ✅' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('lesson_sessions', 'lesson_grades', 'submissions')
ORDER BY table_name;

-- ========================================
-- ЧАСТЬ 3: СУЩЕСТВУЮТ ЛИ ФУНКЦИИ?
-- ========================================
SELECT
  '3. ФУНКЦИИ' as section,
  routine_name,
  data_type as return_type,
  'EXISTS ✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_active_lesson_for_class', 'get_lesson_activity')
ORDER BY routine_name;

-- ========================================
-- ЧАСТЬ 4: RLS ВКЛЮЧЕН?
-- ========================================
SELECT
  '4. RLS STATUS' as section,
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED ✅' ELSE 'DISABLED ❌' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('lesson_sessions', 'lesson_grades', 'submissions')
ORDER BY tablename;

-- ========================================
-- ЧАСТЬ 5: RLS ПОЛИТИКИ
-- ========================================
SELECT
  '5. RLS POLICIES' as section,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename IN ('lesson_sessions', 'lesson_grades')
ORDER BY tablename, policyname;

-- ========================================
-- ЧАСТЬ 6: ПРАВА ДОСТУПА К ТАБЛИЦАМ
-- ========================================
SELECT
  '6. TABLE PRIVILEGES' as section,
  table_name,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('lesson_sessions', 'lesson_grades')
  AND grantee IN ('authenticated', 'anon', 'PUBLIC')
ORDER BY table_name, grantee;

-- ========================================
-- ЧАСТЬ 7: ТЕСТОВЫЙ SELECT НА lesson_sessions
-- ========================================
-- Попытка SELECT (как делает приложение)
DO $$
BEGIN
  RAISE NOTICE '7. TESTING SELECT FROM lesson_sessions...';

  -- Проверяем, можем ли мы делать SELECT
  PERFORM * FROM public.lesson_sessions LIMIT 1;
  RAISE NOTICE '✅ SELECT FROM lesson_sessions: SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ SELECT FROM lesson_sessions FAILED: %', SQLERRM;
END $$;

-- ========================================
-- ЧАСТЬ 8: ТЕСТОВЫЙ INSERT НА lesson_sessions
-- ========================================
-- Попытка INSERT (как делает приложение при создании урока)
DO $$
DECLARE
  v_test_id UUID;
BEGIN
  RAISE NOTICE '8. TESTING INSERT INTO lesson_sessions...';

  -- Пытаемся создать тестовую запись
  INSERT INTO public.lesson_sessions (teacher_id, class, topic, status)
  VALUES (auth.uid(), 'TEST', 'Test Lesson', 'active')
  RETURNING id INTO v_test_id;

  RAISE NOTICE '✅ INSERT INTO lesson_sessions: SUCCESS (id: %)', v_test_id;

  -- Удаляем тестовую запись
  DELETE FROM public.lesson_sessions WHERE id = v_test_id;
  RAISE NOTICE '✅ Test record cleaned up';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ INSERT INTO lesson_sessions FAILED: %', SQLERRM;
END $$;

-- ========================================
-- ЧАСТЬ 9: ПРОВЕРКА КОЛОНКИ lesson_session_id
-- ========================================
SELECT
  '9. SUBMISSIONS COLUMN' as section,
  column_name,
  data_type,
  is_nullable,
  'EXISTS ✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'submissions'
  AND column_name = 'lesson_session_id';

-- ========================================
-- ЧАСТЬ 10: ИТОГОВАЯ ДИАГНОСТИКА
-- ========================================
SELECT
  '10. SUMMARY' as section,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN ('lesson_sessions', 'lesson_grades')) as tables_exist,
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema = 'public' AND routine_name IN ('get_active_lesson_for_class', 'get_lesson_activity')) as functions_exist,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename IN ('lesson_sessions', 'lesson_grades')) as policies_exist,
  CASE
    WHEN auth.jwt() -> 'user_metadata' ->> 'role' = 'teacher' THEN 'teacher ✅'
    ELSE 'NOT TEACHER ❌ (role: ' || COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'NULL') || ')'
  END as your_role;

-- ========================================
-- ЧТО ДЕЛАТЬ ДАЛЬШЕ?
-- ========================================
SELECT
  '11. NEXT STEPS' as section,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('lesson_sessions', 'lesson_grades')) = 0
    THEN '❌ TABLES NOT EXIST → Run: sql-scripts/apply_lesson_monitoring_safe.sql'
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('lesson_sessions', 'lesson_grades')) = 0
    THEN '❌ NO RLS POLICIES → Run: sql-scripts/apply_lesson_monitoring_safe.sql'
    WHEN auth.jwt() -> 'user_metadata' ->> 'role' != 'teacher'
    THEN '❌ YOU ARE NOT A TEACHER → Check your profile role'
    ELSE '✅ Everything looks good. Try: NOTIFY pgrst, ''reload schema''; and refresh browser (F5)'
  END as recommendation;
