# Применение миграции для входного тестирования

## Проблема
После завершения входного теста возникает ошибка:
```
POST https://uanfulofnrhcqugmxpna.supabase.co/rest/v1/rpc/complete_entrance_test 404 (Not Found)
```

Это означает, что функция `complete_entrance_test` не найдена в базе данных.

## Решение

Миграция находится в файле `supabase/migrations/20251110000000_add_entrance_tests.sql`, но не была применена к базе данных.

### Шаги для применения миграции:

1. **Откройте Supabase Dashboard**
   - Перейдите на https://app.supabase.com
   - Выберите ваш проект

2. **Откройте SQL Editor**
   - В левом меню выберите "SQL Editor"
   - Нажмите "New query"

3. **Скопируйте и выполните SQL**
   - Откройте файл `supabase/migrations/20251110000000_add_entrance_tests.sql` в вашем проекте
   - Скопируйте весь его содержимое (440 строк)
   - Вставьте в SQL Editor
   - Нажмите "Run" (или Ctrl/Cmd + Enter)

4. **Проверьте применение**
   После выполнения должны быть созданы:
   - Таблицы: `entrance_tests`, `entrance_test_questions`, `entrance_test_attempts`, `entrance_test_answers`
   - Функции: `start_entrance_test`, `calculate_entrance_test_proficiency`, `complete_entrance_test`
   - RLS политики для всех таблиц
   - Дефолтный входной тест по Python

## Проверка

После применения миграции выполните в SQL Editor:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%entrance_test%';
```

Вы должны увидеть все три функции:
- `start_entrance_test`
- `calculate_entrance_test_proficiency`
- `complete_entrance_test`

## Альтернатива (через CLI)

Если у вас установлен Supabase CLI:
```bash
supabase db push
```

Это применит все миграции из папки `supabase/migrations/`.
