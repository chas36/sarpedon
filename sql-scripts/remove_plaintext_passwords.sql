-- ============================================
-- Remove Plaintext Password Storage
-- ============================================
-- SECURITY FIX: Remove generated_password field from profiles table
-- Passwords should NEVER be stored in plaintext!

-- ============================================
-- STEP 1: Check if column exists
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'generated_password';

-- If the above query returns a row, the column exists and must be removed!

-- ============================================
-- STEP 2: Remove the column
-- ============================================
-- WARNING: This is irreversible! Make sure you have a backup!
-- Any existing plaintext passwords will be lost (which is good for security)

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS generated_password;

-- ============================================
-- STEP 3: Verify removal
-- ============================================
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- generated_password should NOT appear in the list!

-- ============================================
-- STEP 4: Check for any other password fields
-- ============================================
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%password%'
    OR column_name LIKE '%pwd%'
    OR column_name LIKE '%pass%'
  )
  AND table_name != 'auth'  -- Auth tables are managed by Supabase
ORDER BY table_name, column_name;

-- Review the results - there should be NO plaintext password columns!

-- ============================================
-- STEP 5: Success message
-- ============================================
SELECT
  '✅ Plaintext password column removed successfully!' as status,
  'Passwords are now only stored securely in Supabase Auth' as note;
