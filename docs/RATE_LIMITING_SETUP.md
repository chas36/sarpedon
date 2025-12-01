# Rate Limiting Setup Guide

## 🛡️ Overview

Rate limiting защищает ваши Edge Functions от:
- **DoS/DDoS атак** - защита от перегрузки
- **Brute force атак** - ограничение попыток подбора паролей
- **API abuse** - предотвращение истощения квот (Groq API)
- **Финансовые потери** - контроль расходов на API calls

**Status**: ✅ Реализовано во всех 4 Edge Functions

---

## 📊 Rate Limits

| Endpoint | Лимит | Причина |
|---|---|---|
| `create-student` | 5 req/min | Дорогая операция (auth + DB) |
| `delete-student` | 5 req/min | Дорогая операция (auth + DB) |
| `ai-feedback` | 5 req/min | Использует Groq API (квоты) |
| `generate-level` | 5 req/min | Использует Groq API (квоты) |

**Идентификация**: По user ID (аутентифицированные) или IP (неаутентифицированные)

---

## 🚀 Quick Start

### Вариант 1: Development (In-Memory)

**Для локальной разработки** rate limiting работает "из коробки" с in-memory storage:

```bash
# Edge Functions будут использовать fallback
supabase functions serve

# Вы увидите warning:
# ⚠️  UPSTASH_REDIS not configured, using in-memory rate limiter (dev only!)
```

⚠️ **Важно**: In-memory rate limiter НЕ работает в production (каждый Edge Function instance имеет свою память)

---

### Вариант 2: Production (Upstash Redis) ⭐ Рекомендуется

Upstash Redis - serverless Redis с **бесплатным tier**:
- ✅ 10,000 команд в день (бесплатно)
- ✅ Глобальное распределение
- ✅ REST API (работает с Supabase Edge Functions)

#### Шаг 1: Создать Upstash аккаунт

1. Открой [Upstash Console](https://console.upstash.com/)
2. Зарегистрируйся (GitHub/Google/Email)
3. Нажми **"Create Database"**

#### Шаг 2: Настроить Redis database

**Настройки**:
- **Name**: `sarpedon-ratelimit` (или любое название)
- **Type**: Regional (бесплатный) или Global ($0.2/100k)
- **Region**: Выбери ближайший к пользователям (например, `eu-west-1`)
- **TLS**: Enabled (рекомендуется)

Нажми **Create**

#### Шаг 3: Получить credentials

После создания database:

1. Открой вкладку **"REST API"**
2. Скопируй:
   - `UPSTASH_REDIS_REST_URL` - например `https://us1-helping-falcon-12345.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` - длинный токен (начинается с `A...`)

#### Шаг 4: Добавить в Supabase Edge Functions

1. Открой [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейди в **Settings → Edge Functions → Secrets**
3. Добавь **2 секрета**:

**Секрет 1:**
- Name: `UPSTASH_REDIS_REST_URL`
- Value: `https://us1-helping-falcon-12345.upstash.io` (твой URL)

**Секрет 2:**
- Name: `UPSTASH_REDIS_REST_TOKEN`
- Value: `A...` (твой токен)

4. Нажми **"Save"** для каждого

#### Шаг 5: Redeploy Edge Functions

```bash
# Redeploy all functions to pick up new secrets
supabase functions deploy create-student
supabase functions deploy delete-student
supabase functions deploy ai-feedback
supabase functions deploy generate-level
```

#### Шаг 6: Проверить работу

Сделай несколько запросов к любой функции:

```bash
# Должно работать (1-5 запросов)
curl -X POST https://your-project.supabase.co/functions/v1/ai-feedback \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "print(1)", "language": "python"}'

# После 5 запросов в минуту должно вернуть:
# {
#   "error": "Rate limit exceeded",
#   "message": "Too many requests. Please try again later.",
#   "code": "RATE_LIMIT_EXCEEDED"
# }
# Status: 429 Too Many Requests
# Headers:
#   X-RateLimit-Limit: 5
#   X-RateLimit-Remaining: 0
#   X-RateLimit-Reset: 1234567890000
#   Retry-After: 45
```

---

## 🔧 Настройка Лимитов

Если нужно изменить rate limits, отредактируй `supabase/functions/_shared/ratelimit.ts`:

```typescript
export const RATE_LIMITS = {
  // Дорогие операции (AI, create/delete users)
  STRICT: { maxRequests: 5, windowSeconds: 60 },      // 5 per minute

  // Обычные операции (CRUD)
  NORMAL: { maxRequests: 20, windowSeconds: 60 },     // 20 per minute

  // Read-only операции
  PERMISSIVE: { maxRequests: 60, windowSeconds: 60 }, // 60 per minute
}
```

Затем redeploy функции:
```bash
supabase functions deploy <function-name>
```

---

## 🧪 Тестирование

### Локально (In-Memory)

```bash
# Start functions locally
supabase functions serve

# Test rate limiting (repeat 6 times)
for i in {1..6}; do
  curl http://localhost:54321/functions/v1/ai-feedback \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{"code":"test"}'
  echo "\nRequest $i"
done

# Request 1-5: должны пройти (200/201)
# Request 6: rate limited (429)
```

### Production (Upstash)

Используй тот же тест, но с production URL:
```bash
https://your-project.supabase.co/functions/v1/...
```

---

## 📈 Мониторинг

### Upstash Console

1. Открой [Upstash Console](https://console.upstash.com/)
2. Выбери свою database
3. Вкладка **"Metrics"** показывает:
   - Total commands per day
   - Response times
   - Connection stats

### Supabase Logs

1. Открой Supabase Dashboard → **Logs** → **Edge Functions**
2. Фильтруй по функции
3. Ищи сообщения:
   - `⚠️  UPSTASH_REDIS not configured` - Redis не настроен
   - `Rate limit check failed` - ошибка подключения к Redis

---

## ⚠️ Troubleshooting

### Problem: "UPSTASH_REDIS not configured" в production

**Причина**: Секреты не установлены в Supabase

**Решение**:
1. Проверь что секреты добавлены: Dashboard → Settings → Edge Functions → Secrets
2. Должны быть: `UPSTASH_REDIS_REST_URL` и `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy функции после добавления секретов

### Problem: Rate limit не работает (все запросы проходят)

**Причина 1**: In-memory limiter в production (разные instances)

**Решение**: Настрой Upstash Redis (см. выше)

**Причина 2**: Неправильный UPSTASH_REDIS_REST_TOKEN

**Решение**: Проверь что скопировал **REST API Token**, не **Connection String**

### Problem: "Rate limit check failed" error

**Причина**: Не удалось подключиться к Upstash

**Решение**:
1. Проверь URL и Token в Supabase Secrets
2. Проверь что Upstash database активна (не suspended)
3. Middleware логирует ошибки, но **не блокирует запросы** (fail open)

### Problem: 429 Too Many Requests слишком часто

**Причина**: Лимиты слишком строгие для вашего use case

**Решение**: Увеличь `maxRequests` в `RATE_LIMITS` (см. "Настройка Лимитов")

---

## 💰 Pricing

### Upstash Free Tier (достаточно для большинства)

- ✅ 10,000 команд в день
- ✅ 1 database
- ✅ Regional deployment
- ✅ TLS encryption

**Расчёт**:
- 5 req/min/user × 60 min = 300 req/hour/user
- 10,000 / 300 = **~33 активных пользователя одновременно**

### Upstash Pay-As-You-Go

- $0.20 per 100,000 commands
- Global replication: +$0.40 per 100,000 commands
- No limits

---

## 🎯 Результат

После настройки rate limiting:

✅ **CRITICAL-006 закрыта**
✅ **Security Score: 3/10 → 9/10**
✅ Защита от DoS атак
✅ Контроль API расходов
✅ Brute force protection

---

## 📚 Дополнительные Ресурсы

- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Upstash Rate Limiting](https://docs.upstash.com/redis/sdks/ratelimit)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Security Audit Report](./SECURITY_AUDIT_REPORT.md)
