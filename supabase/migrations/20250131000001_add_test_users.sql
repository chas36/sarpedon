-- Create test users for development
-- Note: In production, users should register through the application
--
-- RECOMMENDED: Create users through Supabase Dashboard instead:
-- 1. Go to Authentication → Users
-- 2. Click "Add user" → "Create new user"
-- 3. Add student@test.com with password student123, metadata: {"role": "student"}
-- 4. Add teacher@test.com with password teacher123, metadata: {"role": "teacher"}
--
-- This SQL is kept for reference but may not work due to auth schema restrictions

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Alternative: Check if users exist first
DO $$
DECLARE
  student_id uuid;
  teacher_id uuid;
BEGIN
  -- Check if student exists
  SELECT id INTO student_id FROM auth.users WHERE email = 'student@test.com';

  IF student_id IS NULL THEN
    -- Insert student user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'student@test.com',
      crypt('student123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"student"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO student_id;

    -- Insert identity for student
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      student_id,
      format('{"sub":"%s","email":"%s"}', student_id::text, 'student@test.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  -- Check if teacher exists
  SELECT id INTO teacher_id FROM auth.users WHERE email = 'teacher@test.com';

  IF teacher_id IS NULL THEN
    -- Insert teacher user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'teacher@test.com',
      crypt('teacher123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"teacher"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO teacher_id;

    -- Insert identity for teacher
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      teacher_id,
      format('{"sub":"%s","email":"%s"}', teacher_id::text, 'teacher@test.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );
  END IF;
END $$;
