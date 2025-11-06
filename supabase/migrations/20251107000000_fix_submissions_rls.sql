-- Fix RLS policies for submissions table
-- Problem: Policies check role via JWT user_metadata, but role is stored in profiles table

-- Drop old policies
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can create own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can update all submissions" ON public.submissions;

-- Create new policies that properly check profiles table

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions"
  ON public.submissions
  FOR SELECT
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- Students can insert their own submissions
CREATE POLICY "Students can create own submissions"
  ON public.submissions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- Students can update their own submissions
CREATE POLICY "Students can update own submissions"
  ON public.submissions
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'student'
    )
  );

-- Teachers and editors can view all submissions
CREATE POLICY "Teachers can view all submissions"
  ON public.submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- Teachers and editors can update all submissions (for grading)
CREATE POLICY "Teachers can update all submissions"
  ON public.submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- Teachers and editors can delete submissions
CREATE POLICY "Teachers can delete submissions"
  ON public.submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

COMMENT ON POLICY "Students can view own submissions" ON public.submissions IS
  'Students can only view their own submissions';
COMMENT ON POLICY "Teachers can view all submissions" ON public.submissions IS
  'Teachers and editors can view all student submissions for statistics and grading';
