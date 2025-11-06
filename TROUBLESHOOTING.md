# Проверка и исправление проблем с Sarpedon

## Проблема 1: Edge Function generate-level возвращает 500

### Причина
Edge Function не развернута или GROQ_API_KEY не настроен.

### Решение

1. **Проверьте что Edge Function развернута:**
```bash
supabase functions list
```

2. **Если не развернута, разверните:**
```bash
./scripts/deploy-generate-level.sh
```

3. **Проверьте логи Edge Function:**
```bash
supabase functions logs generate-level --follow
```

4. **Убедитесь что GROQ_API_KEY настроен:**
- Откройте Supabase Dashboard
- Project Settings → Edge Functions → Secrets
- Должен быть секрет: `GROQ_API_KEY`
- Если нет - добавьте его

---

## Проблема 2: Статистика не работает (400 errors)

### Причина
RLS политики для таблицы `submissions` проверяли роль через JWT user_metadata,
но роль хранится в таблице `profiles`.

### Решение

Создана миграция `20251107000000_fix_submissions_rls.sql` которая исправляет RLS политики.

**Примените миграцию:**
```bash
supabase db push
```

### Что было исправлено

**Старые политики (неправильно):**
```sql
CREATE POLICY "Teachers can view all submissions"
  ON public.submissions
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'editor')
  );
```

**Новые политики (правильно):**
```sql
CREATE POLICY "Teachers can view all submissions"
  ON public.submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );
```

---

## Быстрое решение

Запустите эти команды по порядку:

```bash
# 1. Применить миграцию для фикса RLS
supabase db push

# 2. Развернуть Edge Functions (если еще не развернуты)
./scripts/deploy-ai-feedback.sh
./scripts/deploy-generate-level.sh

# 3. Проверить что секреты настроены
# Dashboard → Settings → Edge Functions → Secrets
# Должны быть: GROQ_API_KEY
```

---

## Проверка что все работает

### Тест 1: Статистика
1. Войдите как учитель
2. Откройте Dashboard → Statistics
3. Должна отобразиться статистика

### Тест 2: AI Генератор
1. Войдите как учитель
2. Откройте Levels → Manage Levels
3. Нажмите "🤖 AI Генератор"
4. Введите тему и сгенерируйте

### Тест 3: AI Помощник для студентов
1. Войдите как студент
2. Откройте любой уровень
3. Напишите неправильный код
4. Запустите код
5. Должны появиться подсказки от AI справа

---

## Логи для отладки

### Edge Functions логи:
```bash
# AI Feedback
supabase functions logs ai-feedback --follow

# Level Generator
supabase functions logs generate-level --follow
```

### Database логи:
```bash
# Проверить что submissions существует
supabase db dump --table submissions --schema-only

# Проверить RLS политики
supabase db dump --table submissions --data-only --limit 0
```

---

## Если проблемы остаются

### Проверьте роль пользователя:
```sql
SELECT id, email, role, class FROM profiles WHERE role = 'teacher';
```

### Проверьте submissions:
```sql
SELECT COUNT(*) FROM submissions;
SELECT status, COUNT(*) FROM submissions GROUP BY status;
```

### Проверьте RLS:
```sql
-- От имени учителя должно работать
SELECT COUNT(*) FROM submissions;

-- От имени студента должен видеть только свои
SELECT * FROM submissions WHERE user_id = auth.uid();
```
