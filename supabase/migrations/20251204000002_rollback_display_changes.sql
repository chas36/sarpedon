-- Rollback display role changes that were applied with wrong migration number
-- This fixes the conflict between migration numbers

-- Remove display role RLS policies
DROP POLICY IF EXISTS "Display can view students" ON profiles;
DROP POLICY IF EXISTS "Display can view levels" ON levels;
DROP POLICY IF EXISTS "Display can view submissions" ON submissions;
DROP POLICY IF EXISTS "Display can view level progress" ON level_progress;
DROP POLICY IF EXISTS "Display can view lesson sessions" ON lesson_sessions;
DROP POLICY IF EXISTS "Display can view lesson grades" ON lesson_grades;

-- Remove assigned_class column
ALTER TABLE profiles DROP COLUMN IF EXISTS assigned_class;

-- Remove display role from CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('teacher', 'student', 'editor'));
