-- Add generated_password field to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS generated_password TEXT;

COMMENT ON COLUMN public.profiles.generated_password IS
  'Password in plain text for teacher display (default = login)';

-- Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classes_name ON public.classes(name);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON public.classes(created_by);

-- Trigger for updated_at
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.classes IS 'Student classes/groups';

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- RLS policy: only teachers can manage classes
CREATE POLICY teacher_manage_classes ON public.classes
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );

-- RLS policies for student management
CREATE POLICY teacher_update_students ON public.profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );

CREATE POLICY teacher_delete_students ON public.profiles
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'teacher'
    )
  );

-- Populate classes from existing student data
INSERT INTO public.classes (name)
SELECT DISTINCT class
FROM public.profiles
WHERE role = 'student' AND class IS NOT NULL
ON CONFLICT (name) DO NOTHING;
