# 🚀 Руководство по применению миграций и тестированию системы Sarpedon

Это руководство поможет применить все миграции и протестировать адаптивную систему обучения.

## 📋 Содержание

1. [Применение миграций](#применение-миграций)
2. [Проверка успешности миграций](#проверка-успешности-миграций)
3. [Обновление существующих данных](#обновление-существующих-данных)
4. [План тестирования](#план-тестирования)
5. [Устранение проблем](#устранение-проблем)

---

## 1. Применение миграций

### Проверка текущего состояния

**Шаг 1: Проверьте примененные миграции**

```bash
# Через Supabase CLI
cd supabase
npx supabase migration list
```

Вы должны увидеть список миграций. Нам нужно применить:
- `20251108000000_add_proficiency_levels.sql` - Система proficiency
- `20251109000000_add_skill_tracking.sql` - Отслеживание навыков
- `20251110000000_add_entrance_tests.sql` - Входные тесты

### Метод 1: Через Supabase Dashboard (рекомендуется)

**Шаг 2: Откройте Supabase Dashboard**

1. Перейдите в https://app.supabase.com
2. Выберите ваш проект
3. Перейдите в **SQL Editor**

**Шаг 3: Примените миграции по очереди**

```sql
-- ============================================
-- МИГРАЦИЯ 1: Proficiency Levels
-- ============================================
-- Скопируйте и выполните содержимое файла:
-- supabase/migrations/20251108000000_add_proficiency_levels.sql
```

**После выполнения проверьте:**
```sql
-- Должна появиться таблица proficiency_history
SELECT COUNT(*) FROM proficiency_history;

-- Должны появиться новые колонки в profiles
SELECT proficiency_level, proficiency_score
FROM profiles
LIMIT 1;
```

**Шаг 4: Примените вторую миграцию**

```sql
-- ============================================
-- МИГРАЦИЯ 2: Skill Tracking
-- ============================================
-- Скопируйте и выполните содержимое файла:
-- supabase/migrations/20251109000000_add_skill_tracking.sql
```

**После выполнения проверьте:**
```sql
-- Должны появиться таблицы skill_categories и user_skill_profile
SELECT COUNT(*) FROM skill_categories; -- Должно быть 12
SELECT name FROM skill_categories ORDER BY name;

-- Проверьте функции
SELECT proname FROM pg_proc
WHERE proname IN ('get_student_weak_areas', 'update_skill_proficiency', 'analyze_submission_skills');
```

**Шаг 5: Примените третью миграцию**

```sql
-- ============================================
-- МИГРАЦИЯ 3: Entrance Tests
-- ============================================
-- Скопируйте и выполните содержимое файла:
-- supabase/migrations/20251110000000_add_entrance_tests.sql
```

**После выполнения проверьте:**
```sql
-- Должны появиться таблицы entrance_tests и entrance_test_questions
SELECT COUNT(*) FROM entrance_tests; -- Должен быть 1 (дефолтный Python тест)
SELECT COUNT(*) FROM entrance_test_questions; -- Должно быть 12 вопросов
SELECT title FROM entrance_tests WHERE is_active = true;
```

### Метод 2: Через Supabase CLI

```bash
# В директории проекта
cd /home/user/sarpedon

# Применить все непримененные миграции
npx supabase db push

# Или применить конкретную миграцию
npx supabase migration up
```

---

## 2. Проверка успешности миграций

### SQL скрипт для полной проверки

```sql
-- ============================================
-- ПОЛНАЯ ПРОВЕРКА МИГРАЦИЙ
-- ============================================

-- 1. Проверка профилей студентов
SELECT
  COUNT(*) as total_students,
  COUNT(proficiency_level) as students_with_proficiency,
  COUNT(proficiency_score) as students_with_score
FROM profiles
WHERE role = 'student';

-- 2. Проверка категорий навыков
SELECT
  'skill_categories' as table_name,
  COUNT(*) as record_count,
  '12 expected' as note
FROM skill_categories
UNION ALL
SELECT
  'proficiency_history' as table_name,
  COUNT(*) as record_count,
  'may be 0 initially' as note
FROM proficiency_history
UNION ALL
SELECT
  'user_skill_profile' as table_name,
  COUNT(*) as record_count,
  'may be 0 initially' as note
FROM user_skill_profile;

-- 3. Проверка входных тестов
SELECT
  id,
  title,
  is_active,
  (SELECT COUNT(*) FROM entrance_test_questions WHERE test_id = entrance_tests.id) as question_count
FROM entrance_tests;

-- 4. Проверка функций
SELECT
  routine_name,
  routine_type
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

-- 5. Проверка триггеров
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'after_submission_update_proficiency',
    'after_submission_complete_analyze_skills'
  );

-- 6. Проверка RLS политик
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
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
GROUP BY schemaname, tablename
ORDER BY tablename;
```

**Ожидаемые результаты:**
- ✅ 12 категорий навыков (skill_categories)
- ✅ 1 активный входной тест
- ✅ 12 вопросов в дефолтном тесте
- ✅ 9 функций созданы
- ✅ 2 триггера созданы
- ✅ RLS политики для всех таблиц

---

## 3. Обновление существующих данных

### Шаг 6: Обновите target_skills в существующих уровнях

```sql
-- ============================================
-- ОБНОВЛЕНИЕ TARGET_SKILLS
-- ============================================
-- Выполните содержимое файла:
-- docs/improvements/update_target_skills.sql
```

**Проверка после обновления:**

```sql
-- Сколько уровней имеют target_skills
SELECT
  COUNT(*) as total_levels,
  COUNT(target_skills) as levels_with_skills,
  ROUND(COUNT(target_skills)::NUMERIC / COUNT(*) * 100, 1) as coverage_percentage
FROM levels;

-- Какие навыки наиболее популярны
SELECT
  skill,
  COUNT(*) as level_count
FROM levels,
  jsonb_array_elements_text(target_skills) as skill
GROUP BY skill
ORDER BY level_count DESC;

-- Уровни без target_skills (нужно будет добавить вручную)
SELECT
  id,
  title,
  difficulty,
  language
FROM levels
WHERE target_skills IS NULL OR jsonb_array_length(target_skills) = 0
ORDER BY difficulty;
```

### Шаг 7: Инициализируйте proficiency для существующих студентов

```sql
-- ============================================
-- ИНИЦИАЛИЗАЦИЯ PROFICIENCY ДЛЯ СТУДЕНТОВ
-- ============================================

-- Пересчитать proficiency для всех студентов
DO $$
DECLARE
  student_record RECORD;
  calc_result RECORD;
BEGIN
  FOR student_record IN
    SELECT id FROM profiles WHERE role = 'student'
  LOOP
    -- Вызываем функцию расчета
    SELECT * INTO calc_result
    FROM calculate_proficiency_score(student_record.id) AS calc;

    -- Обновляем профиль
    UPDATE profiles
    SET
      proficiency_level = calc_result.level,
      proficiency_score = calc_result.score,
      proficiency_last_assessed = now()
    WHERE id = student_record.id;

    -- Логируем в историю
    INSERT INTO proficiency_history (
      student_id,
      old_level,
      new_level,
      old_score,
      new_score,
      change_reason,
      changed_at
    ) VALUES (
      student_record.id,
      'beginner',
      calc_result.level,
      0,
      calc_result.score,
      'automatic',
      now()
    );
  END LOOP;
END $$;

-- Проверка результатов
SELECT
  proficiency_level,
  COUNT(*) as student_count,
  ROUND(AVG(proficiency_score), 1) as avg_score
FROM profiles
WHERE role = 'student' AND proficiency_level IS NOT NULL
GROUP BY proficiency_level
ORDER BY
  CASE proficiency_level
    WHEN 'advanced' THEN 3
    WHEN 'intermediate' THEN 2
    WHEN 'beginner' THEN 1
  END DESC;
```

---

## 4. План тестирования

### Тест 1: Автоматический расчет proficiency ✅

**Цель:** Проверить, что proficiency обновляется после отправки кода

**Шаги:**
1. Войдите как студент
2. Выберите любой уровень
3. Решите задачу и отправьте код
4. Проверьте в базе:

```sql
-- Проверьте обновление proficiency
SELECT
  id,
  first_name,
  last_name,
  proficiency_level,
  proficiency_score,
  proficiency_last_assessed
FROM profiles
WHERE id = 'YOUR_STUDENT_ID';

-- Проверьте историю
SELECT
  old_level,
  new_level,
  old_score,
  new_score,
  change_reason,
  changed_at
FROM proficiency_history
WHERE student_id = 'YOUR_STUDENT_ID'
ORDER BY changed_at DESC
LIMIT 5;
```

**Ожидаемый результат:**
- ✅ proficiency_score изменился
- ✅ proficiency_level может измениться (если score пересек границу)
- ✅ proficiency_last_assessed обновился
- ✅ Запись в proficiency_history создана

### Тест 2: Отслеживание навыков ✅

**Цель:** Проверить, что навыки обновляются после решения задачи

**Предварительно:** Убедитесь, что у уровня есть target_skills

```sql
-- Установите target_skills для тестового уровня
UPDATE levels
SET target_skills = '["loops", "variables"]'::jsonb
WHERE id = 'YOUR_LEVEL_ID';
```

**Шаги:**
1. Войдите как студент
2. Решите уровень с target_skills
3. Проверьте в базе:

```sql
-- Проверьте обновление навыков
SELECT
  sc.name as skill_name,
  usp.proficiency,
  usp.mistake_count,
  usp.practice_count,
  usp.last_practiced_at
FROM user_skill_profile usp
JOIN skill_categories sc ON sc.id = usp.skill_category_id
WHERE usp.user_id = 'YOUR_STUDENT_ID'
ORDER BY usp.last_practiced_at DESC;

-- Проверьте слабые места
SELECT * FROM get_student_weak_areas('YOUR_STUDENT_ID', 5);
```

**Ожидаемый результат:**
- ✅ Записи в user_skill_profile созданы для каждого target_skill
- ✅ proficiency увеличился при успешном решении
- ✅ mistake_count увеличился при ошибке
- ✅ practice_count увеличился
- ✅ last_practiced_at обновился

### Тест 3: Адаптивные AI подсказки ✅

**Цель:** Проверить, что AI дает разные подсказки для разных уровней

**Шаги:**
1. Создайте 3 тестовых студента с разными proficiency_level:
   - Студент A: beginner (score 20)
   - Студент B: intermediate (score 55)
   - Студент C: advanced (score 85)

```sql
-- Установите вручную для теста
UPDATE profiles SET proficiency_level = 'beginner', proficiency_score = 20 WHERE id = 'STUDENT_A_ID';
UPDATE profiles SET proficiency_level = 'intermediate', proficiency_score = 55 WHERE id = 'STUDENT_B_ID';
UPDATE profiles SET proficiency_level = 'advanced', proficiency_score = 85 WHERE id = 'STUDENT_C_ID';
```

2. Войдите как каждый студент
3. Отправьте **одинаковый неправильный код** для одной и той же задачи
4. Сравните полученные AI подсказки

**Ожидаемый результат:**
- ✅ Beginner получил конкретные подсказки с номерами строк
- ✅ Intermediate получил концептуальные объяснения
- ✅ Advanced получил архитектурные рекомендации
- ✅ Все оценки correctness одинаковые (consistency)

### Тест 4: Teacher Dashboard - Proficiency ✅

**Цель:** Проверить Teacher Dashboard

**Шаги:**
1. Войдите как преподаватель
2. Перейдите на `/teacher/students`
3. Проверьте:
   - ✅ В таблице отображается колонка "Уровень владения"
   - ✅ Видны цветные бейджи (beginner/intermediate/advanced)
   - ✅ Отображаются scores (X/100)

4. Кликните "Подробнее" на любом студенте
5. Прокрутите до секции "Уровень владения"
6. Проверьте:
   - ✅ Текущий уровень и оценка отображаются
   - ✅ Дата последней оценки показана
   - ✅ Слабые места отображены (если есть)
   - ✅ Все навыки показаны с прогресс-барами

7. Кликните "История"
   - ✅ История изменений proficiency загружается

8. Кликните "Установить вручную"
   - ✅ Открывается модальное окно
   - ✅ Можно выбрать уровень и score
   - ✅ Можно добавить примечание
   - ✅ После сохранения данные обновляются

9. Кликните "Пересчитать"
   - ✅ Proficiency пересчитывается автоматически
   - ✅ Данные обновляются на странице

### Тест 5: Входное тестирование - Студент ✅

**Цель:** Проверить прохождение входного теста студентом

**Шаги:**
1. Создайте нового студента (или сбросьте proficiency существующего):

```sql
-- Сбросить proficiency для теста
UPDATE profiles
SET proficiency_level = NULL,
    proficiency_score = NULL
WHERE id = 'TEST_STUDENT_ID';

-- Удалить попытки входного теста (если были)
DELETE FROM entrance_test_attempts WHERE student_id = 'TEST_STUDENT_ID';
```

2. Войдите как этот студент
3. Перейдите на `/student/levels`
4. Проверьте:
   - ✅ Промпт "Пройдите входное тестирование" отображается
   - ✅ Показана информация о тесте

5. Кликните "Пройти тест"
6. Проверьте экран приветствия:
   - ✅ Название теста
   - ✅ Описание
   - ✅ Количество вопросов (12)
   - ✅ Время (30 минут)
   - ✅ Проходной балл (60%)

7. Кликните "Начать тест"
8. Проходите тест:
   - ✅ Таймер работает
   - ✅ Прогресс-бар обновляется
   - ✅ Можно выбирать ответы
   - ✅ Кнопка "Далее" работает
   - ✅ Кнопка "Назад" работает
   - ✅ Показывается "Отвечено: X / 12"

9. На последнем вопросе кликните "Завершить тест"
10. Проверьте экран завершения:
    - ✅ "Тест завершен!"
    - ✅ Время прохождения показано
    - ✅ Количество ответов показано

11. Проверьте в базе:

```sql
-- Проверьте попытку
SELECT
  status,
  score,
  total_points_earned,
  total_points_possible,
  proficiency_level_assigned,
  proficiency_score_assigned,
  time_spent_seconds
FROM entrance_test_attempts
WHERE student_id = 'TEST_STUDENT_ID'
ORDER BY started_at DESC
LIMIT 1;

-- Проверьте обновление профиля
SELECT
  proficiency_level,
  proficiency_score,
  proficiency_last_assessed
FROM profiles
WHERE id = 'TEST_STUDENT_ID';

-- Проверьте историю
SELECT
  change_reason,
  new_level,
  new_score
FROM proficiency_history
WHERE student_id = 'TEST_STUDENT_ID'
ORDER BY changed_at DESC
LIMIT 1;
```

**Ожидаемый результат:**
- ✅ attempt.status = 'completed'
- ✅ score рассчитан (0-100)
- ✅ proficiency_level_assigned установлен
- ✅ profiles.proficiency_level обновлен
- ✅ proficiency_history создана с change_reason = 'entrance_test'

### Тест 6: Входное тестирование - Преподаватель ✅

**Цель:** Проверить управление тестами преподавателем

**Шаги:**
1. Войдите как преподаватель
2. Кликните "Входные тесты" в навигации
3. Проверьте главную страницу:
   - ✅ Список тестов отображается
   - ✅ Статистика видна
   - ✅ Кнопка "Создать новый тест"

4. Кликните "Создать новый тест"
5. Заполните форму:
   - Название: "Тестовый JavaScript тест"
   - Описание: "Для тестирования системы"
   - Язык: JavaScript
   - Проходной балл: 70
   - Время: 20
6. Кликните "Создать тест"
7. Проверьте:
   - ✅ Переход на страницу редактора
   - ✅ Информация о тесте отображается

8. Кликните "Добавить вопрос"
9. Заполните форму вопроса:
   - Тип: Множественный выбор
   - Текст: "Что такое closure в JavaScript?"
   - Сложность: Intermediate
   - Баллы: 2
   - Категория: functions
   - Варианты: ["Функция внутри функции", "Класс", "Объект", "Массив"]
   - Правильный ответ: "Функция внутри функции"
10. Кликните "Добавить вопрос"
11. Проверьте:
    - ✅ Вопрос добавлен в список
    - ✅ Все данные отображаются корректно

12. Добавьте еще несколько вопросов (минимум 3)

13. Перейдите обратно на `/teacher/entrance-tests`
14. Найдите созданный тест
15. Кликните "Активировать"
16. Проверьте:
    - ✅ Бейдж изменился на "Активен"

17. Кликните "Результаты"
18. Проверьте:
    - ✅ Статистика отображается
    - ✅ Таблица результатов студентов видна

### Тест 7: Интеграция - End-to-End ✅

**Цель:** Проверить полный цикл работы системы

**Сценарий:**
1. Новый студент регистрируется
2. Проходит входное тестирование
3. Получает начальный уровень (beginner/intermediate/advanced)
4. Решает несколько задач
5. Навыки обновляются автоматически
6. Proficiency пересчитывается
7. AI подсказки адаптируются
8. Преподаватель видит прогресс
9. Преподаватель может вручную скорректировать уровень

**Проверочный SQL:**

```sql
-- Полная картина студента
SELECT
  p.id,
  p.first_name,
  p.last_name,
  p.proficiency_level,
  p.proficiency_score,
  p.proficiency_last_assessed,
  p.proficiency_manual_override,
  (SELECT COUNT(*) FROM proficiency_history WHERE student_id = p.id) as history_count,
  (SELECT COUNT(*) FROM user_skill_profile WHERE user_id = p.id) as skills_count,
  (SELECT COUNT(*) FROM entrance_test_attempts WHERE student_id = p.id AND status = 'completed') as tests_completed,
  (SELECT COUNT(*) FROM submissions WHERE user_id = p.id) as total_submissions,
  (SELECT COUNT(*) FROM submissions WHERE user_id = p.id AND status = 'passed') as passed_submissions
FROM profiles p
WHERE p.role = 'student' AND p.id = 'YOUR_STUDENT_ID';
```

---

## 5. Устранение проблем

### Проблема: Миграция не применяется

**Решение:**
```sql
-- Проверьте ошибки
SELECT * FROM _supabase_migrations ORDER BY version DESC LIMIT 5;

-- Проверьте логи
-- В Supabase Dashboard: Database → Logs
```

### Проблема: Proficiency не обновляется

**Решение:**
```sql
-- Проверьте триггер
SELECT * FROM pg_trigger WHERE tgname = 'after_submission_update_proficiency';

-- Вручную пересчитайте
SELECT * FROM calculate_proficiency_score('STUDENT_ID');

-- Проверьте proficiency_manual_override
SELECT proficiency_manual_override FROM profiles WHERE id = 'STUDENT_ID';
-- Если true, автоматический пересчет отключен
```

### Проблема: Навыки не обновляются

**Решение:**
```sql
-- Проверьте target_skills у уровня
SELECT id, title, target_skills FROM levels WHERE id = 'LEVEL_ID';

-- Если NULL или пустой массив, добавьте:
UPDATE levels
SET target_skills = '["loops", "variables"]'::jsonb
WHERE id = 'LEVEL_ID';

-- Проверьте триггер
SELECT * FROM pg_trigger WHERE tgname = 'after_submission_complete_analyze_skills';
```

### Проблема: Входной тест не показывается

**Решение:**
```sql
-- Проверьте, есть ли активные тесты
SELECT * FROM entrance_tests WHERE is_active = true;

-- Проверьте, не проходил ли студент уже
SELECT * FROM entrance_test_attempts
WHERE student_id = 'STUDENT_ID' AND status = 'completed';

-- Очистите localStorage (в браузере)
-- Откройте DevTools → Application → Local Storage → Удалите entrance_test_dismiss_count
```

### Проблема: AI подсказки не адаптируются

**Решение:**
```sql
-- Проверьте, загружается ли proficiency в SolveLevelPage
-- Откройте DevTools → Console → Найдите логи "Loading student profile"

-- Проверьте weak_areas
SELECT * FROM get_student_weak_areas('STUDENT_ID', 3);

-- Проверьте, что профиль передается в AI
-- В aiFeedbackApi.ts должен быть console.log с student_profile
```

---

## ✅ Чеклист после тестирования

- [ ] Все миграции применены успешно
- [ ] Proficiency автоматически обновляется после submissions
- [ ] Навыки отслеживаются корректно
- [ ] Weak areas определяются правильно
- [ ] AI дает разные подсказки для разных уровней
- [ ] Teacher Dashboard показывает все данные
- [ ] Ручное управление proficiency работает
- [ ] Входное тестирование работает для студентов
- [ ] Управление тестами работает для преподавателей
- [ ] История proficiency ведется корректно
- [ ] RLS политики работают (студент не видит чужие данные)

---

## 📊 Финальная проверка

После всех тестов выполните финальную проверку:

```sql
-- ============================================
-- ФИНАЛЬНАЯ ПРОВЕРКА СИСТЕМЫ
-- ============================================

-- 1. Статистика студентов
SELECT
  proficiency_level,
  COUNT(*) as count,
  ROUND(AVG(proficiency_score), 1) as avg_score,
  MIN(proficiency_score) as min_score,
  MAX(proficiency_score) as max_score
FROM profiles
WHERE role = 'student' AND proficiency_level IS NOT NULL
GROUP BY proficiency_level;

-- 2. Статистика навыков
SELECT
  sc.name as skill,
  COUNT(DISTINCT usp.user_id) as students_practicing,
  ROUND(AVG(usp.proficiency), 1) as avg_proficiency,
  SUM(usp.practice_count) as total_practice
FROM user_skill_profile usp
JOIN skill_categories sc ON sc.id = usp.skill_category_id
GROUP BY sc.name
ORDER BY students_practicing DESC;

-- 3. Статистика входных тестов
SELECT
  et.title,
  COUNT(DISTINCT eta.student_id) as students_tested,
  ROUND(AVG(eta.score), 1) as avg_score,
  COUNT(CASE WHEN eta.proficiency_level_assigned = 'beginner' THEN 1 END) as beginners,
  COUNT(CASE WHEN eta.proficiency_level_assigned = 'intermediate' THEN 1 END) as intermediates,
  COUNT(CASE WHEN eta.proficiency_level_assigned = 'advanced' THEN 1 END) as advanced
FROM entrance_tests et
LEFT JOIN entrance_test_attempts eta ON eta.test_id = et.id AND eta.status = 'completed'
GROUP BY et.id, et.title;

-- 4. Активность системы
SELECT
  'Total Students' as metric,
  COUNT(*)::TEXT as value
FROM profiles WHERE role = 'student'
UNION ALL
SELECT
  'Students with Proficiency',
  COUNT(*)::TEXT
FROM profiles WHERE role = 'student' AND proficiency_level IS NOT NULL
UNION ALL
SELECT
  'Total Proficiency Changes',
  COUNT(*)::TEXT
FROM proficiency_history
UNION ALL
SELECT
  'Total Skill Records',
  COUNT(*)::TEXT
FROM user_skill_profile
UNION ALL
SELECT
  'Entrance Tests Completed',
  COUNT(*)::TEXT
FROM entrance_test_attempts WHERE status = 'completed';
```

---

## 🎉 Поздравляем!

Если все тесты прошли успешно, ваша адаптивная система обучения полностью функциональна!

Система теперь:
- ✅ Автоматически определяет уровень студентов
- ✅ Отслеживает навыки по 12 категориям
- ✅ Дает адаптивные AI подсказки
- ✅ Предоставляет полную аналитику преподавателям
- ✅ Поддерживает входное тестирование
- ✅ Имеет полный CRUD для управления тестами

**Следующие шаги:**
1. Персонализированные рекомендации
2. Адаптивный выбор заданий
3. Gamification элементы
