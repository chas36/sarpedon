# Применение миграции системы мониторинга уроков

## Проблема

При попытке начать урок возникают ошибки:
- `403 Forbidden` на `/lesson_sessions` - таблица недоступна
- `400 Bad Request` на `/submissions` - возможно связанная проблема

Это означает, что миграция для системы мониторинга уроков еще не применена в базе данных.

## Решение

Необходимо применить миграцию `20251113000000_add_lesson_sessions_and_grades.sql`

### Метод 1: Безопасное применение (Рекомендуется)

Используйте безопасную версию миграции, которая проверяет существование объектов:

1. Откройте файл `sql-scripts/apply_lesson_monitoring_safe.sql`
2. Скопируйте **все содержимое** файла
3. Вставьте в SQL Editor в Supabase Dashboard
4. Нажмите **Run** (или Ctrl+Enter)

Этот скрипт безопасно создаст все объекты, пропуская уже существующие.

### Метод 2: Очистка и повторное применение

Если возникла ошибка "relation already exists", используйте этот метод:

**Шаг 1: Очистка существующих объектов**

1. Откройте файл `sql-scripts/cleanup_lesson_monitoring.sql`
2. Скопируйте содержимое
3. Выполните в SQL Editor
4. Вы увидите сообщение: "Cleanup completed"

**Шаг 2: Примените миграцию**

1. Откройте файл `sql-scripts/apply_lesson_monitoring_safe.sql`
2. Скопируйте содержимое
3. Выполните в SQL Editor
4. Вы увидите сообщение: "Migration applied successfully!"

### Шаг 1 (старый метод): Откройте Supabase Dashboard

1. Перейдите на https://app.supabase.com
2. Выберите ваш проект
3. Откройте **SQL Editor** (в левом меню)

### Шаг 2: Скопируйте и выполните миграцию

1. Откройте файл `supabase/migrations/20251113000000_add_lesson_sessions_and_grades.sql`
2. Скопируйте **все содержимое** файла
3. Вставьте в SQL Editor в Supabase Dashboard
4. Нажмите **Run** (или Ctrl+Enter)

### Шаг 3: Проверьте выполнение

После выполнения вы должны увидеть сообщение об успешном выполнении. Проверьте, что созданы:

**Таблицы:**
- `lesson_sessions` - для хранения занятий
- `lesson_grades` - для хранения оценок

**Функции:**
- `get_active_lesson_for_class()` - получение активного урока
- `get_lesson_activity()` - получение статистики активности
- `auto_assign_submission_to_lesson()` - автоматическая привязка submissions

Выполните в SQL Editor:
```sql
-- Проверка таблиц
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('lesson_sessions', 'lesson_grades');

-- Проверка функций
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%lesson%';
```

Должно вернуться:
- 2 таблицы: `lesson_sessions`, `lesson_grades`
- 3 функции: `get_active_lesson_for_class`, `get_lesson_activity`, `auto_assign_submission_to_lesson`

### Шаг 4: Обновите страницу приложения

После применения миграции:
1. Закройте и откройте приложение
2. Перейдите на страницу **Мониторинг урока**
3. Теперь вы сможете начать урок без ошибок

## Что даст миграция

После применения миграции вы сможете:

✅ **Начинать уроки** для конкретных классов
✅ **Отслеживать активность учеников** в реальном времени (автообновление каждые 10 секунд)
✅ **Выставлять оценки** по 5-балльной шкале с автоматическими рекомендациями
✅ **Просматривать статистику**:
   - Количество попыток (всего/успешных/неуспешных)
   - Количество решенных уровней
   - Процент успешности
   - Время последней активности

## Автоматические рекомендации оценок

Система автоматически предлагает оценку на основе активности:

- **5** - решено ≥5 уровней, успешность ≥80%
- **4** - решено ≥4 уровня, успешность ≥70%
- **3** - решено ≥3 уровня, успешность ≥50%
- **2** - решено ≥1 уровня

## Автоматическая привязка submissions

После применения миграции все новые submissions (решения учеников) будут автоматически привязываться к активному уроку их класса. Это работает через триггер `auto_assign_lesson_to_submission`.

## Проблемы и решения

### Диагностика проблем

Если после применения миграции все еще возникают ошибки, выполните диагностику:

1. Откройте файл `sql-scripts/diagnose_lesson_monitoring.sql`
2. Скопируйте содержимое
3. Выполните в SQL Editor
4. Проверьте результаты каждой секции

Скрипт покажет:
- ✅ Какие таблицы созданы
- ✅ Какие функции существуют
- ✅ Какие RLS политики настроены
- ✅ Какие права доступа выданы
- ✅ Общую статистику объектов

### Ошибка 403 Forbidden на lesson_sessions

**Причина:** Таблица существует, но RLS политики блокируют доступ

**Решение:**
1. Проверьте, что вы авторизованы как учитель (role = 'teacher')
2. Проверьте RLS политики:
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('lesson_sessions', 'lesson_grades');
   ```
3. Если политик нет или они неправильные, заново выполните:
   `sql-scripts/apply_lesson_monitoring_safe.sql`

### Ошибка 404 Not Found на get_active_lesson_for_class

**Причина:** Функция не создана ИЛИ PostgREST не перезагрузил схему

**Решение:**
1. Проверьте наличие функции:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_schema = 'public' AND routine_name = 'get_active_lesson_for_class';
   ```

2. Если функция существует, перезагрузите PostgREST:
   - Выполните `sql-scripts/reload_postgrest_schema.sql`
   - ИЛИ перейдите в Supabase Dashboard → Settings → API → **Restart API Server**

3. Если функции нет, заново выполните миграцию:
   - `sql-scripts/apply_lesson_monitoring_safe.sql`

### Ошибка "relation already exists"

- Используйте безопасную версию миграции: `apply_lesson_monitoring_safe.sql`
- Она автоматически пропускает существующие объекты

### Полная переустановка

Если ничего не помогает, выполните полную переустановку:

1. **Очистите старые объекты:**
   ```sql
   -- Выполните sql-scripts/cleanup_lesson_monitoring.sql
   ```

2. **Примените миграцию заново:**
   ```sql
   -- Выполните sql-scripts/apply_lesson_monitoring_safe.sql
   ```

3. **Перезагрузите PostgREST:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   ИЛИ через Dashboard: Settings → API → Restart API Server

4. **Обновите страницу приложения** (Ctrl+F5)
