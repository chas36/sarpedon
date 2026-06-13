# 🔒 Отчёт по аудиту безопасности Sarpedon

**Дата аудита:** 17 ноября 2025
**Версия платформы:** 0.75 (70-75% реализовано)
**Аудитор:** Claude (Anthropic)
**Уровень проверки:** Comprehensive

---

## 📊 Executive Summary

Проведён комплексный аудит безопасности образовательной платформы Sarpedon. **Обнаружено 12 уязвимостей**, из которых **7 критических**.

### Критичность уязвимостей

| Уровень | Количество | Статус |
|---------|-----------|--------|
| 🔴 **CRITICAL** | 7 | Требуют немедленного исправления |
| 🟠 **HIGH** | 3 | Исправить в течение недели |
| 🟡 **MEDIUM** | 2 | Исправить в течение месяца |
| 🟢 **LOW** | 0 | - |

### Общая оценка безопасности

**Текущий уровень: 3/10 (Критический)**

⚠️ **ПЛАТФОРМУ НЕ РЕКОМЕНДУЕТСЯ ИСПОЛЬЗОВАТЬ В ПРОДАКШЕНЕ** до устранения критических уязвимостей.

---

## 🚨 КРИТИЧЕСКИЕ УЯЗВИМОСТИ

### CRITICAL-001: Отсутствие авторизации в Edge Functions

**Затронутые файлы:**
- `supabase/functions/create-student/index.ts`
- `supabase/functions/delete-student/index.ts`
- `supabase/functions/ai-feedback/index.ts`
- `supabase/functions/generate-level/index.ts`

**Описание:**
Ни одна из Edge Functions не проверяет JWT токен и роль пользователя. **Любой может:**
- Создавать/удалять студентов
- Использовать ваш Groq API ключ без ограничений
- Генерировать уровни неограниченно
- Истратить всю квоту API

**Proof of Concept:**
```bash
# Любой может создать студента без авторизации
curl -X POST https://your-project.supabase.co/functions/v1/create-student \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Hack","lastName":"Er","className":"11A","login":"hacker1"}'

# Любой может удалить любого студента
curl -X POST https://your-project.supabase.co/functions/v1/delete-student \
  -H "Content-Type: application/json" \
  -d '{"studentId":"any-user-id"}'
```

**Воздействие:** 🔴 **CRITICAL**
- Data breach (утечка данных)
- Unauthorized data modification
- DoS attack (истощение API квоты)
- Полная компрометация системы

**Рекомендация по исправлению:**
```typescript
// Добавить в каждую Edge Function:
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Создать клиент с пользовательским токеном
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: authHeader } } }
)

// Получить пользователя
const { data: { user }, error: userError } = await supabase.auth.getUser()
if (userError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Проверить роль
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (!profile || profile.role !== 'teacher') {
  return new Response(JSON.stringify({ error: 'Forbidden: Teacher role required' }), {
    status: 403,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

---

### CRITICAL-002: Circular RLS Dependencies

**Затронутые файлы:**
- `supabase/migrations/002_row_level_security.sql` (строки 32-39, 64-68, 74-78, 84-88, 108-112, etc.)

**Описание:**
Множество RLS политик используют паттерн `EXISTS (SELECT FROM profiles WHERE ...)` для проверки ролей, что создаёт циклические зависимости. Особенно критично для таблицы `profiles`, где политики запрашивают саму же таблицу.

**Проблемный код:**
```sql
-- ❌ НЕПРАВИЛЬНО: Circular dependency
CREATE POLICY "Teachers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles  -- Запрашивает profiles из политики profiles!
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );
```

**Воздействие:** 🔴 **CRITICAL**
- Infinite recursion → 500 Internal Server Error
- Невозможность входа в систему
- Полный отказ в обслуживании

**Статус:** ⚠️ **Частично исправлено**
- Миграция `20251112000002_fix_circular_rls.sql` пыталась исправить
- Скрипт `sql-scripts/fix_rls_circular_dependency_v2.sql` содержит правильное исправление
- **НО**: Неизвестно, применён ли скрипт в продакшене!

**Рекомендация:**
1. Немедленно применить `fix_rls_circular_dependency_v2.sql`
2. Использовать SECURITY DEFINER функции для всех cross-table checks
3. Избегать EXISTS subqueries на ту же таблицу

---

### CRITICAL-003: Plaintext Password Storage

**Затронутые файлы:**
- `supabase/functions/create-student/index.ts` (строка 65)
- Возможно таблица `profiles` (поле `generated_password`)

**Описание:**
Пароли студентов хранятся в открытом виде в таблице `profiles`:

```typescript
// ❌ КРИТИЧЕСКАЯ УЯЗВИМОСТЬ
.insert({
  // ...
  generated_password: password || login,  // Plaintext password!
  // ...
})
```

**Воздействие:** 🔴 **CRITICAL**
- Если злоумышленник получит доступ к БД → все пароли скомпрометированы
- Нарушение GDPR/ФЗ-152 о персональных данных
- Невозможность compliance с security standards

**Рекомендация:**
1. **НЕМЕДЛЕННО удалить поле `generated_password` из таблицы**
2. Хэшировать пароли перед сохранением (bcrypt/argon2)
3. Для экспорта credentials использовать временную session-based систему
4. Пароль должен быть показан учителю ОДИН РАЗ при создании, затем только сброс

---

### CRITICAL-004: CORS Misconfiguration

**Затронутые файлы:**
- Все Edge Functions

**Описание:**
Все Edge Functions используют `Access-Control-Allow-Origin: '*'`, что разрешает запросы с **ЛЮБОГО** источника.

```typescript
// ❌ НЕПРАВИЛЬНО
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Разрешено всем!
}
```

**Воздействие:** 🔴 **CRITICAL**
- CSRF attacks
- Кто угодно может вызывать ваши API endpoints
- Истощение API квоты через сторонние сайты
- Возможна атака через XSS на другом сайте

**Рекомендация:**
```typescript
// ✅ ПРАВИЛЬНО
const allowedOrigins = [
  'https://sarpedon.app',
  'https://www.sarpedon.app',
  'http://localhost:5173',  // Только для dev
]

const origin = req.headers.get('origin')
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

---

### CRITICAL-005: RLS Policies for lesson_sessions (403 на INSERT)

**Затронутые файлы:**
- `supabase/migrations/20251113000000_add_lesson_sessions_and_grades.sql` (строки 223-233)

**Описание:**
Политика проверяет `teacher_id = auth.uid()` при INSERT, но это поле ещё не установлено.

```sql
-- ❌ НЕПРАВИЛЬНО
CREATE POLICY "Teachers can manage own lessons"
  ON public.lesson_sessions
  FOR ALL
  USING (
    auth.uid() = teacher_id AND  -- teacher_id ещё NULL при INSERT!
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher'
  )
```

**Воздействие:** 🔴 **CRITICAL**
- Невозможность создания уроков
- 403 Forbidden на создание урока
- Основная функциональность lesson monitoring сломана

**Статус:** ✅ **Исправлено в commit 63fba79**
- Создан скрипт `sql-scripts/fix_lesson_sessions_rls.sql`
- **НО**: Неизвестно, применён ли в продакшене!

**Рекомендация:**
Применить `fix_lesson_sessions_rls.sql` в Supabase Dashboard → SQL Editor

---

### CRITICAL-006: No Rate Limiting

**Затронутые компоненты:**
- Все Edge Functions
- API endpoints

**Описание:**
Отсутствует любое ограничение частоты запросов. Злоумышленник может:
- Спамить создание/удаление студентов
- Истощить квоту Groq API
- DDoS атака на ваши Edge Functions
- Брутфорс паролей при входе

**Воздействие:** 🔴 **CRITICAL**
- DoS/DDoS attacks
- Финансовые потери (истощение API квот)
- Service downtime

**Рекомендация:**
```typescript
// Использовать Upstash Redis для rate limiting
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),  // 10 requests per 10 seconds
})

const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
const { success, limit, remaining } = await ratelimit.limit(ip)

if (!success) {
  return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
    status: 429,
    headers: {
      ...corsHeaders,
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
    }
  })
}
```

---

### CRITICAL-007: Groq API Key in Frontend Environment

**Затронутые файлы:**
- `.env.example` (строка 4)
- `src/vite-env.d.ts` (строка 7)

**Описание:**
В .env.example определена переменная `VITE_GROQ_API_KEY`. Все переменные с префиксом `VITE_` встраиваются в клиентский bundle и **доступны публично**.

**Воздействие:** 🔴 **CRITICAL**
- Если ключ будет добавлен в .env → он станет публичным
- Любой сможет извлечь ключ из bundle.js
- Неограниченное использование вашего Groq API аккаунта

**Статус:** ⚠️ **Потенциальная уязвимость**
- Ключ не используется в коде (хорошо!)
- НО: Определён в типах → разработчик может случайно его использовать

**Рекомендация:**
1. **Удалить** `VITE_GROQ_API_KEY` из `.env.example`
2. **Удалить** строку из `src/vite-env.d.ts`
3. Groq API ключ должен быть **ТОЛЬКО** в Edge Functions environment

---

## 🟠 HIGH PRIORITY VULNERABILITIES

### HIGH-001: Missing Input Validation (No Zod)

**Описание:**
В дизайн-документе упоминалась валидация с Zod, но она **не реализована**. Отсутствует строгая валидация входных данных на frontend и в Edge Functions.

**Воздействие:** 🟠 **HIGH**
- SQL injection (маловероятно, т.к. Supabase защищает)
- XSS через user-generated content
- Logic errors из-за невалидных данных

**Рекомендация:**
```bash
npm install zod
```

```typescript
// Пример схемы валидации
import { z } from 'zod'

const CreateStudentSchema = z.object({
  firstName: z.string().min(1).max(50).regex(/^[а-яА-ЯёЁa-zA-Z]+$/),
  lastName: z.string().min(1).max(50).regex(/^[а-яА-ЯёЁa-zA-Z]+$/),
  className: z.string().regex(/^\d{1,2}[А-Я]$/),  // 10А, 11Б
  login: z.string().min(5).max(30).regex(/^[a-z0-9_]+$/),
  password: z.string().min(8).max(50).optional()
})

// В Edge Function:
const result = CreateStudentSchema.safeParse(await req.json())
if (!result.success) {
  return new Response(JSON.stringify({
    error: 'Validation failed',
    issues: result.error.issues
  }), { status: 400 })
}
```

---

### HIGH-002: Error Messages Leak Information

**Затронутые файлы:**
- Все Edge Functions (catch блоки)

**Описание:**
Error messages возвращают детали ошибок напрямую клиенту:

```typescript
// ❌ НЕПРАВИЛЬНО
return new Response(
  JSON.stringify({ error: error.message }),  // Может содержать SQL, internal paths, etc.
  { status: 400 }
)
```

**Воздействие:** 🟠 **HIGH**
- Information disclosure
- Помощь злоумышленникам в понимании структуры системы
- Возможность SQL injection based on error messages

**Рекомендация:**
```typescript
// ✅ ПРАВИЛЬНО
catch (error) {
  console.error('Internal error:', error)  // Логируем детали на сервере

  // Клиенту - generic message
  return new Response(
    JSON.stringify({
      error: 'An error occurred',
      code: 'INTERNAL_ERROR'
    }),
    { status: 500 }
  )
}
```

---

### HIGH-003: Missing CSRF Protection

**Описание:**
Отсутствуют механизмы защиты от CSRF атак. В сочетании с CORS `*` это особенно опасно.

**Воздействие:** 🟠 **HIGH**
- CSRF attacks (особенно на state-changing operations)
- Unauthorised actions от имени пользователя

**Рекомендация:**
1. Исправить CORS (см. CRITICAL-004)
2. Использовать SameSite cookies для session
3. Добавить CSRF tokens для критичных операций (создание/удаление пользователей)

---

## 🟡 MEDIUM PRIORITY VULNERABILITIES

### MEDIUM-001: No Content Security Policy (CSP)

**Описание:**
Отсутствуют заголовки Content-Security-Policy, что снижает защиту от XSS.

**Воздействие:** 🟡 **MEDIUM**
- XSS attacks более вероятны
- Inline scripts могут выполняться

**Рекомендация:**
Добавить в `index.html` или в Vite config:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://api.groq.com;
">
```

---

### MEDIUM-002: Weak Password Policy

**Затронутые файлы:**
- `supabase/functions/create-student/index.ts` (строка 43)

**Описание:**
Пароль по умолчанию = логину, минимальная длина не проверяется.

```typescript
password: password || login,  // Если password не указан, используется login
```

**Воздействие:** 🟡 **MEDIUM**
- Weak passwords
- Легко угадываемые credentials
- Брутфорс атаки

**Рекомендация:**
```typescript
// Генерировать случайный пароль минимум 12 символов
import { randomBytes } from 'crypto'

function generateSecurePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  const bytes = randomBytes(16)
  return Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

const generatedPassword = password || generateSecurePassword()
```

---

## ✅ ПОЛОЖИТЕЛЬНЫЕ МОМЕНТЫ БЕЗОПАСНОСТИ

1. ✅ **React защищает от XSS** - `dangerouslySetInnerHTML` не используется
2. ✅ **Supabase RLS включён** на всех таблицах
3. ✅ **Параметризованные запросы** - Supabase client защищает от SQL injection
4. ✅ **HTTPS by default** - Supabase и Vercel используют HTTPS
5. ✅ **JWT authentication** - используется стандартная Supabase Auth
6. ✅ **SECURITY DEFINER functions** - правильный подход для bypass RLS

---

## 📋 ПРИОРИТИЗИРОВАННЫЙ ПЛАН ИСПРАВЛЕНИЙ

### 🔥 Неделя 1 (КРИТИЧНО - блокирует продакшен)

1. **CRITICAL-001**: Добавить авторизацию во все Edge Functions
2. **CRITICAL-002**: Применить `fix_rls_circular_dependency_v2.sql`
3. **CRITICAL-003**: Удалить plaintext passwords из БД
4. **CRITICAL-004**: Исправить CORS на конкретные домены
5. **CRITICAL-005**: Применить `fix_lesson_sessions_rls.sql`

### ⚡ Неделя 2 (HIGH приоритет)

6. **CRITICAL-006**: Добавить rate limiting с Upstash Redis
7. **CRITICAL-007**: Удалить VITE_GROQ_API_KEY из frontend
8. **HIGH-001**: Добавить Zod validation
9. **HIGH-002**: Sanitize error messages
10. **HIGH-003**: Добавить CSRF protection

### 📊 Неделя 3-4 (MEDIUM приоритет)

11. **MEDIUM-001**: Добавить Content Security Policy
12. **MEDIUM-002**: Улучшить password policy

---

## 🛠 ГОТОВЫЕ СКРИПТЫ ИСПРАВЛЕНИЙ

В репозитории уже есть скрипты для исправления некоторых уязвимостей:

✅ `sql-scripts/fix_rls_circular_dependency_v2.sql` → CRITICAL-002
✅ `sql-scripts/fix_lesson_sessions_rls.sql` → CRITICAL-005
✅ `sql-scripts/fix_teachers_cant_see_students_v2.sql` → RLS improvements

**ВАЖНО:** Неизвестно, применены ли эти скрипты в продакшене!

---

## 📞 СЛЕДУЮЩИЕ ШАГИ

1. **Немедленно применить критические исправления** (Неделя 1)
2. **Создать branch `security-fixes`** для всех изменений
3. **Провести повторный аудит** после исправлений
4. **Настроить мониторинг безопасности** (Sentry, rate limit alerts)
5. **Проводить регулярные security audits** (каждые 3 месяца)

---

## 🔍 МЕТОДОЛОГИЯ АУДИТА

**Проверенные компоненты:**
- ✅ RLS политики (все миграции)
- ✅ Edge Functions (все 4 функции)
- ✅ Frontend security (XSS, secrets)
- ✅ Input validation
- ✅ Authentication & Authorization
- ✅ CORS & CSRF
- ✅ Error handling
- ⚠️ **НЕ проверено**: Network security, Infrastructure, DDoS protection

**Инструменты:**
- Manual code review
- Pattern matching (Grep)
- SQL analysis
- TypeScript/JavaScript security review

---

## 📄 ЗАКЛЮЧЕНИЕ

Платформа Sarpedon имеет **критические уязвимости безопасности**, которые делают её **небезопасной для продакшена** в текущем состоянии.

**Основные проблемы:**
1. Отсутствие авторизации в Edge Functions
2. Circular RLS dependencies
3. Хранение паролей в plaintext
4. Неправильная конфигурация CORS
5. Отсутствие rate limiting

**После исправления критических уязвимостей** (Неделя 1-2), платформа может быть допущена к ограниченному использованию с постоянным мониторингом.

**Рекомендуемая оценка после исправлений: 7/10 (Приемлемо)**

---

**Дата составления отчёта:** 17 ноября 2025
**Следующий аудит:** После применения исправлений

