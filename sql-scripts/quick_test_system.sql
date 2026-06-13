-- ============================================
-- БЫСТРОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ
-- ============================================
-- Этот скрипт проверяет работу всей системы
-- ============================================

-- ТЕСТ 1: Проверка автоматического расчета proficiency при создании submission
-- Создаем тестовую submission для существующего студента
DO $$
DECLARE
  v_student_id UUID;
  v_level_id UUID;
  v_submission_id UUID;
  v_proficiency_before TEXT;
  v_proficiency_after TEXT;
  v_score_before INTEGER;
  v_score_after INTEGER;
BEGIN
  -- Получаем первого студента
  SELECT id INTO v_student_id
  FROM profiles
  WHERE role = 'student'
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE NOTICE 'ТЕСТ 1 ПРОПУЩЕН: Нет студентов в базе';
    RETURN;
  END IF;

  -- Получаем первый уровень
  SELECT id INTO v_level_id
  FROM levels
  LIMIT 1;

  IF v_level_id IS NULL THEN
    RAISE NOTICE 'ТЕСТ 1 ПРОПУЩЕН: Нет уровней в базе';
    RETURN;
  END IF;

  -- Сохраняем текущий уровень и score
  SELECT proficiency_level, proficiency_score INTO v_proficiency_before, v_score_before
  FROM profiles
  WHERE id = v_student_id;

  RAISE NOTICE 'ТЕСТ 1: Создание submission для студента %', v_student_id;
  RAISE NOTICE '  Proficiency ДО: % (score: %)', COALESCE(v_proficiency_before, 'NULL'), COALESCE(v_score_before, 0);

  -- Создаем submission с хорошим качеством (используем реальную схему)
  INSERT INTO submissions (
    user_id,
    level_id,
    code,
    status,
    quality_metrics,
    completed_at
  ) VALUES (
    v_student_id,
    v_level_id,
    'print("Hello World")',
    'passed',
    jsonb_build_object(
      'overall_score', 85,
      'readability', 90,
      'correctness', 85,
      'efficiency', 80,
      'best_practices', 85
    ),
    NOW()
  ) RETURNING id INTO v_submission_id;

  -- Проверяем обновление proficiency
  SELECT proficiency_level, proficiency_score INTO v_proficiency_after, v_score_after
  FROM profiles
  WHERE id = v_student_id;

  RAISE NOTICE '  Proficiency ПОСЛЕ: % (score: %)', COALESCE(v_proficiency_after, 'NULL'), COALESCE(v_score_after, 0);
  RAISE NOTICE '  Submission ID: %', v_submission_id;

  IF v_proficiency_after IS NOT NULL THEN
    RAISE NOTICE '✅ ТЕСТ 1 ПРОЙДЕН: Proficiency автоматически рассчитался';
  ELSE
    RAISE NOTICE '⚠️ ТЕСТ 1: Proficiency не обновился (возможно, ручной override включен)';
  END IF;
END $$;

-- ТЕСТ 2: Проверка отслеживания навыков
SELECT
  '=== ТЕСТ 2: Отслеживание навыков ===' as test,
  COUNT(*) as skill_profiles_created,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Навыки отслеживаются'
    ELSE '⚠️ Еще нет данных по навыкам'
  END as status
FROM user_skill_profile;

-- ТЕСТ 3: Проверка функции слабых мест
SELECT
  '=== ТЕСТ 3: Функция слабых мест ===' as test,
  COUNT(*) as students_checked,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Функция работает'
    ELSE '⚠️ Нет данных для анализа'
  END as status
FROM profiles p
WHERE role = 'student'
  AND EXISTS (
    SELECT 1 FROM get_student_weak_areas(p.id, 3)
  );

-- ТЕСТ 4: Проверка активных entrance тестов
SELECT
  '=== ТЕСТ 4: Entrance Tests ===' as test,
  COUNT(*) as active_tests,
  CASE
    WHEN COUNT(*) >= 1 THEN '✅ Тесты доступны'
    ELSE '❌ Нет активных тестов'
  END as status
FROM entrance_tests
WHERE is_active = true;

-- ТЕСТ 5: Проверка target_skills в levels
SELECT
  '=== ТЕСТ 5: Target Skills в Levels ===' as test,
  COUNT(*) as levels_with_skills,
  (SELECT COUNT(*) FROM levels) as total_levels,
  CASE
    WHEN COUNT(*) = (SELECT COUNT(*) FROM levels) THEN '✅ Все уровни настроены'
    WHEN COUNT(*) > 0 THEN '⚠️ Некоторые уровни без навыков'
    ELSE '❌ Нет навыков ни в одном уровне'
  END as status
FROM levels
WHERE target_skills IS NOT NULL AND jsonb_array_length(target_skills) > 0;

-- ТЕСТ 6: Проверка истории изменений proficiency
SELECT
  '=== ТЕСТ 6: История Proficiency ===' as test,
  COUNT(*) as history_records,
  COUNT(DISTINCT user_id) as students_tracked,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ История ведется'
    ELSE '⚠️ Пока нет истории (это нормально для новой системы)'
  END as status
FROM proficiency_history;

-- ИТОГОВАЯ СВОДКА
SELECT
  '=== ИТОГОВАЯ СВОДКА ===' as summary,
  (SELECT COUNT(*) FROM skill_categories) as skill_categories,
  (SELECT COUNT(*) FROM entrance_tests WHERE is_active = true) as active_tests,
  (SELECT COUNT(*) FROM profiles WHERE proficiency_level IS NOT NULL) as students_with_proficiency,
  (SELECT COUNT(*) FROM user_skill_profile) as skill_tracking_records,
  (SELECT COUNT(*) FROM proficiency_history) as proficiency_changes,
  CASE
    WHEN (SELECT COUNT(*) FROM skill_categories) = 12
     AND (SELECT COUNT(*) FROM entrance_tests WHERE is_active = true) >= 1
    THEN '✅ СИСТЕМА ГОТОВА К ИСПОЛЬЗОВАНИЮ'
    ELSE '⚠️ Требуется дополнительная настройка'
  END as system_status;
