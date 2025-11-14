-- ============================================
-- Проверка JWT токена текущего пользователя
-- ============================================
-- Этот скрипт покажет, что находится в вашем JWT токене

-- ВАЖНО: Выполните этот скрипт НАПРЯМУЮ из приложения, а не из SQL Editor!
-- Можно добавить временный console.log в код

-- Для выполнения из SQL Editor (симуляция):
SELECT
  'JWT TOKEN CONTENT' as section,
  auth.uid() as user_id,
  auth.jwt() as full_jwt,
  auth.jwt() -> 'email' as email,
  auth.jwt() -> 'user_metadata' as user_metadata,
  auth.jwt() -> 'user_metadata' ->> 'role' as role_from_jwt,
  auth.jwt() -> 'app_metadata' as app_metadata,
  auth.jwt() -> 'app_metadata' ->> 'role' as role_from_app_metadata;

-- Сравнение с профилем
SELECT
  'PROFILE VS JWT' as section,
  p.role as role_in_database,
  auth.jwt() -> 'user_metadata' ->> 'role' as role_in_jwt_user_metadata,
  auth.jwt() -> 'app_metadata' ->> 'role' as role_in_jwt_app_metadata,
  CASE
    WHEN p.role = (auth.jwt() -> 'user_metadata' ->> 'role') THEN '✅ MATCH (user_metadata)'
    WHEN p.role = (auth.jwt() -> 'app_metadata' ->> 'role') THEN '✅ MATCH (app_metadata)'
    ELSE '❌ NO MATCH - JWT токен не содержит правильную роль!'
  END as status
FROM profiles p
WHERE p.id = auth.uid();

-- Проверка RLS политик
SELECT
  'RLS POLICY CHECK' as section,
  policyname,
  CASE
    WHEN qual LIKE '%user_metadata%' THEN 'Uses user_metadata'
    WHEN qual LIKE '%app_metadata%' THEN 'Uses app_metadata'
    ELSE 'Custom condition'
  END as metadata_source
FROM pg_policies
WHERE tablename = 'lesson_sessions'
  AND cmd = 'INSERT';
