-- Add email field to profiles table for Supabase Auth integration
-- Users login with generated_login, but Auth requires email

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for faster lookups during login
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Add index for generated_login lookups
CREATE INDEX IF NOT EXISTS idx_profiles_generated_login ON public.profiles(generated_login);

COMMENT ON COLUMN public.profiles.email IS
  'Auto-generated email for Supabase Auth (format: student{timestamp}@test.com). Users login with generated_login.';
