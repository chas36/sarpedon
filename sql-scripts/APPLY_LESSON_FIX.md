# Исправление RLS политик для Lesson Monitoring

## Проблема

При попытке создания урока возникает ошибка **403 Forbidden**:
```
POST https://.../rest/v1/lesson_sessions 403 (Forbidden)
```

## Причина

RLS политики проверяют `teacher_id = auth.uid()` при INSERT, но это поле ещё не установлено в момент создания записи, что вызывает отказ в доступе.

## Решение

Применить скрипт `fix_lesson_sessions_rls.sql`, который:
1. Удаляет старые проблемные политики
2. Создаёт функцию `check_user_role` (если не существует)
3. Создаёт новые раздельные политики для INSERT/SELECT/UPDATE/DELETE
4. Политика INSERT проверяет только роль, без проверки teacher_id

## Инструкция по применению

### Через Supabase Dashboard

1. Откройте **Supabase Dashboard** → ваш проект
2. Перейдите в **SQL Editor**
3. Создайте новый запрос
4. Скопируйте содержимое файла `fix_lesson_sessions_rls.sql`
5. Вставьте в редактор
6. Нажмите **Run** (или Ctrl/Cmd + Enter)

### Через командную строку (если есть доступ)

```bash
# Из папки sql-scripts
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  -f fix_lesson_sessions_rls.sql
```

## Проверка

После применения скрипта вы должны увидеть:
```
table_name                    | policy_count
------------------------------|-------------
lesson_sessions RLS policies  | 5
lesson_grades RLS policies    | 5
```

Это означает, что создано **10 новых политик** (5 для каждой таблицы):

**lesson_sessions:**
- `Teachers can insert lessons` (INSERT)
- `Teachers can view all lessons` (SELECT)
- `Teachers can update own lessons` (UPDATE)
- `Teachers can delete own lessons` (DELETE)
- `Students can view own class lessons` (SELECT)

**lesson_grades:**
- `Teachers can insert grades` (INSERT)
- `Teachers can view grades for own lessons` (SELECT)
- `Teachers can update grades for own lessons` (UPDATE)
- `Teachers can delete grades for own lessons` (DELETE)
- `Students can view own grades` (SELECT)

## Тестирование

После применения скрипта:

1. Обновите страницу в браузере (Ctrl/Cmd + R)
2. Перейдите на страницу **Мониторинг урока**
3. Попробуйте создать новый урок:
   - Выберите класс
   - Укажите тему урока
   - Нажмите "Начать урок"

Ошибка 403 должна исчезнуть, и урок должен создаться успешно! ✅

## Дополнительная диагностика

Если проблема сохраняется, выполните диагностический скрипт:

```sql
-- Проверка роли текущего пользователя
SELECT
  auth.uid() as user_id,
  p.role as profile_role,
  (auth.jwt() -> 'user_metadata' ->> 'role') as jwt_role,
  check_user_role(auth.uid(), ARRAY['teacher']) as is_teacher
FROM profiles p
WHERE p.id = auth.uid();

-- Проверка политик
SELECT
  schemaname, tablename, policyname,
  permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'lesson_sessions'
ORDER BY policyname;
```

## Откат (если нужно вернуть старые политики)

```sql
-- Удалить новые политики
DROP POLICY IF EXISTS "Teachers can insert lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can view all lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can update own lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can delete own lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Students can view own class lessons" ON public.lesson_sessions;

-- Применить заново оригинальную миграцию
-- (строки 222-254 из 20251113000000_add_lesson_sessions_and_grades.sql)
```
