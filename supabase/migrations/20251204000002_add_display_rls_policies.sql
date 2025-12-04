-- RLS Policies for Display Role

-- Students: Display can view all students
CREATE POLICY "Display can view students"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'display'
    AND role = 'student'
  );

-- Levels: Display can view all levels
CREATE POLICY "Display can view levels"
  ON levels FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');

-- Submissions: Display can view all submissions
CREATE POLICY "Display can view submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');

-- Level Progress: Display can view all progress
CREATE POLICY "Display can view level progress"
  ON level_progress FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');

-- Lesson Sessions: Display can view all sessions
CREATE POLICY "Display can view lesson sessions"
  ON lesson_sessions FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');

-- Lesson Grades: Display can view all grades
CREATE POLICY "Display can view lesson grades"
  ON lesson_grades FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'display');
