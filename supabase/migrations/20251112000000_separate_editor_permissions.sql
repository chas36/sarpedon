-- Sarpedon Educational Platform
-- Separate Editor and Teacher Permissions
-- Editors can only manage levels, not users/classes/competitions

-- ============================================
-- DROP OLD POLICIES THAT GAVE EDITORS TOO MANY RIGHTS
-- ============================================

-- Drop policies that allowed editors to manage profiles
-- NOTE: We keep "Users can view own profile" and "Users can update own profile" - they are critical!
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can delete profiles" ON public.profiles;

-- Drop policies that allowed editors to manage competitions
DROP POLICY IF EXISTS "Teachers can create competitions" ON public.competitions;
DROP POLICY IF EXISTS "Teachers can update competitions" ON public.competitions;
DROP POLICY IF EXISTS "Teachers can delete competitions" ON public.competitions;

-- Drop policies that allowed editors to manage teams
DROP POLICY IF EXISTS "Teachers can create teams" ON public.teams;
DROP POLICY IF EXISTS "Teachers can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Teachers can update team scores" ON public.team_scores;

-- ============================================
-- CREATE NEW POLICIES WITH PROPER SEPARATION
-- ============================================

-- PROFILES: Users can view own, Teachers can manage, Editors can only view
-- Users can view their own profile (CRITICAL - must exist!)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Teachers can view all profiles
CREATE POLICY "Teachers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- Editors can view all profiles
CREATE POLICY "Editors can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'editor'
    )
  );

-- Only teachers can create/update/delete profiles
CREATE POLICY "Teachers can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- COMPETITIONS: Only teachers can manage
CREATE POLICY "Teachers can create competitions"
  ON public.competitions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update competitions"
  ON public.competitions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can delete competitions"
  ON public.competitions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- TEAMS: Only teachers can manage
CREATE POLICY "Teachers can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can update teams"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can delete teams"
  ON public.teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- TEAM MEMBERS: Only teachers can manage
CREATE POLICY "Teachers can manage team members"
  ON public.team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- TEAM SCORES: Only teachers can manage
CREATE POLICY "Teachers can update team scores"
  ON public.team_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- ============================================
-- UPDATE HELPER FUNCTIONS
-- ============================================

-- Update is_teacher() to only check for 'teacher' role
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New function to check if user is an editor
CREATE OR REPLACE FUNCTION is_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'editor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New function to check if user is teacher or editor
CREATE OR REPLACE FUNCTION is_teacher_or_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Editors can view all profiles" ON public.profiles IS
  'Editors need to view profiles to see which students can access their levels';

COMMENT ON FUNCTION is_editor() IS
  'Check if current user has editor role (can create/edit levels only)';

COMMENT ON FUNCTION is_teacher_or_editor() IS
  'Check if current user has teacher or editor role';
