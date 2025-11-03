-- Add full_name field to profiles table
-- This field stores the concatenated first_name and last_name for easier querying

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Populate existing profiles with concatenated names
UPDATE public.profiles
SET full_name = first_name || ' ' || last_name
WHERE full_name IS NULL;

-- Create index for faster full-text search on names
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- Add comment
COMMENT ON COLUMN public.profiles.full_name IS
  'Full name of the user (first_name + last_name) for display and search purposes';
