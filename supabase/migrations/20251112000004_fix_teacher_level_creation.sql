-- Fix teacher level creation policy to allow importing levels on behalf of students
-- Problem: Teachers couldn't create levels with created_by set to student ID
-- Solution: Allow teachers to create levels with any moderation_status and any created_by

-- Drop existing policy
DROP POLICY IF EXISTS "Teachers can create approved levels" ON public.levels;

-- Create new policy: teachers can create levels with any status and any author
CREATE POLICY "Teachers can create any level"
  ON public.levels FOR INSERT
  WITH CHECK (is_teacher());

-- Note: This allows teachers to:
-- 1. Create their own levels (created_by = null or their ID, status = approved)
-- 2. Import levels on behalf of students (created_by = student ID, status = pending_review or approved)
-- 3. Full flexibility for admin operations
