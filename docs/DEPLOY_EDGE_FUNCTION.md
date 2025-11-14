# Deploy Edge Function для создания студентов

## Проблема
Supabase не позволяет создавать пользователей с автоподтверждением email из браузера (требуется Admin API).

## Решение
Используем Supabase Edge Function, которая работает на сервере и имеет доступ к Admin API.

## Шаги для деплоя

### 1. Залогиниться в Supabase CLI
```bash
supabase login
```
Откроется браузер для авторизации.

### 2. Получить Project ID
1. Откройте ваш проект в Supabase Dashboard: https://supabase.com/dashboard
2. Перейдите в Settings → General
3. Скопируйте **Reference ID** (это ваш project ID)

### 3. Связать проект
```bash
supabase link --project-ref YOUR_PROJECT_ID
```
Замените `YOUR_PROJECT_ID` на ваш Reference ID.

### 4. Задеплоить функцию
```bash
supabase functions deploy create-student
```

### 5. Проверить деплой
```bash
supabase functions list
```

## После деплоя

Функция будет доступна по URL:
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/create-student
```

Клиентский код уже настроен на использование этой функции через `supabase.functions.invoke()`.

## Troubleshooting

**Ошибка: "Failed to get service role key"**
- Убедитесь, что вы залогинены: `supabase login`
- Проверьте, что проект связан: `supabase projects list`

**Ошибка при деплое**
- Проверьте синтаксис TypeScript в `supabase/functions/create-student/index.ts`
- Убедитесь, что у вас есть права на проект

## Альтернатива (временное решение)

Если не можете задеплоить функцию, можно:
1. Отключить email confirmation в Supabase Dashboard:
   - Authentication → Providers → Email
   - Выключите "Confirm email"
   - Сохраните

Это позволит использовать старый код с `signUp()` без подтверждения email.
