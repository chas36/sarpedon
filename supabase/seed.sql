-- Sarpedon Educational Platform
-- Seed Data for Development and Testing

-- Note: This seed data is for development only
-- In production, users will be created through the teacher panel

-- ============================================
-- SEED PROFILES
-- ============================================
-- Note: These would normally be created through Supabase Auth
-- This is示例 data structure only

-- Sample Teacher
-- INSERT INTO auth.users (id, email) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'teacher@sarpedon.local');

INSERT INTO public.profiles (id, first_name, last_name, role, generated_login) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Мария', 'Преподавателева', 'teacher', 'teacher001');

-- Sample Students
-- INSERT INTO auth.users (id, email) VALUES
--   ('00000000-0000-0000-0000-000000000101', 'student1@sarpedon.local'),
--   ('00000000-0000-0000-0000-000000000102', 'student2@sarpedon.local'),
--   ('00000000-0000-0000-0000-000000000103', 'student3@sarpedon.local');

INSERT INTO public.profiles (id, first_name, last_name, role, class, generated_login) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Иван', 'Студентов', 'student', '7А', 'student001'),
  ('00000000-0000-0000-0000-000000000102', 'Анна', 'Ученикова', 'student', '7А', 'student002'),
  ('00000000-0000-0000-0000-000000000103', 'Петр', 'Школьников', 'student', '7Б', 'student003');

-- ============================================
-- SEED LEVELS
-- ============================================

-- Level 1: Hello World (Easy)
INSERT INTO public.levels (
  id, title, description, educational_context, reference_solution,
  test_cases, hints, difficulty, order_index, topic, language,
  target_skills, is_remedial, created_by
) VALUES (
  '00000000-0000-0000-0001-000000000001',
  'Привет, мир!',
  'Напишите программу, которая выводит "Hello, World!" на экран',
  'Это ваш первый шаг в программирование. Функция print() выводит текст на экран.',
  'print("Hello, World!")',
  '[
    {"input": "", "expected_output": "Hello, World!", "description": "Выводит Hello, World!"}
  ]'::jsonb,
  '["Используйте функцию print()", "Не забудьте кавычки вокруг текста"]'::jsonb,
  'easy',
  1,
  'Основы Python',
  'python',
  '["print", "strings"]'::jsonb,
  false,
  '00000000-0000-0000-0000-000000000001'
);

-- Level 2: Переменные (Easy)
INSERT INTO public.levels (
  id, title, description, educational_context, reference_solution,
  test_cases, hints, difficulty, order_index, topic, language,
  target_skills, is_remedial, created_by
) VALUES (
  '00000000-0000-0000-0001-000000000002',
  'Переменные',
  'Создайте переменную name со значением "Sarpedon" и выведите её',
  'Переменные хранят данные. Для создания переменной используйте знак равенства (=).',
  'name = "Sarpedon"\nprint(name)',
  '[
    {"input": "", "expected_output": "Sarpedon", "description": "Выводит значение переменной"}
  ]'::jsonb,
  '["Сначала создайте переменную: name = ...", "Затем выведите её: print(name)"]'::jsonb,
  'easy',
  2,
  'Основы Python',
  'python',
  '["variables", "print"]'::jsonb,
  false,
  '00000000-0000-0000-0000-000000000001'
);

-- Level 3: Простая арифметика (Easy)
INSERT INTO public.levels (
  id, title, description, educational_context, reference_solution,
  test_cases, hints, difficulty, order_index, topic, language,
  target_skills, is_remedial, created_by
) VALUES (
  '00000000-0000-0000-0001-000000000003',
  'Калькулятор',
  'Создайте программу, которая складывает два числа: 15 и 27',
  'Python может выполнять математические операции: +, -, *, /',
  'result = 15 + 27\nprint(result)',
  '[
    {"input": "", "expected_output": "42", "description": "Результат сложения"}
  ]'::jsonb,
  '["Используйте оператор +", "Сохраните результат в переменную"]'::jsonb,
  'easy',
  3,
  'Арифметика',
  'python',
  '["arithmetic", "variables"]'::jsonb,
  false,
  '00000000-0000-0000-0000-000000000001'
);

-- Level 4: Условия (Medium)
INSERT INTO public.levels (
  id, title, description, educational_context, reference_solution,
  test_cases, hints, difficulty, order_index, topic, language,
  target_skills, is_remedial, created_by
) VALUES (
  '00000000-0000-0000-0001-000000000004',
  'Проверка возраста',
  'Напишите программу, которая проверяет, больше ли число 18 или нет. Если да - выведите "Взрослый", если нет - "Ребёнок"',
  'Условные операторы (if/else) позволяют программе принимать решения.',
  'age = 20\nif age >= 18:\n    print("Взрослый")\nelse:\n    print("Ребёнок")',
  '[
    {"input": "", "expected_output": "Взрослый", "description": "Для возраста 20"}
  ]'::jsonb,
  '["Используйте if age >= 18:", "Не забудьте отступы (4 пробела)"]'::jsonb,
  'medium',
  4,
  'Условные операторы',
  'python',
  '["conditionals", "if-else", "comparison"]'::jsonb,
  false,
  '00000000-0000-0000-0000-000000000001'
);

-- Level 5: Циклы (Medium)
INSERT INTO public.levels (
  id, title, description, educational_context, reference_solution,
  test_cases, hints, difficulty, order_index, topic, language,
  target_skills, is_remedial, created_by
) VALUES (
  '00000000-0000-0000-0001-000000000005',
  'Считаем до 5',
  'Напишите программу, которая выводит числа от 1 до 5 (каждое на новой строке)',
  'Циклы позволяют повторять действия. Цикл for перебирает элементы.',
  'for i in range(1, 6):\n    print(i)',
  '[
    {"input": "", "expected_output": "1\\n2\\n3\\n4\\n5", "description": "Числа от 1 до 5"}
  ]'::jsonb,
  '["Используйте for i in range(1, 6):", "range(1, 6) даёт числа от 1 до 5"]'::jsonb,
  'medium',
  5,
  'Циклы',
  'python',
  '["loops", "for", "range"]'::jsonb,
  false,
  '00000000-0000-0000-0000-000000000001'
);

-- ============================================
-- SEED COMPETITION
-- ============================================
INSERT INTO public.competitions (
  id, name, description, start_date, end_date,
  level_ids, status, created_by
) VALUES (
  '00000000-0000-0000-0002-000000000001',
  'Первое соревнование 7 класса',
  'Командное соревнование для учеников 7 класса',
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '7 days',
  '["00000000-0000-0000-0001-000000000001", "00000000-0000-0000-0001-000000000002", "00000000-0000-0000-0001-000000000003"]'::jsonb,
  'active',
  '00000000-0000-0000-0000-000000000001'
);

-- ============================================
-- SEED TEAMS
-- ============================================
INSERT INTO public.teams (id, competition_id, name) VALUES
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000001', 'Команда Альфа'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000001', 'Команда Бета');

-- ============================================
-- SEED TEAM MEMBERS
-- ============================================
INSERT INTO public.team_members (team_id, student_id) VALUES
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000103');

-- ============================================
-- COMMENTS
-- ============================================
-- Note: In production, you'll need to:
-- 1. Create actual auth.users entries through Supabase Auth
-- 2. Link profiles to those auth.users
-- 3. Set up proper passwords through the teacher panel
-- 4. This seed data is for development/testing purposes only
