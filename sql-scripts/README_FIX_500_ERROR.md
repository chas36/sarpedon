# 🚨 ИСПРАВЛЕНИЕ 500 ОШИБКИ И ПРОБЛЕМ С АВТОРИЗАЦИЕЙ

## Проблема
После выполнения `fix_profiles_rls_for_lesson_monitor.sql` возникла **циклическая зависимость** в RLS политиках:
- Политика на `profiles` проверяла роль через `EXISTS` запрос к `profiles`
- Это создавало бесконечную рекурсию → 500 ошибка → невозможность войти

## Решение

### Шаг 1: Выполнить исправление (ОБЯЗАТЕЛЬНО!)

Откройте Supabase SQL Editor и выполните:

```bash
sql-scripts/fix_rls_circular_dependency.sql
```

**Что делает этот скрипт:**
1. ✅ Создает функцию `check_user_role()` с `SECURITY DEFINER` (обходит RLS)
2. ✅ Удаляет проблемную политику "Teachers can view all profiles"
3. ✅ Создает простые политики на `profiles` БЕЗ рекурсии
4. ✅ Обновляет политики на `lesson_sessions` для использования безопасной функции

### Шаг 2: Проверить результат

Выполните проверку:

```bash
sql-scripts/verify_rls_fix.sql
```

**Ожидаемый результат:**
```
✅ ВСЕ ИСПРАВЛЕНО! Циклическая зависимость устранена!
```

### Шаг 3: Войти в систему

1. Закройте все вкладки с приложением
2. Откройте новую вкладку в режиме инкогнито
3. Войдите в систему
4. Попробуйте создать урок в "Мониторинг урока"

---

## Техническая информация

### Что было не так?

**ПЛОХО (циклическая зависимость):**
```sql
-- Политика на profiles запрашивает profiles → бесконечная рекурсия!
CREATE POLICY "Teachers can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p  -- ← ЭТО ПРОБЛЕМА!
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'editor')
    )
  );
```

**ХОРОШО (используется SECURITY DEFINER функция):**
```sql
-- Функция выполняется с правами владельца, обходя RLS
CREATE FUNCTION check_user_role(user_id UUID, required_roles TEXT[])
RETURNS BOOLEAN
SECURITY DEFINER  -- ← Обходит RLS!
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = ANY(required_roles)
  );
END;
$$;

-- Политика использует функцию вместо прямого EXISTS
CREATE POLICY "Teachers can manage own lessons"
  ON public.lesson_sessions
  USING (
    public.check_user_role(auth.uid(), ARRAY['teacher'])  -- ← Безопасно!
  );
```

### Преимущества нового подхода

1. **Нет циклической зависимости** - функция обходит RLS при проверке роли
2. **Производительность** - функция выполняется быстрее, чем вложенные EXISTS
3. **Переиспользование** - одна функция для всех проверок ролей
4. **Безопасность** - функция выполняется с правами владельца, но только для чтения роли

---

## Если что-то пошло не так

### Ошибка "function does not exist"
Убедитесь, что вы выполнили `fix_rls_circular_dependency.sql`

### Все еще 500 ошибка
1. Выполните `verify_rls_fix.sql` и проверьте результаты
2. Убедитесь, что проблемная политика удалена
3. Выполните `NOTIFY pgrst, 'reload schema';`

### Все еще 403 ошибка при создании урока
1. Проверьте, что ваш профиль имеет `role = 'teacher'`
2. Выполните `sql-scripts/show_exact_rls_policies.sql`
3. Убедитесь, что функция `check_user_role()` работает корректно
