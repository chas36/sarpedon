-- ============================================
-- Update target_skills for existing levels
-- ============================================

-- Примеры обновления уровней с правильным JSONB типом

-- Циклы
UPDATE levels
SET target_skills = '["loops", "variables"]'::jsonb
WHERE title ILIKE '%цикл%' OR title ILIKE '%loop%';

-- Условия
UPDATE levels
SET target_skills = '["conditionals", "operators"]'::jsonb
WHERE title ILIKE '%условие%' OR title ILIKE '%if%' OR title ILIKE '%условн%';

-- Функции
UPDATE levels
SET target_skills = '["functions", "variables"]'::jsonb
WHERE title ILIKE '%функци%' OR title ILIKE '%function%';

-- Массивы
UPDATE levels
SET target_skills = '["arrays", "loops"]'::jsonb
WHERE title ILIKE '%массив%' OR title ILIKE '%array%' OR title ILIKE '%список%';

-- Строки
UPDATE levels
SET target_skills = '["strings", "operators"]'::jsonb
WHERE title ILIKE '%строк%' OR title ILIKE '%string%';

-- Ввод/вывод
UPDATE levels
SET target_skills = '["io", "syntax"]'::jsonb
WHERE title ILIKE '%ввод%' OR title ILIKE '%вывод%' OR title ILIKE '%input%' OR title ILIKE '%print%';

-- Базовый синтаксис
UPDATE levels
SET target_skills = '["syntax", "variables"]'::jsonb
WHERE difficulty <= 2 AND target_skills IS NULL;

-- Алгоритмы (сложные задачи)
UPDATE levels
SET target_skills = '["algorithms", "loops", "conditionals"]'::jsonb
WHERE difficulty >= 8 AND target_skills IS NULL;

-- Отладка
UPDATE levels
SET target_skills = '["debugging", "syntax"]'::jsonb
WHERE title ILIKE '%отладк%' OR title ILIKE '%ошибк%' OR title ILIKE '%debug%';

-- Объекты/структуры данных
UPDATE levels
SET target_skills = '["objects", "variables"]'::jsonb
WHERE title ILIKE '%объект%' OR title ILIKE '%словар%' OR title ILIKE '%dict%';

-- ============================================
-- Проверка результата
-- ============================================
SELECT
  id,
  title,
  target_skills,
  difficulty
FROM levels
WHERE target_skills IS NOT NULL
ORDER BY difficulty, title;

-- ============================================
-- Статистика покрытия навыков
-- ============================================
SELECT
  COUNT(*) as total_levels,
  COUNT(target_skills) as levels_with_skills,
  COUNT(*) - COUNT(target_skills) as levels_without_skills
FROM levels;
