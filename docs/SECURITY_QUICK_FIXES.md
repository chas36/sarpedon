# ⚡ Быстрые исправления критических уязвимостей

**🚨 СРОЧНО: Применить ДО вывода в продакшен!**

---

## 🔥 Критическое исправление #1: Edge Functions Authorization

### Файлы для изменения:
- `supabase/functions/create-student/index.ts`
- `supabase/functions/delete-student/index.ts`
- `supabase/functions/ai-feedback/index.ts`
- `supabase/functions/generate-level/index.ts`

### Добавить в КАЖДУЮ функцию ПЕРЕД основной логикой:

```typescript
// === AUTH CHECK START ===
const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Create Supabase client with user token
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: authHeader } } }
)

// Verify user
const { data: { user }, error: userError } = await supabase.auth.getUser()
if (userError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized: Invalid token' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Check teacher role (для create/delete-student)
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (!profile || !['teacher', 'editor'].includes(profile.role)) {
  return new Response(
    JSON.stringify({ error: 'Forbidden: Teacher or editor role required' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
// === AUTH CHECK END ===
```

**Примечание для ai-feedback.ts:**
- Для ai-feedback можно разрешить всем authenticated пользователям (студентам)
- Но добавить rate limiting!

---

## 🔥 Критическое исправление #2: CORS Configuration

### Все Edge Functions - заменить:

```typescript
// ❌ БЫЛО:
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ СТАЛО:
const allowedOrigins = [
  'https://sarpedon.app',
  'https://www.sarpedon.app',
  // Для development (УДАЛИТЬ В ПРОДАКШЕНЕ):
  'http://localhost:5173',
  'http://localhost:3000',
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Использовать:
const corsHeaders = getCorsHeaders(req)
```

---

## 🔥 Критическое исправление #3: Удалить Plaintext Passwords

### SQL скрипт (применить в Supabase Dashboard → SQL Editor):

```sql
-- Удалить поле generated_password из profiles
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS generated_password;

-- Убедиться, что его нет
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'generated_password';

-- Результат должен быть пустым
```

### Обновить Edge Function create-student/index.ts:

```typescript
// УДАЛИТЬ строку:
generated_password: password || login,  // ❌ УДАЛИТЬ ЭТО!

// НЕ сохранять пароль в profiles вообще!
```

### Система экспорта credentials:

```typescript
// В frontend - показать credentials ОДИН РАЗ после создания:
interface CreatedStudent {
  login: string
  password: string  // Только в ответе API, НЕ в БД!
  firstName: string
  lastName: string
}

// Учитель может:
// 1. Скопировать в буфер обмена
// 2. Скачать CSV (один раз!)
// 3. После этого - только сброс пароля
```

---

## 🔥 Критическое исправление #4: Применить SQL скрипты

### 1. Fix RLS Circular Dependencies

```bash
# В Supabase Dashboard → SQL Editor:
# Скопировать и выполнить содержимое:
sql-scripts/fix_rls_circular_dependency_v2.sql
```

### 2. Fix Lesson Sessions RLS

```bash
# В Supabase Dashboard → SQL Editor:
# Скопировать и выполнить содержимое:
sql-scripts/fix_lesson_sessions_rls.sql
```

### 3. Проверка после применения:

```sql
-- Проверить, что политики созданы
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'lesson_sessions', 'lesson_grades')
ORDER BY tablename, policyname;

-- Должно быть:
-- profiles: ~5 политик
-- lesson_sessions: ~5 политик
-- lesson_grades: ~5 политик
```

---

## 🔥 Критическое исправление #5: Удалить GROQ API Key из Frontend

### Файлы для изменения:

**1. `.env.example`:**
```bash
# ❌ УДАЛИТЬ эту строку:
VITE_GROQ_API_KEY=your_groq_api_key

# ✅ Оставить только:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_URL=http://localhost:5173
```

**2. `src/vite-env.d.ts`:**
```typescript
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  // ❌ УДАЛИТЬ эту строку:
  // readonly VITE_GROQ_API_KEY: string
}
```

**3. Проверить .env файл:**
```bash
# Убедиться что VITE_GROQ_API_KEY нигде не используется:
grep -r "VITE_GROQ_API_KEY" src/
# Результат должен быть пустым!
```

---

## 📝 Чек-лист применения исправлений

```markdown
### Edge Functions
- [ ] Добавить авторизацию в create-student/index.ts
- [ ] Добавить авторизацию в delete-student/index.ts
- [ ] Добавить авторизацию в ai-feedback/index.ts
- [ ] Добавить авторизацию в generate-level/index.ts
- [ ] Исправить CORS во всех функциях
- [ ] Удалить generated_password из create-student
- [ ] Задеплоить функции: `supabase functions deploy <name>`

### SQL Скрипты
- [ ] Применить fix_rls_circular_dependency_v2.sql
- [ ] Применить fix_lesson_sessions_rls.sql
- [ ] Удалить поле generated_password из profiles
- [ ] Проверить политики (SELECT FROM pg_policies)
- [ ] Перезагрузить PostgREST: `NOTIFY pgrst, 'reload schema'`

### Frontend
- [ ] Удалить VITE_GROQ_API_KEY из .env.example
- [ ] Удалить VITE_GROQ_API_KEY из vite-env.d.ts
- [ ] Проверить что ключ не используется в src/
- [ ] Пересобрать: `npm run build`

### Тестирование
- [ ] Попробовать создать студента (должно работать)
- [ ] Попробовать создать студента БЕЗ токена (должно быть 401)
- [ ] Попробовать создать урок (должно работать)
- [ ] Проверить вход в систему (должно работать)
- [ ] Проверить что CORS блокирует сторонние домены
```

---

## ⏱️ Время применения

**Общее время: ~2-3 часа**

- Edge Functions (4 файла): ~60 минут
- SQL скрипты: ~15 минут
- Frontend cleanup: ~10 минут
- Testing: ~30 минут
- Деплой: ~15 минут

---

## 🚀 Порядок применения

1. **SQL скрипты FIRST** (может сломать систему до перезапуска)
2. **Edge Functions** (деплой занимает время)
3. **Frontend cleanup**
4. **Полное тестирование**

---

## ⚠️ Риски при применении

1. **RLS скрипты** могут временно сломать доступ → применять в нерабочее время
2. **Edge Functions** - деплой занимает 2-5 минут → краткий downtime
3. **Удаление generated_password** - необратимо! → сделать backup БД

---

## 🆘 Откат изменений

### Если что-то сломалось:

**Edge Functions:**
```bash
# Откат к предыдущей версии:
supabase functions deploy <name> --legacy-bundle
```

**SQL:**
```sql
-- Откат миграций (если есть down() функции)
-- Или восстановить из backup
```

**Frontend:**
```bash
git revert HEAD
npm run build
```

---

## 📞 После применения

1. ✅ Проверить все критические flow:
   - Создание студента
   - Создание урока
   - Вход в систему
   - AI feedback

2. ✅ Мониторинг логов:
   - Supabase Dashboard → Logs
   - Edge Functions logs
   - Browser console errors

3. ✅ Создать issue в GitHub:
   - "Security fixes applied - verification needed"
   - Прикрепить чек-лист

---

**ВАЖНО: Эти исправления КРИТИЧНЫ для безопасности!**

Не откладывайте применение до вывода в продакшен.
