-- ============================================
-- Apply Lesson Monitoring and Grading Migration
-- ============================================
-- This script contains the full migration for the lesson monitoring system
-- Copy and paste into Supabase SQL Editor

-- Source: supabase/migrations/20251113000000_add_lesson_sessions_and_grades.sql

\i '../supabase/migrations/20251113000000_add_lesson_sessions_and_grades.sql'

-- Alternative: If \i command doesn't work, copy the full content of the migration file:
-- supabase/migrations/20251113000000_add_lesson_sessions_and_grades.sql

-- After running this migration, you'll be able to:
-- 1. Start lessons for specific classes
-- 2. Track student activity during lessons in real-time
-- 3. Assign grades (1-5) with automatic suggestions
-- 4. View lesson history and grade reports
--
-- The system will automatically link new student submissions to active lessons
-- Teachers can access the monitoring page at: /teacher/lesson-monitor
