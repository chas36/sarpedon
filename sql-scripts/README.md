# SQL Скрипты для миграций и отладки

Эта папка содержит SQL скрипты для применения миграций и отладки базы данных Supabase.

## Миграции

### Основные миграции

- **`apply_migrations_dashboard.sql`** - Применяет все основные миграции через Dashboard
- **`apply_entrance_tests_migration.sql`** - Миграция системы входного тестирования
- **`apply_recommendations_migration.sql`** - Миграция системы рекомендаций
- **`apply_lesson_monitoring_migration.sql`** - 📍 **Миграция системы мониторинга уроков и оценок** - отслеживание активности учеников на уроке и выставление оценок по 5-балльной шкале

### Исправления

- **`fix_missing_functions.sql`** - Исправляет отсутствующие функции в БД
- **`fix_skill_tracking_function.sql`** - Исправляет функцию отслеживания навыков
- **`fix_complete_entrance_test.sql`** - Пересоздает функцию complete_entrance_test с правильными правами
- **`fix_complete_entrance_test_return_type.sql`** - 🔧 **РЕШЕНИЕ 404 ОШИБКИ** - Изменяет возвращаемый тип с VOID на JSON для совместимости с PostgREST

## Проверка и отладка

- **`check_submissions_schema.sql`** - Проверяет схему таблицы submissions
- **`check_entrance_test_permissions.sql`** - Проверяет права на функции входного тестирования
- **`diagnose_rpc_endpoint.sql`** - 🔧 **Диагностика RPC 404 ошибок** - полная проверка функции и перезагрузка схемы PostgREST
- **`verify_migrations_dashboard.sql`** - Проверяет применение миграций
- **`sync_migrations_state.sql`** - Синхронизирует состояние миграций

## Тестирование

- **`quick_test_system.sql`** - Быстрая проверка работы системы

## Использование

Все скрипты применяются через Supabase Dashboard → SQL Editor:

1. Откройте https://app.supabase.com
2. Выберите ваш проект
3. Перейдите в SQL Editor
4. Скопируйте содержимое нужного файла
5. Вставьте и выполните (Run)

## Важно

⚠️ **Перед применением миграций сделайте бэкап базы данных!**

Миграции создают/изменяют:
- Таблицы
- Функции (stored procedures)
- RLS политики
- Индексы
