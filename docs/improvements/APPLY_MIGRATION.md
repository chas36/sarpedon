# Как применить миграцию Proficiency Levels

## Шаг 1: Применение миграции

У вас есть 2 способа применить миграцию:

### Способ A: Через Supabase CLI (рекомендуется)

```bash
# Если у вас настроен Supabase CLI
supabase db push
```

Эта команда применит все новые миграции из папки `supabase/migrations/`.

### Способ B: Через Supabase Dashboard (ручной способ)

1. Откройте Supabase Dashboard: https://app.supabase.com/project/YOUR_PROJECT/sql
2. Перейдите в раздел **SQL Editor**
3. Откройте файл `supabase/migrations/20251108000000_add_proficiency_levels.sql`
4. Скопируйте весь его содержимое
5. Вставьте в SQL Editor
6. Нажмите **Run** (или `Ctrl+Enter`)

---

## Шаг 2: Проверка результата

После применения миграции выполните эти проверочные запросы в SQL Editor:

### 2.1 Проверить, что поля добавлены

```sql
SELECT
  proficiency_level,
  proficiency_score,
  proficiency_last_assessed,
  proficiency_manual_override
FROM profiles
WHERE role = 'student'
LIMIT 5;
```

**Ожидаемый результат:** Должны вернуться строки с заполненными значениями proficiency_level и proficiency_score.

### 2.2 Проверить распределение по уровням

```sql
SELECT
  proficiency_level,
  COUNT(*) as count,
  ROUND(AVG(proficiency_score)::NUMERIC, 1) as avg_score
FROM profiles
WHERE role = 'student'
GROUP BY proficiency_level
ORDER BY proficiency_level;
```

**Ожидаемый результат:**
```
proficiency_level | count | avg_score
------------------+-------+-----------
beginner          | 15    | 25.3
intermediate      | 8     | 55.7
advanced          | 3     | 82.1
```

### 2.3 Проверить историю изменений

```sql
SELECT
  user_id,
  old_level,
  new_level,
  new_score,
  reason,
  changed_at
FROM proficiency_history
ORDER BY changed_at DESC
LIMIT 10;
```

**Ожидаемый результат:** Записи с `reason = 'migration'` для всех студентов.

### 2.4 Проверить триггер

```sql
-- Вставим тестовую submission для проверки автоматического обновления
-- ВАЖНО: Замените user_id и level_id на реальные значения из вашей БД!

INSERT INTO submissions (user_id, level_id, code, status, quality_metrics)
VALUES (
  'ваш-реальный-user-id',  -- Замените на ID студента!
  'ваш-реальный-level-id',  -- Замените на ID уровня!
  'print("test")',
  'passed',
  '{"overall_score": 85}'::jsonb
);

-- Проверяем, что proficiency обновился
SELECT
  proficiency_level,
  proficiency_score,
  proficiency_last_assessed
FROM profiles
WHERE id = 'ваш-реальный-user-id';  -- Тот же user_id что выше

-- Проверяем, что записалось в историю
SELECT * FROM proficiency_history
WHERE user_id = 'ваш-реальный-user-id'
ORDER BY changed_at DESC
LIMIT 1;
```

**Ожидаемый результат:**
- `proficiency_last_assessed` должен обновиться до текущего времени
- В `proficiency_history` должна появиться новая запись с `reason = 'auto_calculation'`

---

## Шаг 3: Проверка View'ов

```sql
-- View с распределением по классам
SELECT * FROM class_proficiency_stats;

-- View с недавними изменениями уровней
SELECT * FROM recent_proficiency_changes;
```

---

## Шаг 4: Что дальше?

После успешного применения миграции:

✅ **Phase 1 - База данных: ЗАВЕРШЕНА**

Следующий шаг - **Phase 2: Edge Functions**

Нужно будет:
1. Создать или обновить Edge Function `validate-and-analyze-code`
2. Интегрировать шаблоны промптов из `docs/improvements/ai-prompt-templates.ts`
3. Передавать контекст студента (proficiency_level, weak_areas) в AI промпты

---

## Troubleshooting

### Ошибка: "column does not exist"

**Проблема:** Миграция не применилась полностью.

**Решение:**
1. Проверьте логи миграции на наличие ошибок
2. Убедитесь, что вы выполнили **весь** SQL файл целиком
3. Попробуйте выполнить миграцию повторно (она безопасна для повторного применения благодаря `IF NOT EXISTS`)

### Ошибка: "trigger already exists"

**Проблема:** Миграция уже была применена ранее.

**Решение:** Это нормально. Миграция содержит `DROP TRIGGER IF EXISTS`, поэтому безопасна для повторного запуска.

### Ошибка: "permission denied"

**Проблема:** Недостаточно прав для создания функций/триггеров.

**Решение:**
1. Убедитесь, что выполняете миграцию как владелец БД
2. В Supabase Dashboard используйте SQL Editor с правами `postgres` роли

### Все студенты получили level = 'beginner'

**Это нормально**, если:
- У них мало выполненных заданий (< 30%)
- Низкое среднее качество кода (< 60)
- Много failed submissions

Со временем, когда студенты будут решать задачи, их уровень будет автоматически повышаться.

---

## Откат миграции (если нужно)

Если по какой-то причине нужно откатить изменения:

```sql
-- ВНИМАНИЕ: Это удалит все данные proficiency!

-- Удалить триггер
DROP TRIGGER IF EXISTS trigger_update_proficiency ON public.submissions;

-- Удалить функции
DROP FUNCTION IF EXISTS update_student_proficiency();
DROP FUNCTION IF EXISTS calculate_proficiency_score(UUID);
DROP FUNCTION IF EXISTS set_student_proficiency_manual(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS enable_auto_proficiency(UUID);

-- Удалить views
DROP VIEW IF EXISTS recent_proficiency_changes;
DROP VIEW IF EXISTS class_proficiency_stats;

-- Удалить таблицу истории
DROP TABLE IF EXISTS public.proficiency_history;

-- Удалить поля из profiles
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS proficiency_level,
DROP COLUMN IF EXISTS proficiency_score,
DROP COLUMN IF EXISTS proficiency_last_assessed,
DROP COLUMN IF EXISTS proficiency_manual_override;
```

---

**Дата создания:** 2025-11-08
**Версия:** 1.0
**Автор:** AI Prompts Improvement Initiative
