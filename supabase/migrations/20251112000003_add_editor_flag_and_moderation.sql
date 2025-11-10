-- Add editor flag and moderation system
-- Students can now be both student AND editor simultaneously

-- ============================================
-- PROFILES: Add is_editor flag
-- ============================================

-- Add is_editor column
ALTER TABLE public.profiles
ADD COLUMN is_editor BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing data: role='editor' becomes is_editor=true with role='student'
UPDATE public.profiles
SET is_editor = true, role = 'student'
WHERE role = 'editor';

-- Add comment
COMMENT ON COLUMN public.profiles.is_editor IS
  'Flag indicating if student can create and edit levels (subject to moderation)';

-- ============================================
-- LEVELS: Add moderation fields
-- ============================================

-- Add moderation status enum
DO $$ BEGIN
  CREATE TYPE moderation_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add moderation columns
ALTER TABLE public.levels
ADD COLUMN moderation_status moderation_status NOT NULL DEFAULT 'approved',
ADD COLUMN moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN moderation_notes TEXT,
ADD COLUMN moderated_at TIMESTAMPTZ;

-- Set all existing levels to 'approved' (they were created by teachers)
UPDATE public.levels
SET moderation_status = 'approved'
WHERE created_by IS NOT NULL;

-- Add index for filtering by moderation status
CREATE INDEX idx_levels_moderation_status ON public.levels(moderation_status);

-- Add comments
COMMENT ON COLUMN public.levels.moderation_status IS
  'Status of level moderation: draft, pending_review, approved, rejected';
COMMENT ON COLUMN public.levels.moderator_id IS
  'Teacher who moderated this level';
COMMENT ON COLUMN public.levels.moderation_notes IS
  'Notes from moderator about approval/rejection';
COMMENT ON COLUMN public.levels.moderated_at IS
  'When the level was moderated';

-- ============================================
-- RLS POLICIES: Update for new schema
-- ============================================

-- Update levels visibility: students only see approved levels
-- Teachers see all levels, editors see their own drafts + approved levels
DROP POLICY IF EXISTS "Everyone can view levels" ON public.levels;

CREATE POLICY "Students can view approved levels"
  ON public.levels FOR SELECT
  USING (
    moderation_status = 'approved'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'student'
      )
    )
  );

CREATE POLICY "Editors can view own levels"
  ON public.levels FOR SELECT
  USING (
    created_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_editor = true
      )
    )
  );

CREATE POLICY "Teachers can view all levels"
  ON public.levels FOR SELECT
  USING (is_teacher());

-- Update level creation: editors create with pending_review status
DROP POLICY IF EXISTS "Teachers can create levels" ON public.levels;

CREATE POLICY "Teachers can create approved levels"
  ON public.levels FOR INSERT
  WITH CHECK (
    is_teacher()
    AND (moderation_status = 'approved' OR moderation_status IS NULL)
  );

CREATE POLICY "Editors can create draft levels"
  ON public.levels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_editor = true
    )
    AND created_by = auth.uid()
    AND moderation_status IN ('draft', 'pending_review')
  );

-- Update level editing policies
DROP POLICY IF EXISTS "Teachers can update levels" ON public.levels;

CREATE POLICY "Teachers can update any level"
  ON public.levels FOR UPDATE
  USING (is_teacher());

CREATE POLICY "Editors can update own draft levels"
  ON public.levels FOR UPDATE
  USING (
    created_by = auth.uid()
    AND moderation_status IN ('draft', 'pending_review', 'rejected')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_editor = true
    )
  );

-- Update level deletion policies
DROP POLICY IF EXISTS "Teachers can delete levels" ON public.levels;

CREATE POLICY "Teachers can delete any level"
  ON public.levels FOR DELETE
  USING (is_teacher());

CREATE POLICY "Editors can delete own draft levels"
  ON public.levels FOR DELETE
  USING (
    created_by = auth.uid()
    AND moderation_status IN ('draft', 'rejected')
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_editor = true
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update is_editor function to check the flag
CREATE OR REPLACE FUNCTION is_editor()
RETURNS BOOLEAN AS $$
DECLARE
  user_is_editor BOOLEAN;
BEGIN
  SELECT is_editor INTO user_is_editor
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN COALESCE(user_is_editor, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user is teacher or editor
CREATE OR REPLACE FUNCTION is_teacher_or_editor()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_is_editor BOOLEAN;
BEGIN
  SELECT role, is_editor INTO user_role, user_is_editor
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN user_role = 'teacher' OR COALESCE(user_is_editor, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
