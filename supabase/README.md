# Supabase Database Setup

Инструкции по настройке базы данных для платформы Sarpedon.

## Структура

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # Базовая схема таблиц
│   └── 002_row_level_security.sql # RLS политики безопасности
└── seed.sql                        # Тестовые данные
```

## Применение миграций

### Вариант 1: Через Supabase CLI (Рекомендуется)

1. Установите Supabase CLI:
```bash
npm install -g supabase
```

2. Инициализируйте проект (если еще не сделано):
```bash
supabase init
```

3. Запустите локальную базу данных:
```bash
supabase start
```

4. Примените миграции:
```bash
supabase db reset
```

Это автоматически применит все миграции из папки `migrations/` в правильном порядке.

### Вариант 2: Через Supabase Dashboard

1. Откройте ваш проект в [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в SQL Editor
3. Скопируйте содержимое `migrations/001_initial_schema.sql`
4. Выполните SQL
5. Скопируйте содержимое `migrations/002_row_level_security.sql`
6. Выполните SQL

### Вариант 3: Через API

Используйте Supabase Management API для программного применения миграций.

## Тестовые данные

После применения миграций можно загрузить тестовые данные:

```bash
# Через Supabase CLI
supabase db reset --seed

# Или через Dashboard
# Скопируйте и выполните seed.sql в SQL Editor
```

### Тестовые учетные записи

**Преподаватель:**
- Login: `teacher001`
- Email: `teacher@sarpedon.local`
- Пароль: Устанавливается через Supabase Auth

**Ученики:**
- Login: `student001` (Иван Студентов, 7А класс)
- Login: `student002` (Анна Ученикова, 7А класс)
- Login: `student003` (Петр Школьников, 7Б класс)

## Структура базы данных

### Основные таблицы

- **profiles** - Профили пользователей (расширение auth.users)
- **levels** - Уровни заданий
- **student_attempts** - Попытки решения
- **level_progress** - Прогресс по уровням
- **adaptive_recommendations** - Адаптивные рекомендации
- **competitions** - Соревнования
- **teams** - Команды
- **team_members** - Участники команд
- **team_scores** - Очки команд

### Row Level Security (RLS)

Все таблицы защищены RLS политиками:

- **Ученики** могут видеть и изменять только свои данные
- **Преподаватели** имеют полный доступ к данным
- **Редакторы** могут создавать и редактировать уровни

## Переменные окружения

Создайте файл `.env.local` в корне проекта:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Эти значения можно найти в:
1. Supabase Dashboard → Settings → API
2. Project URL и anon/public key

## Создание пользователей в продакшене

В продакшене пользователи создаются через панель преподавателя:

1. Преподаватель загружает CSV с учениками
2. Система генерирует уникальные логины
3. Создаются записи в `auth.users` через Supabase Auth Admin API
4. Создаются профили в `public.profiles`
5. Генерируются временные пароли

## Backup и восстановление

```bash
# Создать дамп базы
supabase db dump -f backup.sql

# Восстановить из дампа
supabase db reset --db-url "postgresql://..."
```

## Мониторинг

- Проверяйте логи в Supabase Dashboard → Logs
- Отслеживайте использование в Dashboard → Usage
- Настройте алерты для критических событий

## Дополнительные ресурсы

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
