# Развертывание AI Feedback Edge Function

## Проблема
Прямые запросы к Groq API из браузера блокируются CORS политикой. Решение - использовать Supabase Edge Function как прокси.

## Решение

### 1. Edge Function создана
Файл: `supabase/functions/ai-feedback/index.ts`

Эта функция:
- Принимает запросы от фронтенда
- Проксирует их к Groq API
- Использует GROQ_API_KEY из переменных окружения
- Обрабатывает CORS

### 2. Обновлен Frontend
Файл: `src/shared/api/aiFeedbackApi.ts`

Изменения:
- Убран прямой вызов fetch к Groq API
- Добавлен вызов через `supabase.functions.invoke('ai-feedback')`
- Убрана необходимость в VITE_GROQ_API_KEY на клиенте

## Инструкции по развертыванию

### Шаг 1: Установить Groq API ключ в Supabase

Перейдите в настройки проекта Supabase:
```
Dashboard → Project Settings → Edge Functions → Secrets
```

Добавьте секрет:
- Ключ: `GROQ_API_KEY`
- Значение: Ваш API ключ от https://console.groq.com

### Шаг 2: Развернуть Edge Function

```bash
# Войти в Supabase CLI
supabase login

# Связать с проектом (если еще не связано)
supabase link --project-ref your-project-ref

# Развернуть функцию
supabase functions deploy ai-feedback
```

### Шаг 3: Обновить .env (опционально)

Вы можете удалить `VITE_GROQ_API_KEY` из `.env`, так как теперь ключ хранится в Supabase:

```bash
# Эта переменная больше не нужна на клиенте
# VITE_GROQ_API_KEY=your-groq-api-key
```

## Проверка работы

После развертывания:

1. Откройте приложение
2. Решите любой уровень с неправильным кодом
3. Нажмите "Получить подсказку от AI"
4. Проверьте консоль браузера - не должно быть CORS ошибок
5. Должны появиться подсказки от AI

## Отладка

### Проверить логи Edge Function:
```bash
supabase functions logs ai-feedback
```

### Локальное тестирование:
```bash
# Запустить Edge Functions локально
supabase functions serve ai-feedback --env-file .env.local

# В .env.local добавьте:
GROQ_API_KEY=your-api-key
```

### Тест через curl:
```bash
curl -X POST \
  'https://your-project-ref.supabase.co/functions/v1/ai-feedback' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "llama-3.1-8b-instant",
    "messages": [{"role": "user", "content": "Test"}],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

## Безопасность

- API ключ Groq хранится в Supabase Secrets (не в коде)
- Edge Function доступна только авторизованным пользователям
- CORS настроен только для вашего домена

## Стоимость

Groq API (бесплатный tier):
- 14,400 запросов/день
- 6,000-15,000 токенов/минута
- Для образовательной платформы этого более чем достаточно

Supabase Edge Functions:
- 500,000 вызовов/месяц бесплатно
- После этого ~$2 за 1M вызовов
