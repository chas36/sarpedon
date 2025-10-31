-- Миграция: Добавление тестовых уровней
-- Дата: 2025-01-31

-- Уровень 1: Python - Hello World (Легко)
INSERT INTO public.levels (
  id,
  title,
  description,
  educational_context,
  reference_solution,
  test_cases,
  hints,
  difficulty,
  order_index,
  topic,
  language,
  target_skills,
  is_remedial,
  created_at,
  updated_at
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Hello World',
  'Напишите программу, которая выводит текст "Hello, World!" на экран.',
  'Это классическая первая программа для изучения любого языка программирования. Вы научитесь использовать функцию print() для вывода текста.',
  'print("Hello, World!")',
  '[
    {
      "input": "",
      "output": "Hello, World!",
      "description": "Программа должна вывести Hello, World!"
    }
  ]'::jsonb,
  '["Используйте функцию print()", "Не забудьте кавычки вокруг текста", "Текст должен быть точно таким: Hello, World!"]'::jsonb,
  'easy',
  1,
  'Основы Python',
  'python',
  '["Вывод текста", "Функция print()", "Строки"]'::jsonb,
  false,
  NOW(),
  NOW()
);

-- Уровень 2: Python - Сложение двух чисел (Легко)
INSERT INTO public.levels (
  id,
  title,
  description,
  educational_context,
  reference_solution,
  test_cases,
  hints,
  difficulty,
  order_index,
  topic,
  language,
  target_skills,
  is_remedial,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Сложение двух чисел',
  'Напишите программу, которая считывает два числа из ввода (каждое на отдельной строке) и выводит их сумму.',
  'Вы научитесь читать данные из ввода и выполнять арифметические операции.',
  'a = int(input())
b = int(input())
print(a + b)',
  '[
    {
      "input": "5\n3",
      "output": "8",
      "description": "5 + 3 = 8"
    },
    {
      "input": "10\n20",
      "output": "30",
      "description": "10 + 20 = 30"
    },
    {
      "input": "0\n0",
      "output": "0",
      "description": "0 + 0 = 0"
    },
    {
      "input": "-5\n5",
      "output": "0",
      "description": "-5 + 5 = 0"
    }
  ]'::jsonb,
  '["Используйте функцию input() для чтения данных", "Преобразуйте строки в числа с помощью int()", "Не забудьте вывести результат с помощью print()"]'::jsonb,
  'easy',
  2,
  'Основы Python',
  'python',
  '["Ввод данных", "Преобразование типов", "Арифметические операции"]'::jsonb,
  false,
  NOW(),
  NOW()
);

-- Уровень 3: Python - Четное или нечетное (Средне)
INSERT INTO public.levels (
  id,
  title,
  description,
  educational_context,
  reference_solution,
  test_cases,
  hints,
  difficulty,
  order_index,
  topic,
  language,
  target_skills,
  is_remedial,
  created_at,
  updated_at
) VALUES (
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  'Четное или нечетное',
  'Напишите программу, которая считывает число и выводит "четное", если число четное, или "нечетное", если число нечетное.',
  'Вы научитесь использовать условные операторы и операцию остатка от деления.',
  'n = int(input())
if n % 2 == 0:
    print("четное")
else:
    print("нечетное")',
  '[
    {
      "input": "4",
      "output": "четное",
      "description": "4 - четное число"
    },
    {
      "input": "7",
      "output": "нечетное",
      "description": "7 - нечетное число"
    },
    {
      "input": "0",
      "output": "четное",
      "description": "0 - четное число"
    },
    {
      "input": "-2",
      "output": "четное",
      "description": "-2 - четное число"
    },
    {
      "input": "-3",
      "output": "нечетное",
      "description": "-3 - нечетное число"
    }
  ]'::jsonb,
  '["Используйте оператор % для получения остатка от деления", "Если остаток от деления на 2 равен 0, число четное", "Используйте if-else для проверки условия"]'::jsonb,
  'medium',
  3,
  'Условные операторы',
  'python',
  '["Условные операторы", "Операция остатка", "Логические выражения"]'::jsonb,
  false,
  NOW(),
  NOW()
);

-- Уровень 4: Python - Сумма чисел от 1 до N (Средне)
INSERT INTO public.levels (
  id,
  title,
  description,
  educational_context,
  reference_solution,
  test_cases,
  hints,
  difficulty,
  order_index,
  topic,
  language,
  target_skills,
  is_remedial,
  created_at,
  updated_at
) VALUES (
  '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  'Сумма чисел от 1 до N',
  'Напишите программу, которая считывает число N и выводит сумму всех чисел от 1 до N включительно.',
  'Вы научитесь использовать циклы для повторения операций.',
  'n = int(input())
total = 0
for i in range(1, n + 1):
    total += i
print(total)',
  '[
    {
      "input": "5",
      "output": "15",
      "description": "1 + 2 + 3 + 4 + 5 = 15"
    },
    {
      "input": "10",
      "output": "55",
      "description": "Сумма от 1 до 10"
    },
    {
      "input": "1",
      "output": "1",
      "description": "Только одно число"
    },
    {
      "input": "100",
      "output": "5050",
      "description": "Сумма от 1 до 100"
    }
  ]'::jsonb,
  '["Используйте цикл for с функцией range()", "Создайте переменную для накопления суммы", "range(1, n+1) создает последовательность от 1 до n включительно"]'::jsonb,
  'medium',
  4,
  'Циклы',
  'python',
  '["Циклы", "Функция range()", "Накопление значений"]'::jsonb,
  false,
  NOW(),
  NOW()
);

-- Уровень 5: JavaScript - Hello World (Легко)
INSERT INTO public.levels (
  id,
  title,
  description,
  educational_context,
  reference_solution,
  test_cases,
  hints,
  difficulty,
  order_index,
  topic,
  language,
  target_skills,
  is_remedial,
  created_at,
  updated_at
) VALUES (
  '8c9e6679-8425-40de-944b-e07fc1f90ae8',
  'Hello World (JavaScript)',
  'Напишите программу на JavaScript, которая выводит текст "Hello, World!" на экран.',
  'Изучите базовый синтаксис JavaScript и вывод данных в консоль.',
  'console.log("Hello, World!");',
  '[
    {
      "input": "",
      "output": "Hello, World!",
      "description": "Программа должна вывести Hello, World!"
    }
  ]'::jsonb,
  '["Используйте console.log()", "Не забудьте точку с запятой в конце", "Текст должен быть в кавычках"]'::jsonb,
  'easy',
  5,
  'Основы JavaScript',
  'javascript',
  '["Вывод в консоль", "Функция console.log()", "Строки"]'::jsonb,
  false,
  NOW(),
  NOW()
);

-- Уровень 6: Python - Факториал (Сложно)
INSERT INTO public.levels (
  id,
  title,
  description,
  educational_context,
  reference_solution,
  test_cases,
  hints,
  difficulty,
  order_index,
  topic,
  language,
  target_skills,
  is_remedial,
  created_at,
  updated_at
) VALUES (
  '9d9e6679-9425-40de-944b-e07fc1f90ae9',
  'Факториал числа',
  'Напишите программу, которая считывает неотрицательное целое число N и вычисляет его факториал (N!).',
  'Факториал числа N - это произведение всех натуральных чисел от 1 до N. По определению, 0! = 1.',
  'n = int(input())
factorial = 1
for i in range(1, n + 1):
    factorial *= i
print(factorial)',
  '[
    {
      "input": "5",
      "output": "120",
      "description": "5! = 1 * 2 * 3 * 4 * 5 = 120"
    },
    {
      "input": "0",
      "output": "1",
      "description": "0! = 1 (по определению)"
    },
    {
      "input": "1",
      "output": "1",
      "description": "1! = 1"
    },
    {
      "input": "10",
      "output": "3628800",
      "description": "10! = 3628800"
    }
  ]'::jsonb,
  '["Факториал - это произведение чисел, а не сумма", "Используйте оператор *= для умножения", "0! по определению равен 1"]'::jsonb,
  'hard',
  6,
  'Циклы и математика',
  'python',
  '["Циклы", "Математические операции", "Факториал"]'::jsonb,
  false,
  NOW(),
  NOW()
);

-- Добавим комментарий к миграции
COMMENT ON TABLE public.levels IS 'Таблица с учебными уровнями. Содержит задачи для обучения программированию с тестовыми случаями.';
