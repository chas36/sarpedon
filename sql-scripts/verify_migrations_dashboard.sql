-- ============================================
-- ПРОВЕРКА МИГРАЦИЙ - ДЛЯ SUPABASE DASHBOARD
-- ============================================
-- Скопируйте этот файл в SQL Editor и запустите
-- ============================================

-- 1. ПРОВЕРКА ТАБЛИЦ (Ожидается: 7 таблиц)
SELECT
  'Таблицы' as check_type,
  table_name,
  '✅' as status
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

-- 2. ПРОВЕРКА КОЛОНОК В PROFILES
SELECT
  'Колонки profiles' as check_type,
  column_name,
  data_type,
  '✅' as status
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

-- 3. ПРОВЕРКА ФУНКЦИЙ (Ожидается: 9 функций)
SELECT
  'Функции' as check_type,
  routine_name,
  '✅' as status
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

-- 4. ПРОВЕРКА ТРИГГЕРОВ (Ожидается: 2 триггера)
SELECT
  'Триггеры' as check_type,
  trigger_name,
  event_object_table,
  '✅' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'update_proficiency_on_submission',
    'update_skills_on_submission'
  )
ORDER BY trigger_name;

-- 5. ПРОВЕРКА ДАННЫХ - SKILL CATEGORIES (Ожидается: 12 категорий)
SELECT
  'Skill Categories' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 12 THEN '✅ OK (12 навыков)'
    ELSE '❌ Ошибка: должно быть 12'
  END as status
FROM skill_categories;

-- 6. ПРОВЕРКА ДАННЫХ - ENTRANCE TESTS (Ожидается: >= 1 активный тест)
SELECT
  'Entrance Tests' as check_type,
  COUNT(*) as active_tests_count,
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ OK'
    ELSE '❌ Нет активных тестов'
  END as status
FROM entrance_tests
WHERE is_active = true;

-- 7. ПРОВЕРКА ВОПРОСОВ ТЕСТА (Ожидается: >= 12 вопросов)
SELECT
  'Test Questions' as check_type,
  COUNT(*) as total_questions,
  COUNT(*) FILTER (WHERE difficulty_level = 'beginner') as beginner_count,
  COUNT(*) FILTER (WHERE difficulty_level = 'intermediate') as intermediate_count,
  COUNT(*) FILTER (WHERE difficulty_level = 'advanced') as advanced_count,
  CASE 
    WHEN COUNT(*) >= 12 THEN '✅ OK'
    ELSE '❌ Недостаточно вопросов'
  END as status
FROM entrance_test_questions;

-- 8. ПРОВЕРКА TARGET_SKILLS В LEVELS
SELECT
  'Target Skills' as check_type,
  language,
  COUNT(*) as total_levels,
  COUNT(*) FILTER (WHERE target_skills IS NOT NULL AND jsonb_array_length(target_skills) > 0) as levels_with_skills,
  CASE 
    WHEN COUNT(*) = COUNT(*) FILTER (WHERE target_skills IS NOT NULL AND jsonb_array_length(target_skills) > 0)
    THEN '✅ Все уровни имеют навыки'
    ELSE '⚠️ Некоторые уровни без навыков'
  END as status
FROM levels
GROUP BY language;

-- 9. ИТОГОВАЯ ПРОВЕРКА
SELECT
  '=== ИТОГОВАЯ ПРОВЕРКА ===' as summary,
  (SELECT COUNT(*) FROM skill_categories) as skill_categories,
  (SELECT COUNT(*) FROM entrance_tests WHERE is_active = true) as active_tests,
  (SELECT COUNT(*) FROM entrance_test_questions) as test_questions,
  CASE 
    WHEN (SELECT COUNT(*) FROM skill_categories) = 12
     AND (SELECT COUNT(*) FROM entrance_tests WHERE is_active = true) >= 1
     AND (SELECT COUNT(*) FROM entrance_test_questions) >= 12
    THEN '✅✅✅ ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ УСПЕШНО! ✅✅✅'
    ELSE '❌ Есть проблемы - проверьте вывод выше'
  END as final_status;
