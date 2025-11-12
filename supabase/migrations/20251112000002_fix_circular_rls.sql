-- Fix circular RLS dependency in profile policies
-- The issue: policies that check role cause circular dependencies
-- Solution: Make helper functions properly bypass RLS

-- Update helper functions to bypass RLS
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Bypass RLS by using security definer with proper search path
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN user_role = 'teacher';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_editor()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN user_role = 'editor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_teacher_or_editor()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('teacher', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Now update the policies to use these functions instead of inline EXISTS
-- Drop the problematic policies
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Editors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can delete profiles" ON public.profiles;

-- Recreate with function calls instead of EXISTS subqueries
CREATE POLICY "Teachers can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_teacher());

CREATE POLICY "Editors can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_editor());

CREATE POLICY "Teachers can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (is_teacher());

CREATE POLICY "Teachers can update profiles"
  ON public.profiles FOR UPDATE
  USING (is_teacher());

CREATE POLICY "Teachers can delete profiles"
  ON public.profiles FOR DELETE
  USING (is_teacher());
