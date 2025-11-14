-- ============================================
-- ИСПРАВЛЕНИЕ V2: Учителя не видят учеников
-- ============================================
-- Проблема: После удаления проблемной политики учителя могут видеть
-- только свой профиль, но не могут видеть учеников.
--
-- Решение: Добавить политику для учителей БЕЗ удаления функции

-- ============================================
-- Шаг 1: Проверить, что функция существует
-- ============================================

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'check_user_role'
        AND p.prosecdef = true
    )
    THEN '✅ Функция check_user_role уже существует'
    ELSE '❌ ОШИБКА: Функция не существует! Сначала выполните fix_rls_circular_dependency_v2.sql'
  END as function_status;

-- Если функции нет, создаем её (только если не существует)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'check_user_role'
  ) THEN
    -- Создаем функцию
    CREATE FUNCTION public.check_user_role(user_id UUID, required_roles TEXT[])
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    STABLE
    AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = ANY(required_roles)
      );
    END;
    $func$;

    -- Даем права
    GRANT EXECUTE ON FUNCTION public.check_user_role(UUID, TEXT[]) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.check_user_role(UUID, TEXT[]) TO anon;

    RAISE NOTICE 'Функция check_user_role создана';
  ELSE
    RAISE NOTICE 'Функция check_user_role уже существует, пропускаем создание';
  END IF;
END $$;

SELECT '✅ Шаг 1: Функция проверена' as step_1;

-- ============================================
-- Шаг 2: Удалить проблемную политику если есть
-- ============================================

DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;

SELECT '✅ Шаг 2: Проблемная политика удалена' as step_2;

-- ============================================
-- Шаг 3: Добавить политику для учителей
-- ============================================

-- Удаляем старую версию если есть
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;

-- Создаем новую политику: учителя могут видеть учеников
CREATE POLICY "Teachers can view student profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Разрешаем если это ученик И текущий пользователь - учитель/редактор
    role = 'student' AND
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

SELECT '✅ Шаг 3: Политика "Teachers can view student profiles" создана' as step_3;

-- ============================================
-- Шаг 4: Убедиться что базовая политика есть
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

SELECT '✅ Шаг 4: Базовая политика "Users can view own profile" восстановлена' as step_4;

-- ============================================
-- Шаг 5: Добавить политики для обновления профилей
-- ============================================

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

SELECT '✅ Шаг 5: Политики UPDATE и INSERT созданы' as step_5;

-- ============================================
-- Шаг 6: Перезагрузить схему
-- ============================================

NOTIFY pgrst, 'reload schema';

SELECT '✅ Шаг 6: Схема перезагружена' as step_6;

-- ============================================
-- ПРОВЕРКА
-- ============================================

SELECT '═══════════════════════════════════════' as separator;
SELECT '📋 ТЕКУЩИЕ ПОЛИТИКИ НА profiles:' as check;

SELECT
  policyname,
  cmd as operation,
  CASE
    WHEN policyname = 'Users can view own profile' THEN '✅ Каждый видит свой профиль'
    WHEN policyname = 'Teachers can view student profiles' THEN '✅ Учителя видят учеников'
    WHEN policyname = 'Users can update own profile' THEN '✅ Каждый может обновить свой профиль'
    WHEN policyname = 'Users can insert own profile' THEN '✅ Создание профиля при регистрации'
    WHEN policyname = 'Teachers can view all profiles' THEN '❌ ПРОБЛЕМНАЯ! Должна быть удалена!'
    ELSE '⚠️ ' || policyname
  END as description
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT '═══════════════════════════════════════' as separator;

-- Финальная проверка
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles'
        AND policyname = 'Teachers can view all profiles'
    )
    THEN '❌ ОШИБКА: Проблемная политика все еще существует!'

    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profiles'
        AND policyname = 'Teachers can view student profiles'
    )
    THEN '❌ ОШИБКА: Политика "Teachers can view student profiles" не создана!'

    WHEN NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'check_user_role'
        AND p.prosecdef = true
    )
    THEN '❌ ОШИБКА: Функция check_user_role не существует или без SECURITY DEFINER!'

    ELSE '✅✅✅ ВСЕ ИСПРАВЛЕНО! Обновите страницу - ученики должны появиться!'
  END as final_status;

SELECT '═══════════════════════════════════════' as separator;
