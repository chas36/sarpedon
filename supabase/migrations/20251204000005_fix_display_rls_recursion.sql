-- Fix infinite recursion in display RLS policies
-- The problem: policies used subquery (SELECT role FROM profiles WHERE id = auth.uid())
-- which caused recursion when querying profiles table
-- Solution: Use SECURITY DEFINER function to bypass RLS

-- Create function to get current user role from JWT claims (no recursion)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
BEGIN
  -- Get role from profiles using SECURITY DEFINER to bypass RLS
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop all display-related policies that cause recursion
DROP POLICY IF EXISTS "Display can view students" ON profiles;
DROP POLICY IF EXISTS "Display can view levels" ON levels;
DROP POLICY IF EXISTS "Display can view submissions" ON submissions;
DROP POLICY IF EXISTS "Display can view level progress" ON level_progress;
DROP POLICY IF EXISTS "Display can view lesson sessions" ON lesson_sessions;
DROP POLICY IF EXISTS "Display can view lesson grades" ON lesson_grades;

-- Recreate policies using the function (no recursion)
CREATE POLICY "Display can view students"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    current_user_role() = 'display'
    AND role = 'student'
  );

CREATE POLICY "Display can view levels"
  ON levels FOR SELECT
  TO authenticated
  USING (current_user_role() = 'display');

CREATE POLICY "Display can view submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (current_user_role() = 'display');

CREATE POLICY "Display can view level progress"
  ON level_progress FOR SELECT
  TO authenticated
  USING (current_user_role() = 'display');

CREATE POLICY "Display can view lesson sessions"
  ON lesson_sessions FOR SELECT
  TO authenticated
  USING (current_user_role() = 'display');

CREATE POLICY "Display can view lesson grades"
  ON lesson_grades FOR SELECT
  TO authenticated
  USING (current_user_role() = 'display');
