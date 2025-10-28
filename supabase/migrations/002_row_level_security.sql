-- Sarpedon Educational Platform
-- Row Level Security (RLS) Policies

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_scores ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
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
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- Teachers can create profiles (for bulk user creation)
CREATE POLICY "Teachers can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- LEVELS TABLE POLICIES
-- ============================================

-- Everyone can view published levels
CREATE POLICY "Everyone can view levels"
  ON public.levels FOR SELECT
  USING (true);

-- Teachers and editors can create levels
CREATE POLICY "Teachers can create levels"
  ON public.levels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- Teachers and editors can update levels
CREATE POLICY "Teachers can update levels"
  ON public.levels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- Teachers and editors can delete levels
CREATE POLICY "Teachers can delete levels"
  ON public.levels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- STUDENT ATTEMPTS TABLE POLICIES
-- ============================================

-- Students can view their own attempts
CREATE POLICY "Students can view own attempts"
  ON public.student_attempts FOR SELECT
  USING (student_id = auth.uid());

-- Students can create their own attempts
CREATE POLICY "Students can create own attempts"
  ON public.student_attempts FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Teachers can view all attempts
CREATE POLICY "Teachers can view all attempts"
  ON public.student_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- LEVEL PROGRESS TABLE POLICIES
-- ============================================

-- Students can view their own progress
CREATE POLICY "Students can view own progress"
  ON public.level_progress FOR SELECT
  USING (student_id = auth.uid());

-- Students can update their own progress
CREATE POLICY "Students can update own progress"
  ON public.level_progress FOR UPDATE
  USING (student_id = auth.uid());

-- Students can insert their own progress
CREATE POLICY "Students can insert own progress"
  ON public.level_progress FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Teachers can view all progress
CREATE POLICY "Teachers can view all progress"
  ON public.level_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- ADAPTIVE RECOMMENDATIONS TABLE POLICIES
-- ============================================

-- Students can view their own recommendations
CREATE POLICY "Students can view own recommendations"
  ON public.adaptive_recommendations FOR SELECT
  USING (student_id = auth.uid());

-- Students can update their own recommendations
CREATE POLICY "Students can update own recommendations"
  ON public.adaptive_recommendations FOR UPDATE
  USING (student_id = auth.uid());

-- System can insert recommendations (via service role)
-- Teachers can view all recommendations
CREATE POLICY "Teachers can view all recommendations"
  ON public.adaptive_recommendations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- COMPETITIONS TABLE POLICIES
-- ============================================

-- Everyone can view active competitions
CREATE POLICY "Everyone can view competitions"
  ON public.competitions FOR SELECT
  USING (true);

-- Teachers can create competitions
CREATE POLICY "Teachers can create competitions"
  ON public.competitions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- Teachers can update competitions
CREATE POLICY "Teachers can update competitions"
  ON public.competitions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- Teachers can delete competitions
CREATE POLICY "Teachers can delete competitions"
  ON public.competitions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- TEAMS TABLE POLICIES
-- ============================================

-- Everyone can view teams in their competitions
CREATE POLICY "Everyone can view teams"
  ON public.teams FOR SELECT
  USING (true);

-- Teachers can create teams
CREATE POLICY "Teachers can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- TEAM MEMBERS TABLE POLICIES
-- ============================================

-- Everyone can view team members
CREATE POLICY "Everyone can view team members"
  ON public.team_members FOR SELECT
  USING (true);

-- Students can join teams (insert their own membership)
CREATE POLICY "Students can join teams"
  ON public.team_members FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students can leave teams (delete their own membership)
CREATE POLICY "Students can leave teams"
  ON public.team_members FOR DELETE
  USING (student_id = auth.uid());

-- Teachers can manage team members
CREATE POLICY "Teachers can manage team members"
  ON public.team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- TEAM SCORES TABLE POLICIES
-- ============================================

-- Everyone can view team scores
CREATE POLICY "Everyone can view team scores"
  ON public.team_scores FOR SELECT
  USING (true);

-- System updates scores (via triggers or service role)
-- Teachers can manually update scores if needed
CREATE POLICY "Teachers can update team scores"
  ON public.team_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'editor')
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is a teacher
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is a student
CREATE OR REPLACE FUNCTION is_student()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'student'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
