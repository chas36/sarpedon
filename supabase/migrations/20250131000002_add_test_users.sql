-- Create test users for development
-- Note: In production, users should register through the application
--
-- RECOMMENDED: Create users through Supabase Dashboard instead:
-- 1. Go to Authentication → Users in Supabase Dashboard
-- 2. Click "Add user" → "Create new user"
-- 3. Add student@test.com with password student123
--    - After creating, go to "User Management" and add to raw_user_meta_data: {"role": "student"}
-- 4. Add teacher@test.com with password teacher123
--    - After creating, go to "User Management" and add to raw_user_meta_data: {"role": "teacher"}
--
-- This migration is intentionally left empty as directly inserting into auth.users
-- can cause issues with Supabase's authentication system. Use the dashboard or
-- authentication API instead.

-- No-op to make migration valid
SELECT 1;
