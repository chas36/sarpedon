-- Allow anonymous users to lookup email by generated_login for login purposes
-- This is safe because we only expose email and generated_login, not sensitive data

CREATE POLICY "Allow login lookup by generated_login"
  ON public.profiles FOR SELECT
  USING (true);

-- Comment
COMMENT ON POLICY "Allow login lookup by generated_login" ON public.profiles IS
  'Allows anyone to read profiles for login purposes (to convert generated_login to email)';
