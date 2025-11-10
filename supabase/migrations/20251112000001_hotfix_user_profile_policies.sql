-- Hotfix: Add back critical user profile RLS policies
-- These were accidentally removed in 20251112000000_separate_editor_permissions.sql

-- Users can view their own profile (CRITICAL!)
CREATE POLICY IF NOT EXISTS "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
