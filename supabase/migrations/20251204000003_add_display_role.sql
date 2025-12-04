-- Drop existing CHECK constraint on role
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new CHECK constraint including 'display' role
ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('teacher', 'student', 'editor', 'display'));

-- Add optional assigned_class column for display accounts
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS assigned_class TEXT;

-- Add comment
COMMENT ON COLUMN profiles.assigned_class IS
'Optional: pre-assigned class for display accounts to auto-select on login';
