-- Add email field to profiles table if it doesn't exist

-- Check if email column exists and add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;

        -- Add index for faster login lookups
        CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

        -- Add comment
        COMMENT ON COLUMN profiles.email IS 'Auto-generated email for Supabase Auth (users login with generated_login)';
    END IF;
END $$;
