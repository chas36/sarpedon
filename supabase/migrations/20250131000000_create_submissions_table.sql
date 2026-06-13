-- Create submissions table for tracking student progress
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX idx_submissions_level_id ON public.submissions(level_id);
CREATE INDEX idx_submissions_user_level ON public.submissions(user_id, level_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (используем JWT claims вместо EXISTS для избежания infinite recursion)

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions"
  ON public.submissions
  FOR SELECT
  USING (
    auth.uid() = user_id AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'student'
  );

-- Students can insert their own submissions
CREATE POLICY "Students can create own submissions"
  ON public.submissions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'student'
  );

-- Students can update their own submissions
CREATE POLICY "Students can update own submissions"
  ON public.submissions
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'student'
  );

-- Teachers and editors can view all submissions
CREATE POLICY "Teachers can view all submissions"
  ON public.submissions
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'editor')
  );

-- Teachers and editors can update all submissions (for grading)
CREATE POLICY "Teachers can update all submissions"
  ON public.submissions
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'editor')
  );

-- Add comment for documentation
COMMENT ON TABLE public.submissions IS 'Stores student code submissions and their progress on levels';
COMMENT ON COLUMN public.submissions.status IS 'Submission status: pending (submitted but not tested), passed (tests passed), failed (tests failed)';
COMMENT ON COLUMN public.submissions.completed_at IS 'Timestamp when submission passed all tests';
