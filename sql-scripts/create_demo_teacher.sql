-- Create or refresh a demo teacher account for project presentations.
-- Run in Supabase Dashboard -> SQL Editor after all main migrations.
--
-- Demo credentials:
--   Login:    demo_teacher
--   Email:    demo-teacher@sarpedon.local
--   Password: DemoTeacher123!

DO $$
DECLARE
  demo_user_id UUID;
  conflicting_profile_id UUID;
BEGIN
  SELECT id
  INTO demo_user_id
  FROM auth.users
  WHERE email = 'demo-teacher@sarpedon.local'
  LIMIT 1;

  IF demo_user_id IS NULL THEN
    demo_user_id := '11111111-1111-4111-8111-111111111111';
  END IF;

  SELECT id
  INTO conflicting_profile_id
  FROM public.profiles
  WHERE generated_login = 'demo_teacher'
    AND id <> demo_user_id
  LIMIT 1;

  IF conflicting_profile_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Login demo_teacher is already used by profile %',
      conflicting_profile_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = demo_user_id
  ) THEN
    UPDATE auth.users
    SET
      email = 'demo-teacher@sarpedon.local',
      encrypted_password = crypt('DemoTeacher123!', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      aud = 'authenticated',
      role = 'authenticated',
      raw_app_meta_data = jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email')
      ),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'role', 'teacher'
      ),
      updated_at = NOW()
    WHERE id = demo_user_id;
  ELSE
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id,
      'authenticated',
      'authenticated',
      'demo-teacher@sarpedon.local',
      crypt('DemoTeacher123!', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email')
      ),
      jsonb_build_object('role', 'teacher'),
      '',
      '',
      '',
      '',
      NOW(),
      NOW()
    );
  END IF;

  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    full_name,
    role,
    generated_login,
    email,
    is_editor
  ) VALUES (
    demo_user_id,
    'Демо',
    'Преподаватель',
    'Демо Преподаватель',
    'teacher',
    'demo_teacher',
    'demo-teacher@sarpedon.local',
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    generated_login = EXCLUDED.generated_login,
    email = EXCLUDED.email,
    is_editor = false,
    updated_at = NOW();
END $$;

SELECT
  id,
  email,
  raw_user_meta_data ->> 'role' AS auth_role
FROM auth.users
WHERE email = 'demo-teacher@sarpedon.local';

SELECT
  id,
  first_name,
  last_name,
  role,
  generated_login,
  email,
  is_editor
FROM public.profiles
WHERE generated_login = 'demo_teacher';
