-- ============================================
-- Проверка функции complete_entrance_test
-- ============================================

-- 1. Проверяем, существует ли функция
SELECT
    routine_name,
    routine_type,
    data_type as return_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'complete_entrance_test';

-- 2. Проверяем параметры функции
SELECT
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
    AND specific_name IN (
        SELECT specific_name
        FROM information_schema.routines
        WHERE routine_name = 'complete_entrance_test'
    )
ORDER BY ordinal_position;

-- 3. Проверяем права на выполнение
SELECT
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
    AND routine_name = 'complete_entrance_test';

-- 4. Если нет прав - добавляем
GRANT EXECUTE ON FUNCTION complete_entrance_test(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_entrance_test(UUID) TO anon;

-- 5. Проверяем существование связанных функций
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%entrance_test%'
ORDER BY routine_name;
