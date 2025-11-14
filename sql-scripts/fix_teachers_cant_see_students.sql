-- ============================================
-- ИСПРАВЛЕНИЕ: Учителя не видят учеников
-- ============================================
-- Проблема: После удаления проблемной политики учителя могут видеть
-- только свой профиль, но не могут видеть учеников.
--
-- Решение: Создать SECURITY DEFINER функцию и добавить политику,
-- которая позволит учителям видеть учеников БЕЗ циклической зависимости

-- ============================================
-- Шаг 1: Создать функцию проверки роли
-- ============================================

-- Удаляем если существует
DROP FUNCTION IF EXISTS public.check_user_role(UUID, TEXT[]);

-- Создаем функцию с SECURITY DEFINER (обходит RLS)
CREATE FUNCTION public.check_user_role(user_id UUID, required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- ← Это ключевой момент! Функция обходит RLS
SET search_path = public
STABLE
AS $$
BEGIN
  -- Проверяем роль пользователя напрямую
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = ANY(required_roles)
  );
END;
$$;

-- Даем права на выполнение
GRANT EXECUTE ON FUNCTION public.check_user_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_role(UUID, TEXT[]) TO anon;

SELECT '✅ Функция check_user_role создана' as step_1;

-- ============================================
-- Шаг 2: Добавить политику для учителей
-- ============================================

-- Удаляем если существует
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;

-- Учителя могут видеть всех учеников (БЕЗ рекурсии!)
CREATE POLICY "Teachers can view student profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Разрешаем если:
    -- 1. Это ученик (role = 'student')
    -- 2. И текущий пользователь - учитель (проверяем через безопасную функцию)
    role = 'student' AND
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

SELECT '✅ Политика для учителей создана' as step_2;

-- ============================================
-- Шаг 3: Убедиться что базовая политика есть
-- ============================================

-- Каждый может видеть свой профиль
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

SELECT '✅ Базовая политика восстановлена' as step_3;

-- ============================================
-- Шаг 4: Перезагрузить схему
-- ============================================

NOTIFY pgrst, 'reload schema';

SELECT '✅ Схема перезагружена' as step_4;

-- ============================================
-- Проверка
-- ============================================

SELECT '═══════════════════════════════════════' as separator;
SELECT 'ПРОВЕРКА РЕЗУЛЬТАТА:' as check;

-- Показываем все политики на profiles
SELECT
  policyname,
  CASE
    WHEN policyname = 'Users can view own profile' THEN '✅ Базовая политика'
    WHEN policyname = 'Teachers can view student profiles' THEN '✅ Учителя видят учеников'
    ELSE '⚠️ Неизвестная политика'
  END as description
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

SELECT '═══════════════════════════════════════' as separator;

-- Проверяем функцию
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'check_user_role'
        AND p.prosecdef = true
    )
    THEN '✅ Функция check_user_role с SECURITY DEFINER создана'
    ELSE '❌ Функция не создана или без SECURITY DEFINER'
  END as function_check;

SELECT '═══════════════════════════════════════' as separator;
SELECT '✅✅✅ ИСПРАВЛЕНО! Теперь учителя должны видеть учеников!' as final_status;
