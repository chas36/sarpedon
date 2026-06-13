-- Verification script to check database state

-- Check if character_interactions table exists
SELECT
  'character_interactions table' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'character_interactions'
    ) THEN '✓ EXISTS'
    ELSE '✗ NOT FOUND'
  END as status;

-- Check analyze_submission_skills function
SELECT
  'analyze_submission_skills function' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'analyze_submission_skills'
    ) THEN '✓ EXISTS'
    ELSE '✗ NOT FOUND'
  END as status;

-- Check get_character_stats function
SELECT
  'get_character_stats function' as check_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'get_character_stats'
    ) THEN '✓ EXISTS'
    ELSE '✗ NOT FOUND'
  END as status;

-- List all function signatures for analyze_submission_skills
SELECT
  'Function signature' as info,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('analyze_submission_skills', 'get_character_stats')
ORDER BY p.proname;

-- Check which migrations have been applied
SELECT
  'Applied migrations' as info,
  version,
  name
FROM supabase_migrations.schema_migrations
WHERE version LIKE '202512%'
ORDER BY version DESC
LIMIT 10;
