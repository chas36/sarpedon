-- ============================================
-- Принудительная перезагрузка схемы PostgREST
-- ============================================
-- Используется когда функции созданы, но возвращается 404

-- Отправляем уведомление PostgREST о перезагрузке схемы
NOTIFY pgrst, 'reload schema';

-- Также можно попробовать reload config
NOTIFY pgrst, 'reload config';

SELECT 'PostgREST schema reload requested' as status,
       'If errors persist, restart API server in Supabase Dashboard' as note;

-- Альтернативное решение:
-- 1. Перейдите в Supabase Dashboard
-- 2. Settings → API
-- 3. Нажмите "Restart API Server"
