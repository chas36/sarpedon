-- ============================================
-- Lesson Sessions and Grades System
-- ============================================
-- This migration adds functionality for teachers to track lessons,
-- monitor student activity during lessons, and assign grades

-- ============================================
-- LESSON SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.lesson_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  topic TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_lesson_sessions_teacher ON public.lesson_sessions(teacher_id);
CREATE INDEX idx_lesson_sessions_class ON public.lesson_sessions(class);
CREATE INDEX idx_lesson_sessions_date ON public.lesson_sessions(date);
CREATE INDEX idx_lesson_sessions_status ON public.lesson_sessions(status);
CREATE INDEX idx_lesson_sessions_class_date ON public.lesson_sessions(class, date);

-- ============================================
-- LESSON GRADES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.lesson_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_session_id UUID NOT NULL REFERENCES public.lesson_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_session_id, student_id)
);

-- Indexes for better performance
CREATE INDEX idx_lesson_grades_session ON public.lesson_grades(lesson_session_id);
CREATE INDEX idx_lesson_grades_student ON public.lesson_grades(student_id);
CREATE INDEX idx_lesson_grades_session_student ON public.lesson_grades(lesson_session_id, student_id);

-- ============================================
-- ADD LESSON_SESSION_ID TO SUBMISSIONS
-- ============================================
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS lesson_session_id UUID REFERENCES public.lesson_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_submissions_lesson_session ON public.submissions(lesson_session_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_lesson_sessions_updated_at
  BEFORE UPDATE ON public.lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_grades_updated_at
  BEFORE UPDATE ON public.lesson_grades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Get Active Lesson for Class
-- ============================================
CREATE OR REPLACE FUNCTION get_active_lesson_for_class(
  p_class TEXT,
  p_teacher_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  class TEXT,
  date DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  topic TEXT,
  description TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.id,
    ls.teacher_id,
    ls.class,
    ls.date,
    ls.start_time,
    ls.end_time,
    ls.topic,
    ls.description,
    ls.status
  FROM public.lesson_sessions ls
  WHERE ls.class = p_class
    AND ls.status = 'active'
    AND (p_teacher_id IS NULL OR ls.teacher_id = p_teacher_id)
  ORDER BY ls.start_time DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get Lesson Activity Statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_lesson_activity(
  p_lesson_session_id UUID
) RETURNS TABLE (
  student_id UUID,
  student_first_name TEXT,
  student_last_name TEXT,
  student_class TEXT,
  total_submissions INTEGER,
  passed_submissions INTEGER,
  failed_submissions INTEGER,
  unique_levels_attempted INTEGER,
  unique_levels_passed INTEGER,
  success_rate NUMERIC,
  last_activity TIMESTAMPTZ,
  current_grade INTEGER,
  grade_comment TEXT,
  suggested_grade INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS student_id,
    p.first_name AS student_first_name,
    p.last_name AS student_last_name,
    p.class AS student_class,
    COUNT(s.id)::INTEGER AS total_submissions,
    COUNT(CASE WHEN s.status = 'passed' THEN 1 END)::INTEGER AS passed_submissions,
    COUNT(CASE WHEN s.status = 'failed' THEN 1 END)::INTEGER AS failed_submissions,
    COUNT(DISTINCT s.level_id)::INTEGER AS unique_levels_attempted,
    COUNT(DISTINCT CASE WHEN s.status = 'passed' THEN s.level_id END)::INTEGER AS unique_levels_passed,
    CASE
      WHEN COUNT(s.id) > 0 THEN
        ROUND((COUNT(CASE WHEN s.status = 'passed' THEN 1 END)::NUMERIC / COUNT(s.id)::NUMERIC) * 100, 1)
      ELSE 0
    END AS success_rate,
    MAX(s.submitted_at) AS last_activity,
    lg.grade AS current_grade,
    lg.comment AS grade_comment,
    -- Suggested grade based on activity
    CASE
      WHEN COUNT(DISTINCT CASE WHEN s.status = 'passed' THEN s.level_id END) >= 5 AND
           (COUNT(CASE WHEN s.status = 'passed' THEN 1 END)::NUMERIC / NULLIF(COUNT(s.id), 0)) >= 0.8
      THEN 5
      WHEN COUNT(DISTINCT CASE WHEN s.status = 'passed' THEN s.level_id END) >= 4 AND
           (COUNT(CASE WHEN s.status = 'passed' THEN 1 END)::NUMERIC / NULLIF(COUNT(s.id), 0)) >= 0.7
      THEN 4
      WHEN COUNT(DISTINCT CASE WHEN s.status = 'passed' THEN s.level_id END) >= 3 AND
           (COUNT(CASE WHEN s.status = 'passed' THEN 1 END)::NUMERIC / NULLIF(COUNT(s.id), 0)) >= 0.5
      THEN 3
      WHEN COUNT(DISTINCT CASE WHEN s.status = 'passed' THEN s.level_id END) >= 1
      THEN 2
      ELSE NULL
    END::INTEGER AS suggested_grade
  FROM public.lesson_sessions ls
  JOIN public.profiles p ON p.class = ls.class AND p.role = 'student'
  LEFT JOIN public.submissions s ON s.user_id = p.id AND s.lesson_session_id = p_lesson_session_id
  LEFT JOIN public.lesson_grades lg ON lg.lesson_session_id = p_lesson_session_id AND lg.student_id = p.id
  WHERE ls.id = p_lesson_session_id
  GROUP BY p.id, p.first_name, p.last_name, p.class, lg.grade, lg.comment
  ORDER BY student_last_name, student_first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Auto-assign submissions to active lesson
-- ============================================
-- This function automatically assigns new submissions to active lessons
CREATE OR REPLACE FUNCTION auto_assign_submission_to_lesson()
RETURNS TRIGGER AS $$
DECLARE
  v_student_class TEXT;
  v_active_lesson_id UUID;
BEGIN
  -- Get student's class
  SELECT class INTO v_student_class
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Find active lesson for this class
  IF v_student_class IS NOT NULL THEN
    SELECT id INTO v_active_lesson_id
    FROM public.lesson_sessions
    WHERE class = v_student_class
      AND status = 'active'
      AND start_time <= NOW()
      AND (end_time IS NULL OR end_time >= NOW())
    ORDER BY start_time DESC
    LIMIT 1;

    -- Assign submission to active lesson if found
    IF v_active_lesson_id IS NOT NULL THEN
      NEW.lesson_session_id := v_active_lesson_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_assign_lesson_to_submission
  BEFORE INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_submission_to_lesson();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_grades ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own lessons
CREATE POLICY "Teachers can manage own lessons"
  ON public.lesson_sessions
  FOR ALL
  USING (
    auth.uid() = teacher_id AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher'
  )
  WITH CHECK (
    auth.uid() = teacher_id AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher'
  );

-- Teachers can view all lessons (for collaboration)
CREATE POLICY "Teachers can view all lessons"
  ON public.lesson_sessions
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'editor')
  );

-- Students can view lessons for their class
CREATE POLICY "Students can view own class lessons"
  ON public.lesson_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'student'
        AND class = lesson_sessions.class
    )
  );

-- Teachers can manage grades for their lessons
CREATE POLICY "Teachers can manage grades for own lessons"
  ON public.lesson_grades
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.lesson_sessions
      WHERE id = lesson_grades.lesson_session_id
        AND teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lesson_sessions
      WHERE id = lesson_grades.lesson_session_id
        AND teacher_id = auth.uid()
    )
  );

-- Students can view their own grades
CREATE POLICY "Students can view own grades"
  ON public.lesson_grades
  FOR SELECT
  USING (
    auth.uid() = student_id AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'student'
  );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.lesson_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_sessions TO authenticated;
GRANT SELECT ON public.lesson_grades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_grades TO authenticated;

GRANT EXECUTE ON FUNCTION get_active_lesson_for_class TO authenticated;
GRANT EXECUTE ON FUNCTION get_lesson_activity TO authenticated;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE public.lesson_sessions IS 'Stores lesson sessions for tracking student activity during class';
COMMENT ON TABLE public.lesson_grades IS 'Stores grades assigned by teachers for lesson sessions';
COMMENT ON COLUMN public.lesson_sessions.status IS 'active: lesson in progress, completed: lesson finished, cancelled: lesson cancelled';
COMMENT ON COLUMN public.lesson_grades.grade IS 'Grade on 5-point scale (1-5)';
COMMENT ON FUNCTION get_active_lesson_for_class IS 'Returns the currently active lesson for a given class';
COMMENT ON FUNCTION get_lesson_activity IS 'Returns detailed activity statistics for all students in a lesson';
