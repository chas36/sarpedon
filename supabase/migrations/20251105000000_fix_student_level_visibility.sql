-- Fix Student Level Visibility
-- This migration replaces the universal "Everyone can view levels" policy
-- with separate policies for teachers and students that respect the allowed_classes field

-- Drop the old universal policy
DROP POLICY IF EXISTS "Everyone can view levels" ON public.levels;

-- Teachers and editors can view all levels (no restrictions)
CREATE POLICY "Teachers can view all levels"
  ON public.levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- Students can view levels that are either:
-- 1. Available to all classes (allowed_classes IS NULL or empty array)
-- 2. Specifically allowed for their class (their class is in the allowed_classes array)
CREATE POLICY "Students can view allowed levels"
  ON public.levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'student'
        AND (
          -- Level is available to all classes
          levels.allowed_classes IS NULL
          OR levels.allowed_classes = '{}'
          -- Student's class is in the allowed_classes array
          OR class = ANY(levels.allowed_classes)
        )
    )
  );

-- Comment
COMMENT ON POLICY "Teachers can view all levels" ON public.levels IS
  'Teachers and editors can see all levels without restrictions';

COMMENT ON POLICY "Students can view allowed levels" ON public.levels IS
  'Students can only see levels that are available to all classes or specifically allowed for their class';
