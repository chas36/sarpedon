-- ============================================
-- ИСПРАВЛЕНИЕ: Добавить политику SELECT на profiles
-- ============================================
-- Проблема: RLS политики lesson_sessions используют EXISTS запрос к profiles,
-- но если на profiles нет политики SELECT, пользователь не может прочитать
-- свой профиль, и EXISTS возвращает пустой результат.

-- Решение: Добавить политику, позволяющую пользователям читать свой профиль

-- Сначала удалим старую политику если она есть (на случай конфликта имен)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Создаем новую политику
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Также добавим политику для чтения всех профилей для учителей (полезно для lesson_sessions)
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;

CREATE POLICY "Teachers can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'editor')
    )
  );

-- Перезагрузка схемы
NOTIFY pgrst, 'reload schema';

SELECT '✅ Политики на profiles обновлены!' as status;
SELECT 'Теперь пользователи могут читать свой профиль, и EXISTS запросы в lesson_sessions RLS будут работать.' as explanation;
SELECT 'Обновите страницу приложения (Ctrl+F5) и попробуйте создать урок.' as next_step;
