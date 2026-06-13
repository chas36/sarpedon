-- ============================================
-- SYNC MIGRATION STATE
-- ============================================
-- Этот скрипт регистрирует примененные миграции в таблице supabase_migrations.schema_migrations
-- Запустите это после того, как применили миграции вручную через Dashboard
-- ============================================

-- Создаем схему supabase_migrations если её нет
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

-- Создаем таблицу schema_migrations если её нет
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version TEXT PRIMARY KEY,
  statements TEXT[],
  name TEXT
);

-- Регистрируем примененные миграции (используем INSERT ... ON CONFLICT DO NOTHING)
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES 
  ('20251107000002', '20251107000002_create_character_system'),
  ('20251108000000', '20251108000000_add_proficiency_levels'),
  ('20251109000000', '20251109000000_add_skill_tracking'),
  ('20251110000000', '20251110000000_add_entrance_tests')
ON CONFLICT (version) DO NOTHING;

-- Проверка: показать все зарегистрированные миграции
SELECT 
  version,
  name,
  'Зарегистрирована' as status
FROM supabase_migrations.schema_migrations
WHERE version IN ('20251107000002', '20251108000000', '20251109000000', '20251110000000')
ORDER BY version;

-- Итоговая проверка
SELECT 
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ Все 4 миграции зарегистрированы!'
    ELSE '⚠️ Найдено только ' || COUNT(*) || ' миграций из 4'
  END as sync_status
FROM supabase_migrations.schema_migrations
WHERE version IN ('20251107000002', '20251108000000', '20251109000000', '20251110000000');
