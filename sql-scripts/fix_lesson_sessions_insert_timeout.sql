-- ============================================
-- ИСПРАВЛЕНИЕ TIMEOUT ПРИ СОЗДАНИИ УРОКА
-- ============================================
-- Проблема: Политика "Teachers can manage own lessons" (FOR ALL)
-- проверяет teacher_id = auth.uid() при INSERT, но поле ещё не установлено
--
-- Решение:
-- 1. Удалить политику FOR ALL
-- 2. Создать раздельные политики (INSERT без проверки teacher_id)
-- 3. Добавить trigger для автоматической установки teacher_id
-- ============================================

-- Убедимся что функция check_user_role существует
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_user_role'
      AND p.prosecdef = true
  ) THEN
    RAISE EXCEPTION '❌ Функция check_user_role не существует! Сначала примените APPLY_THIS_FIX_ALL_RLS_ISSUES.sql';
  END IF;
END $$;

-- ============================================
-- ШАГ 1: Удалить проблемную политику FOR ALL
-- ============================================

DROP POLICY IF EXISTS "Teachers can manage own lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers and editors can view all lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Students can view own class lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can insert lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can view all lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can update own lessons" ON public.lesson_sessions;
DROP POLICY IF EXISTS "Teachers can delete own lessons" ON public.lesson_sessions;

SELECT '✅ Старые политики удалены' as status;

-- ============================================
-- ШАГ 2: Создать trigger для установки teacher_id
-- ============================================

-- Функция для установки teacher_id
CREATE OR REPLACE FUNCTION public.set_lesson_teacher_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Устанавливаем teacher_id = текущий пользователь
  IF NEW.teacher_id IS NULL THEN
    NEW.teacher_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Удаляем старый trigger если есть
DROP TRIGGER IF EXISTS set_lesson_teacher_id_trigger ON public.lesson_sessions;

-- Создаём trigger BEFORE INSERT
CREATE TRIGGER set_lesson_teacher_id_trigger
  BEFORE INSERT ON public.lesson_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lesson_teacher_id();

SELECT '✅ Trigger set_lesson_teacher_id создан' as status;

-- ============================================
-- ШАГ 3: Создать правильные RLS политики
-- ============================================

-- INSERT: Учителя могут создавать уроки (teacher_id установится автоматически)
CREATE POLICY "Teachers can insert lessons"
  ON public.lesson_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

-- SELECT: Учителя и редакторы могут видеть все уроки
CREATE POLICY "Teachers can view all lessons"
  ON public.lesson_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.check_user_role(auth.uid(), ARRAY['teacher', 'editor'])
  );

-- SELECT: Студенты могут видеть уроки своего класса
CREATE POLICY "Students can view own class lessons"
  ON public.lesson_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'student'
        AND class = lesson_sessions.class
    )
  );

-- UPDATE: Учителя могут обновлять свои уроки
CREATE POLICY "Teachers can update own lessons"
  ON public.lesson_sessions
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid() AND
    public.check_user_role(auth.uid(), ARRAY['teacher'])
  )
  WITH CHECK (
    teacher_id = auth.uid() AND
    public.check_user_role(auth.uid(), ARRAY['teacher'])
  );

-- DELETE: Учителя могут удалять свои уроки
CREATE POLICY "Teachers can delete own lessons"
  ON public.lesson_sessions
  FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid() AND
    public.check_user_role(auth.uid(), ARRAY['teacher'])
  );

SELECT '✅ Новые политики lesson_sessions созданы' as status;

-- ============================================
-- ШАГ 4: Перезагрузить схему PostgREST
-- ============================================

NOTIFY pgrst, 'reload schema';

SELECT '✅ Схема PostgREST перезагружена' as status;

-- ============================================
-- ИТОГОВАЯ ПРОВЕРКА
-- ============================================

SELECT '═══════════════════════════════════════════════' as separator;
SELECT '✅ СОЗДАНИЕ УРОКОВ ИСПРАВЛЕНО!' as final_status;
SELECT '═══════════════════════════════════════════════' as separator;

-- Проверяем trigger
SELECT
  '✅ Trigger set_lesson_teacher_id' as check,
  'Автоматически устанавливает teacher_id при INSERT' as description
WHERE EXISTS (
  SELECT 1 FROM pg_trigger
  WHERE tgname = 'set_lesson_teacher_id_trigger'
);

-- Проверяем политики
SELECT
  'lesson_sessions' as table_name,
  COUNT(*) as policy_count,
  string_agg(policyname, E'\n  - ' ORDER BY policyname) as policies
FROM pg_policies
WHERE tablename = 'lesson_sessions'
GROUP BY tablename;

-- Проверяем что проблемной политики НЕТ
SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'lesson_sessions'
        AND policyname = 'Teachers can manage own lessons'
    )
    THEN '✅ Проблемная политика "Teachers can manage own lessons" (FOR ALL) удалена'
    ELSE '❌ ПРОБЛЕМА: Проблемная политика все еще существует!'
  END as critical_check;
