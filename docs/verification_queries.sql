-- ============================================
-- VERIFICATION QUERIES FOR SARPEDON MIGRATIONS
-- ============================================
-- Этот файл содержит все SQL запросы для проверки
-- успешности применения миграций и работы системы
-- ============================================

\echo '=========================================='
\echo 'ПРОВЕРКА МИГРАЦИЙ SARPEDON'
\echo '=========================================='
\echo ''

-- ============================================
-- 1. ПРОВЕРКА СТРУКТУРЫ БД
-- ============================================

\echo '1. Проверка таблиц...'
SELECT
  table_name,
  CASE
    WHEN table_name IN ('proficiency_history', 'skill_categories', 'user_skill_profile',
                        'entrance_tests', 'entrance_test_questions',
                        'entrance_test_attempts', 'entrance_test_answers')
    THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'proficiency_history',
    'skill_categories',
    'user_skill_profile',
    'entrance_tests',
    'entrance_test_questions',
    'entrance_test_attempts',
    'entrance_test_answers'
  )
ORDER BY table_name;

\echo ''
\echo '2. Проверка колонок profiles...'
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN (
    'proficiency_level',
    'proficiency_score',
    'proficiency_last_assessed',
    'proficiency_manual_override'
  )
ORDER BY column_name;

\echo ''
\echo '3. Проверка функций...'
SELECT
  routine_name,
  CASE
    WHEN routine_name IN (
      'calculate_proficiency_score',
      'set_student_proficiency_manual',
      'enable_auto_proficiency',
      'get_student_weak_areas',
      'update_skill_proficiency',
      'analyze_submission_skills',
      'start_entrance_test',
      'calculate_entrance_test_proficiency',
      'complete_entrance_test'
    ) THEN '✅'
    ELSE '❓'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calculate_proficiency_score',
    'set_student_proficiency_manual',
    'enable_auto_proficiency',
    'get_student_weak_areas',
    'update_skill_proficiency',
    'analyze_submission_skills',
    'start_entrance_test',
    'calculate_entrance_test_proficiency',
    'complete_entrance_test'
  )
ORDER BY routine_name;

\echo ''
\echo '4. Проверка триггеров...'
SELECT
  trigger_name,
  event_object_table,
  action_timing || ' ' || event_manipulation as trigger_type,
  CASE
    WHEN trigger_name IN (
      'after_submission_update_proficiency',
      'after_submission_complete_analyze_skills'
    ) THEN '✅'
    ELSE '❓'
  END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'after_submission_update_proficiency',
    'after_submission_complete_analyze_skills'
  );

-- ============================================
-- 2. ПРОВЕРКА ДАННЫХ
-- ============================================

\echo ''
\echo '=========================================='
\echo '2. ПРОВЕРКА ДАННЫХ'
\echo '=========================================='

\echo ''
\echo '5. Skill Categories (ожидается 12)...'
SELECT
  COUNT(*) as total_skills,
  CASE
    WHEN COUNT(*) = 12 THEN '✅ Correct'
    ELSE '❌ Expected 12, got ' || COUNT(*)::TEXT
  END as status
FROM skill_categories;

\echo ''
\echo 'Список skill categories:'
SELECT name FROM skill_categories ORDER BY name;

\echo ''
\echo '6. Entrance Tests (ожидается минимум 1)...'
SELECT
  id,
  title,
  is_active,
  language,
  passing_score,
  time_limit_minutes,
  (SELECT COUNT(*) FROM entrance_test_questions WHERE test_id = entrance_tests.id) as questions_count
FROM entrance_tests
ORDER BY created_at DESC;

\echo ''
\echo '7. Студенты с proficiency...'
SELECT
  COUNT(*) FILTER (WHERE role = 'student') as total_students,
  COUNT(*) FILTER (WHERE role = 'student' AND proficiency_level IS NOT NULL) as students_with_proficiency,
  COUNT(*) FILTER (WHERE role = 'student' AND proficiency_level = 'beginner') as beginners,
  COUNT(*) FILTER (WHERE role = 'student' AND proficiency_level = 'intermediate') as intermediates,
  COUNT(*) FILTER (WHERE role = 'student' AND proficiency_level = 'advanced') as advanced
FROM profiles;

-- ============================================
-- 3. ПРОВЕРКА RLS ПОЛИТИК
-- ============================================

\echo ''
\echo '=========================================='
\echo '3. ПРОВЕРКА RLS ПОЛИТИК'
\echo '=========================================='

\echo ''
\echo '8. RLS политики по таблицам...'
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅'
    ELSE '❌ No policies'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'proficiency_history',
    'skill_categories',
    'user_skill_profile',
    'entrance_tests',
    'entrance_test_questions',
    'entrance_test_attempts',
    'entrance_test_answers'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 4. ПРОВЕРКА РАБОТЫ СИСТЕМЫ
-- ============================================

\echo ''
\echo '=========================================='
\echo '4. СТАТИСТИКА СИСТЕМЫ'
\echo '=========================================='

\echo ''
\echo '9. Уровни с target_skills...'
SELECT
  COUNT(*) as total_levels,
  COUNT(target_skills) FILTER (WHERE target_skills IS NOT NULL) as levels_with_skills,
  ROUND(
    COUNT(target_skills) FILTER (WHERE target_skills IS NOT NULL)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100,
    1
  ) as coverage_percentage
FROM levels;

\echo ''
\echo '10. Популярные навыки в уровнях...'
SELECT
  skill,
  COUNT(*) as level_count
FROM levels,
  jsonb_array_elements_text(target_skills) as skill
WHERE target_skills IS NOT NULL
GROUP BY skill
ORDER BY level_count DESC
LIMIT 10;

\echo ''
\echo '11. Активность студентов в профилировании навыков...'
SELECT
  sc.name as skill_category,
  COUNT(DISTINCT usp.user_id) as students_practicing,
  ROUND(AVG(usp.proficiency), 1) as avg_proficiency,
  SUM(usp.practice_count) as total_practices,
  SUM(usp.mistake_count) as total_mistakes
FROM user_skill_profile usp
JOIN skill_categories sc ON sc.id = usp.skill_category_id
GROUP BY sc.name
ORDER BY students_practicing DESC, avg_proficiency DESC
LIMIT 10;

\echo ''
\echo '12. История изменений proficiency...'
SELECT
  change_reason,
  COUNT(*) as count,
  COUNT(DISTINCT student_id) as unique_students
FROM proficiency_history
GROUP BY change_reason
ORDER BY count DESC;

\echo ''
\echo '13. Статистика входных тестов...'
SELECT
  et.title,
  et.is_active,
  COUNT(DISTINCT eta.student_id) as students_tested,
  COUNT(*) FILTER (WHERE eta.status = 'completed') as completed_attempts,
  COUNT(*) FILTER (WHERE eta.status = 'in_progress') as in_progress_attempts,
  ROUND(AVG(eta.score) FILTER (WHERE eta.status = 'completed'), 1) as avg_score,
  COUNT(*) FILTER (WHERE eta.proficiency_level_assigned = 'beginner') as assigned_beginner,
  COUNT(*) FILTER (WHERE eta.proficiency_level_assigned = 'intermediate') as assigned_intermediate,
  COUNT(*) FILTER (WHERE eta.proficiency_level_assigned = 'advanced') as assigned_advanced
FROM entrance_tests et
LEFT JOIN entrance_test_attempts eta ON eta.test_id = et.id
GROUP BY et.id, et.title, et.is_active
ORDER BY et.created_at DESC;

-- ============================================
-- 5. ТЕСТОВЫЕ ЗАПРОСЫ ДЛЯ ОТЛАДКИ
-- ============================================

\echo ''
\echo '=========================================='
\echo '5. ТЕСТОВЫЕ ЗАПРОСЫ'
\echo '=========================================='

\echo ''
\echo '14. Пример расчета proficiency для первого студента...'
-- Берем первого студента для демонстрации
DO $$
DECLARE
  test_student_id UUID;
  calc_result RECORD;
BEGIN
  -- Находим первого студента
  SELECT id INTO test_student_id
  FROM profiles
  WHERE role = 'student'
  LIMIT 1;

  IF test_student_id IS NOT NULL THEN
    -- Вызываем функцию расчета
    SELECT * INTO calc_result
    FROM calculate_proficiency_score(test_student_id);

    RAISE NOTICE 'Student ID: %', test_student_id;
    RAISE NOTICE 'Calculated Level: %', calc_result.level;
    RAISE NOTICE 'Calculated Score: %', calc_result.score;
  ELSE
    RAISE NOTICE 'No students found in database';
  END IF;
END $$;

\echo ''
\echo '15. Пример получения слабых мест студента...'
-- Берем первого студента с навыками
DO $$
DECLARE
  test_student_id UUID;
  weak_area RECORD;
BEGIN
  SELECT DISTINCT user_id INTO test_student_id
  FROM user_skill_profile
  LIMIT 1;

  IF test_student_id IS NOT NULL THEN
    RAISE NOTICE 'Student ID: %', test_student_id;
    RAISE NOTICE 'Weak areas:';

    FOR weak_area IN
      SELECT * FROM get_student_weak_areas(test_student_id, 3)
    LOOP
      RAISE NOTICE '  - %: proficiency %, mistakes %',
        weak_area.skill_name,
        weak_area.proficiency,
        weak_area.mistake_count;
    END LOOP;
  ELSE
    RAISE NOTICE 'No student skill profiles found';
  END IF;
END $$;

-- ============================================
-- 6. ИТОГОВЫЙ ОТЧЕТ
-- ============================================

\echo ''
\echo '=========================================='
\echo '6. ИТОГОВЫЙ ОТЧЕТ'
\echo '=========================================='

\echo ''
\echo 'Сводная информация о системе:'
SELECT
  'Tables Created' as component,
  (
    SELECT COUNT(*)::TEXT
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'proficiency_history',
        'skill_categories',
        'user_skill_profile',
        'entrance_tests',
        'entrance_test_questions',
        'entrance_test_attempts',
        'entrance_test_answers'
      )
  ) || '/7' as status
UNION ALL
SELECT
  'Functions Created',
  (
    SELECT COUNT(*)::TEXT
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN (
        'calculate_proficiency_score',
        'set_student_proficiency_manual',
        'enable_auto_proficiency',
        'get_student_weak_areas',
        'update_skill_proficiency',
        'analyze_submission_skills',
        'start_entrance_test',
        'calculate_entrance_test_proficiency',
        'complete_entrance_test'
      )
  ) || '/9'
UNION ALL
SELECT
  'Triggers Created',
  (
    SELECT COUNT(*)::TEXT
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
      AND trigger_name IN (
        'after_submission_update_proficiency',
        'after_submission_complete_analyze_skills'
      )
  ) || '/2'
UNION ALL
SELECT
  'Skill Categories',
  (SELECT COUNT(*)::TEXT FROM skill_categories) || '/12'
UNION ALL
SELECT
  'Active Tests',
  (SELECT COUNT(*)::TEXT FROM entrance_tests WHERE is_active = true) || ' (min 1)'
UNION ALL
SELECT
  'Total Students',
  (SELECT COUNT(*)::TEXT FROM profiles WHERE role = 'student')
UNION ALL
SELECT
  'Students with Proficiency',
  (SELECT COUNT(*)::TEXT FROM profiles WHERE role = 'student' AND proficiency_level IS NOT NULL)
UNION ALL
SELECT
  'Total Skill Records',
  (SELECT COUNT(*)::TEXT FROM user_skill_profile)
UNION ALL
SELECT
  'Total Proficiency Changes',
  (SELECT COUNT(*)::TEXT FROM proficiency_history)
UNION ALL
SELECT
  'Completed Entrance Tests',
  (SELECT COUNT(*)::TEXT FROM entrance_test_attempts WHERE status = 'completed');

\echo ''
\echo '=========================================='
\echo 'ПРОВЕРКА ЗАВЕРШЕНА'
\echo '=========================================='
\echo ''
\echo 'Если все показатели в норме:'
\echo '  ✅ Tables: 7/7'
\echo '  ✅ Functions: 9/9'
\echo '  ✅ Triggers: 2/2'
\echo '  ✅ Skills: 12/12'
\echo '  ✅ Active Tests: >= 1'
\echo ''
\echo 'Система готова к тестированию!'
\echo ''
