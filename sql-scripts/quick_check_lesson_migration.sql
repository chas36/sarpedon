-- Быстрая проверка: применена ли миграция системы мониторинга уроков

-- Проверка 1: Таблицы
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lesson_sessions')
    THEN '✅ lesson_sessions создана'
    ELSE '❌ lesson_sessions НЕ СОЗДАНА'
  END as check_table_sessions,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lesson_grades')
    THEN '✅ lesson_grades создана'
    ELSE '❌ lesson_grades НЕ СОЗДАНА'
  END as check_table_grades;

-- Проверка 2: Функции
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_active_lesson_for_class')
    THEN '✅ get_active_lesson_for_class создана'
    ELSE '❌ get_active_lesson_for_class НЕ СОЗДАНА'
  END as check_func_1,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_lesson_activity')
    THEN '✅ get_lesson_activity создана'
    ELSE '❌ get_lesson_activity НЕ СОЗДАНА'
  END as check_func_2;

-- Проверка 3: Колонка lesson_session_id в submissions
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'submissions' AND column_name = 'lesson_session_id')
    THEN '✅ submissions.lesson_session_id добавлена'
    ELSE '❌ submissions.lesson_session_id НЕ ДОБАВЛЕНА'
  END as check_column;

-- ИТОГ: что нужно делать
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('lesson_sessions', 'lesson_grades')) = 2
      AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('get_active_lesson_for_class', 'get_lesson_activity')) = 2
    THEN '✅ МИГРАЦИЯ ПРИМЕНЕНА! Обновите страницу приложения (F5)'
    ELSE '❌ МИГРАЦИЯ НЕ ПРИМЕНЕНА! Выполните: sql-scripts/apply_lesson_monitoring_safe.sql'
  END as result;
