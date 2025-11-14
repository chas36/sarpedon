-- ============================================
-- Проверка RLS политик на таблице profiles
-- ============================================

-- 1. Включен ли RLS на profiles?
SELECT
  'RLS STATUS на profiles' as check,
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- 2. Какие политики есть на profiles?
SELECT
  'ПОЛИТИКИ на profiles' as check,
  policyname,
  cmd as operation,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 3. Тест: может ли текущий пользователь прочитать свой профиль?
DO $$
BEGIN
  PERFORM * FROM public.profiles WHERE id = auth.uid();
  RAISE NOTICE '✅ Пользователь МОЖЕТ читать свой профиль';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE '❌ ОШИБКА: Пользователь НЕ МОЖЕТ читать свой профиль! Это причина 403 ошибки!';
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ОШИБКА: %', SQLERRM;
END $$;

-- 4. Проверка: есть ли политика SELECT для authenticated пользователей?
SELECT
  'ИТОГ' as check,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles'
        AND cmd IN ('SELECT', 'ALL')
        AND (qual LIKE '%auth.uid()%' OR qual LIKE '%authenticated%')
    )
    THEN '❌ НЕТ ПОЛИТИКИ SELECT! Пользователи не могут читать profiles. Нужно добавить политику!'
    ELSE '✅ Политика SELECT существует'
  END as result;
