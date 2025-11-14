-- ============================================
-- Comprehensive RPC Endpoint Diagnostics
-- ============================================

-- 1. Check exact function signature and details
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosecdef as is_security_definer,
    CASE
        WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
        WHEN p.provolatile = 's' THEN 'STABLE'
        WHEN p.provolatile = 'v' THEN 'VOLATILE'
    END as volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'complete_entrance_test'
    AND n.nspname = 'public';

-- 2. Check permissions with full function signature
SELECT
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
    AND routine_name = 'complete_entrance_test'
ORDER BY grantee;

-- 3. Test the function directly with a real attempt ID
-- (Replace with actual attempt_id if you want to test)
-- SELECT complete_entrance_test('00000000-0000-0000-0000-000000000000'::uuid);

-- 4. Check if PostgREST is aware of the function
-- This queries the pg_catalog to see what PostgREST should see
SELECT
    routine_schema,
    routine_name,
    specific_name,
    data_type as return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'complete_entrance_test';

-- 5. Check function parameters
SELECT
    parameter_name,
    data_type,
    parameter_mode,
    ordinal_position
FROM information_schema.parameters
WHERE specific_schema = 'public'
    AND specific_name IN (
        SELECT specific_name
        FROM information_schema.routines
        WHERE routine_name = 'complete_entrance_test'
    )
ORDER BY ordinal_position;

-- ============================================
-- RELOAD PostgREST Schema Cache
-- ============================================
-- This notifies PostgREST to reload its schema cache
-- Run this if the function exists but RPC returns 404
NOTIFY pgrst, 'reload schema';

-- ============================================
-- Alternative: Manually refresh the schema cache
-- ============================================
-- If NOTIFY doesn't work, you can also try:
-- 1. Go to Supabase Dashboard → Settings → API
-- 2. Click "Restart API Server" or "Reload Schema Cache"
-- 3. Or wait 5 minutes for automatic cache refresh

-- ============================================
-- Verify the function can be called
-- ============================================
-- To test with a real attempt_id, uncomment and update:
-- DO $$
-- DECLARE
--     v_attempt_id UUID := 'YOUR-ACTUAL-ATTEMPT-ID-HERE';
-- BEGIN
--     PERFORM complete_entrance_test(v_attempt_id);
--     RAISE NOTICE 'Function executed successfully!';
-- EXCEPTION
--     WHEN OTHERS THEN
--         RAISE NOTICE 'Error: %', SQLERRM;
-- END $$;
