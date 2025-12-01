-- ============================================
-- ДОБАВЛЕНИЕ ПОЛИТИКИ ДЛЯ УЧИТЕЛЕЙ
-- ============================================
-- Учителя должны видеть профили студентов
-- БЕЗ циркулярной зависимости (используем check_user_role)
-- ============================================

-- Убедимся что функция check_user_role существует
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_user_role'
  ) THEN
    RAISE EXCEPTION 'Функция check_user_role не существует! Сначала примените fix_rls_circular_dependency_v2.sql';
  END IF;
END $$;

-- Удаляем старую политику если она есть
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;

-- Создаем НОВУЮ политику БЕЗ рекурсии
CREATE POLICY "Teachers can view student profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Учителя и редакторы могут видеть всех студентов
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

-- Перезагрузить схему PostgREST
NOTIFY pgrst, 'reload schema';

SELECT '✅ Политика "Teachers can view student profiles" создана' as status;

-- Проверка
SELECT
  'profiles' as table_name,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename = 'profiles'
GROUP BY tablename;
