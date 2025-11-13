-- ============================================
-- Clean up existing lesson monitoring objects before reapplying migration
-- ============================================
-- Run this script ONLY if you get errors about existing relations/functions
-- This will remove all lesson monitoring tables and functions

-- Drop triggers first
DROP TRIGGER IF EXISTS auto_assign_lesson_to_submission ON public.submissions;
DROP TRIGGER IF EXISTS update_lesson_grades_updated_at ON public.lesson_grades;
DROP TRIGGER IF EXISTS update_lesson_sessions_updated_at ON public.lesson_sessions;

-- Drop functions
DROP FUNCTION IF EXISTS public.auto_assign_submission_to_lesson() CASCADE;
DROP FUNCTION IF EXISTS public.get_lesson_activity(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_lesson_for_class(TEXT, UUID) CASCADE;

-- Drop tables (CASCADE will also drop foreign keys)
DROP TABLE IF EXISTS public.lesson_grades CASCADE;
DROP TABLE IF EXISTS public.lesson_sessions CASCADE;

-- Remove lesson_session_id column from submissions if it exists
ALTER TABLE public.submissions DROP COLUMN IF EXISTS lesson_session_id;

-- Now you can run the full migration:
-- supabase/migrations/20251113000000_add_lesson_sessions_and_grades.sql

SELECT 'Cleanup completed. You can now run the migration script.' as status;
