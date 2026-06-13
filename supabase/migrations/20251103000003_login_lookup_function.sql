-- Remove the too-permissive policy
DROP POLICY IF EXISTS "Allow login lookup by generated_login" ON public.profiles;

-- Create a secure function to lookup email by generated_login
-- SECURITY DEFINER allows it to bypass RLS
CREATE OR REPLACE FUNCTION public.lookup_email_by_login(login_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Only return email, nothing else
  SELECT email INTO user_email
  FROM profiles
  WHERE generated_login = login_input
  LIMIT 1;

  RETURN user_email;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.lookup_email_by_login(TEXT) TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION public.lookup_email_by_login(TEXT) IS
  'Securely looks up email by generated_login for login purposes. Bypasses RLS using SECURITY DEFINER.';
