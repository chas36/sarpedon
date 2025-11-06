# Улучшение AI промптов для анализа кода

## Проблемы текущей реализации

### 1. Отсутствие учета уровня ученика
- Все студенты получают одинаковые подсказки
- Начинающим нужны конкретные указания ("ошибка на строке 2")
- Продвинутым - концептуальные подсказки

### 2. Неточная система оценки
- Может давать 50% за одно слово
- Нет проверки минимальной длины кода
- Нет сравнения с эталонным решением при анализе качества

### 3. Непоследовательная оценка
- Одинаковый код у разных пользователей оценивается по-разному
- Нет учета сложности задания (difficulty)
- Не используется информация о weak_areas студента

### 4. Нерелевантные подсказки
- AI не знает историю ошибок студента
- Не адаптирует стиль подсказок под уровень

---

## Решение: Система уровней владения (Proficiency Levels)

### Уровни студентов

```typescript
type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

interface StudentProficiency {
  level: ProficiencyLevel;
  score: number;           // 0-100, автоматически рассчитывается
  lastAssessed: Date;
  manualOverride: boolean; // Учитель может вручную установить уровень
}
```

### Определение уровня

**Автоматическое определение** (на основе метрик):
- **Beginner (0-40)**:
  - < 30% заданий выполнено
  - Средний quality_score < 60
  - > 5 issues на задание
  - Частые базовые ошибки (syntax, naming)

- **Intermediate (41-70)**:
  - 30-70% заданий выполнено
  - Средний quality_score 60-80
  - 2-5 issues на задание
  - Редкие синтаксические ошибки

- **Advanced (71-100)**:
  - > 70% заданий выполнено
  - Средний quality_score > 80
  - < 2 issues на задание
  - Только концептуальные улучшения

**Входное тестирование** (опционально):
- 3-5 базовых задач разной сложности
- Определение начального уровня перед основной программой

---

## Изменения в базе данных

### 1. Таблица profiles

```sql
ALTER TABLE profiles
ADD COLUMN proficiency_level TEXT DEFAULT 'beginner',
ADD COLUMN proficiency_score INTEGER DEFAULT 0,
ADD COLUMN proficiency_last_assessed TIMESTAMP,
ADD COLUMN proficiency_manual_override BOOLEAN DEFAULT false;

-- Индекс для быстрого поиска по уровню
CREATE INDEX idx_profiles_proficiency ON profiles(proficiency_level);

-- Constraint для валидации
ALTER TABLE profiles
ADD CONSTRAINT check_proficiency_level
CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced'));
```

### 2. Таблица levels (добавить difficulty если нет)

```sql
ALTER TABLE levels
ADD COLUMN difficulty TEXT DEFAULT 'medium';

ALTER TABLE levels
ADD CONSTRAINT check_difficulty
CHECK (difficulty IN ('easy', 'medium', 'hard'));
```

### 3. Функция автоматического обновления уровня

```sql
CREATE OR REPLACE FUNCTION update_student_proficiency()
RETURNS TRIGGER AS $$
BEGIN
  -- Пересчитываем уровень после каждого submission
  UPDATE profiles
  SET
    proficiency_score = (
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE (
            -- Процент выполненных заданий (40%)
            (COUNT(*) FILTER (WHERE up.status = 'completed')::FLOAT /
             NULLIF(COUNT(*), 0) * 40) +
            -- Средний quality score (40%)
            (AVG(ca.quality_score) FILTER (WHERE ca.quality_score IS NOT NULL) * 0.4) +
            -- Обратная зависимость от issues (20%)
            (20 - LEAST(AVG(JSONB_ARRAY_LENGTH(ca.issues)) * 2, 20))
          )::INTEGER
        END
      FROM user_progress up
      LEFT JOIN submissions s ON s.level_id = up.level_id AND s.user_id = up.user_id
      LEFT JOIN code_analysis ca ON ca.submission_id = s.id
      WHERE up.user_id = NEW.user_id
    ),
    proficiency_level = (
      CASE
        WHEN proficiency_score < 41 THEN 'beginner'
        WHEN proficiency_score < 71 THEN 'intermediate'
        ELSE 'advanced'
      END
    ),
    proficiency_last_assessed = NOW()
  WHERE id = NEW.user_id
    AND proficiency_manual_override = false;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_proficiency
AFTER INSERT ON code_analysis
FOR EACH ROW
EXECUTE FUNCTION update_student_proficiency();
```

---

## Улучшенные промпты

### 1. Промпт для функциональной проверки (с учетом уровня)

```
You are a {language} code validator for an educational platform.
You are analyzing code from a **{proficiencyLevel}** level student.

**Student Context:**
- Proficiency Level: {proficiencyLevel} ({proficiencyScore}/100)
- Weak Areas: {weakAreas || 'None identified yet'}
- Previous Common Mistakes: {commonMistakes || 'None'}
- Assignment Difficulty: {difficulty}

**Task:** Compare the student's code with the reference solution.

**Reference Solution:**
```{language}
{referenceSolution}
```

**Student's Code:**
```{language}
{userCode}
```

**Test Cases:**
{testCases.map((tc, i) => `Test ${i+1}: Input: ${tc.input}, Expected: ${tc.output}`).join('\n')}

---

**Instructions:**

1. **Pre-validation:**
   - If code is less than 10 characters OR contains only comments/whitespace
     → Return: {"isCorrect": false, "feedback": "Пожалуйста, напишите решение задачи"}
   - If code doesn't contain any control structures/functions relevant to task
     → Return: {"isCorrect": false, "feedback": "Код не содержит решения задачи"}

2. **Functional Analysis:**
   - Compare logic with reference solution
   - Check if code produces correct outputs for all test cases
   - Identify logic errors, syntax issues, edge case handling

3. **Adaptive Feedback Style:**

   **For BEGINNER students:**
   - Use simple, encouraging language
   - Point to SPECIFIC lines with errors: "На строке 3 в функции print() пропущена закрывающая скобка"
   - Explain WHY it's wrong: "Переменная 'rezult' не совпадает с 'result' - в Python имена должны точно совпадать"
   - Provide step-by-step hints
   - Focus on ONE main issue at a time
   - Examples:
     * "Проверьте название переменной на строке 5"
     * "Вы забыли двоеточие после 'if' на строке 2"
     * "Функция должна ВОЗВРАЩАТЬ значение (return), а не печатать его (print)"

   **For INTERMEDIATE students:**
   - Moderate detail, focus on logic
   - Mention problematic sections without exact lines
   - Explain concepts: "Ваш цикл не обрабатывает крайний случай пустого списка"
   - Suggest 2-3 areas to review
   - Examples:
     * "Проверьте логику условия - оно не учитывает отрицательные числа"
     * "Цикл while может привести к бесконечной итерации"
     * "Рассмотрите использование встроенной функции вместо ручной итерации"

   **For ADVANCED students:**
   - High-level conceptual feedback
   - No line numbers, focus on architecture
   - Discuss algorithm efficiency, patterns
   - Challenge to find edge cases themselves
   - Examples:
     * "Алгоритм работает, но имеет сложность O(n²) - можно оптимизировать до O(n)"
     * "Решение корректно, но не обрабатывает Unicode символы"
     * "Рассмотрите функциональный подход вместо императивного"

4. **Context Awareness:**
   - If student has weak areas in {weakAreas}, pay special attention to those aspects
   - Reference their common mistakes: "{commonMistakes}"
   - For difficult assignments, be more lenient with minor issues
   - For easy assignments at advanced level, expect cleaner code

5. **Consistency:**
   - Always use the SAME evaluation logic for the SAME code
   - Base correctness ONLY on: reference solution equivalence + test case results
   - Don't let proficiency level affect WHETHER code is correct, only HOW you explain it

**Response Format (JSON):**
{
  "isCorrect": boolean,
  "feedback": "Educational explanation tailored to student level...",
  "failedTests": [array of failed test indices],
  "specificHints": {
    // For beginners only
    "lineErrors": [{"line": number, "issue": "description"}],
    "variableNameIssues": ["старое_имя → правильное_имя"],
    "syntaxFixes": ["что исправить"]
  }
}

**Tone Guidelines:**
- Beginner: Very encouraging, patient, detailed
- Intermediate: Supportive, educational, balanced
- Advanced: Professional, concise, challenging

IMPORTANT:
- NEVER give different correctness results for the same code from different students
- Proficiency level affects ONLY the feedback style, NOT the correctness judgment
- Be strict about minimum code quality (reject trivial/empty submissions)
```

---

### 2. Промпт для анализа качества кода (с учетом уровня и эталона)

```
You are a {language} code quality analyzer for an educational platform.
You are reviewing code from a **{proficiencyLevel}** level student.

**Student Context:**
- Proficiency Level: {proficiencyLevel} ({proficiencyScore}/100)
- Assignment Difficulty: {difficulty}
- Weak Areas: {weakAreas || 'None'}
- Student's repeated patterns: {errorPatterns || 'None'}

**Reference Solution (for comparison):**
```{language}
{referenceSolution}
```

**Student's Code:**
```{language}
{studentCode}
```

---

**Evaluation Criteria (adapted by level):**

### BEGINNER - Focus on Basics
1. **Syntax & Basic Naming** (30%)
   - Variables have descriptive names (not 'x', 'temp', 'a')
   - Functions are named with verbs
   - No Russian transliteration (bad: 'summa', good: 'sum')

2. **Code Structure** (25%)
   - Proper indentation
   - Reasonable line length (< 100 chars)
   - No repeated code blocks

3. **Basic Correctness** (25%)
   - No unused variables
   - All functions are used
   - No obvious logic errors

4. **Comments (if present)** (20%)
   - Comments explain WHY, not WHAT
   - No commented-out code left behind

### INTERMEDIATE - Add Complexity & Patterns
1. **Naming & Clarity** (25%)
   - Consistent naming convention (camelCase/snake_case)
   - Magic numbers extracted to constants
   - Boolean variables named clearly (is*, has*, can*)

2. **Function Design** (25%)
   - Functions < 50 lines
   - Single responsibility principle
   - Reasonable parameter count (< 5)

3. **Error Handling** (20%)
   - Edge cases considered
   - Input validation present
   - Errors not silently swallowed

4. **Code Patterns** (15%)
   - No deep nesting (max 3 levels)
   - DRY principle followed
   - Appropriate use of language features

5. **Dependencies** (15%)
   - No global state mutation
   - Clear data flow
   - Minimal side effects

### ADVANCED - Architecture & Efficiency
1. **Design Patterns** (20%)
   - Appropriate abstractions
   - SOLID principles followed
   - Clean architecture

2. **Performance** (20%)
   - Algorithm complexity considered
   - No unnecessary iterations
   - Memory usage optimized

3. **Maintainability** (20%)
   - Self-documenting code
   - Testable structure
   - Future-proof design

4. **Language Mastery** (20%)
   - Idiomatic {language} patterns
   - Advanced features used appropriately
   - Standard library leveraged

5. **Production Readiness** (20%)
   - Comprehensive error handling
   - Edge cases covered
   - Security considerations

---

**Scoring Guidelines (adaptive):**

**For BEGINNER:**
- 90-100: Excellent - Clean syntax, good names, no basic errors
- 75-89: Good - Minor naming issues or small repeated blocks
- 60-74: Acceptable - Works but has several naming/structure issues
- 40-59: Needs Work - Many basic errors (naming, unused vars, poor indentation)
- 0-39: Poor - Severe syntax issues, no structure, unintelligible names

**For INTERMEDIATE:**
- 90-100: Excellent - Clean patterns, good error handling, DRY
- 75-89: Good - Solid structure with minor pattern violations
- 60-74: Acceptable - Works but has some repeated code or deep nesting
- 40-59: Needs Work - Poor function design or missing error handling
- 0-39: Poor - No patterns, deeply nested, magic numbers everywhere

**For ADVANCED:**
- 90-100: Excellent - Production-ready, optimal complexity, clean architecture
- 75-89: Good - Solid design with minor optimization opportunities
- 60-74: Acceptable - Works but suboptimal complexity or missing abstractions
- 40-59: Needs Work - Poor architecture or inefficient algorithms
- 0-39: Poor - Unmaintainable or severely inefficient

**Difficulty Adjustment:**
- Easy task at Beginner level: Expect 70+ scores
- Hard task at Beginner level: Accept 50+ scores as reasonable
- Easy task at Advanced level: Expect 85+ scores
- Hard task at Advanced level: Accept 70+ scores

---

**Issue Severity Guidelines:**

**HIGH severity:**
- Beginner: Syntax errors, completely wrong variable names
- Intermediate: Missing error handling, O(n²) where O(n) possible
- Advanced: Security vulnerabilities, memory leaks, wrong architecture

**MEDIUM severity:**
- Beginner: Inconsistent naming, poor indentation
- Intermediate: Magic numbers, functions > 50 lines
- Advanced: Suboptimal complexity, missing abstractions

**LOW severity:**
- Beginner: Variable could have better name
- Intermediate: Could use more idiomatic pattern
- Advanced: Minor optimization opportunity

---

**Comparison with Reference:**
1. Compare code structure with reference solution
2. Note if student's approach is:
   - More complex than needed (suggest simplification)
   - More elegant (acknowledge!)
   - Different but valid (explain trade-offs)
3. Don't penalize creative solutions that work

**Focus on Student's Weak Areas:**
- If {weakAreas} includes 'naming': Be extra thorough on naming review
- If {weakAreas} includes 'complexity': Focus on nesting/function size
- Provide specific remedial suggestions for weak areas

**Response Format (JSON):**
{
  "score": 0-100,
  "issues": [
    {
      "category": "naming|complexity|error_handling|nesting_depth|magic_numbers|patterns|...",
      "severity": "low|medium|high",
      "line": number_or_null,
      "description": "What's wrong (adapted to student level)",
      "suggestion": "How to improve (specific for beginners, conceptual for advanced)",
      "isWeakAreaRelated": boolean  // true if matches student's weak_areas
    }
  ],
  "patterns": ["poor_naming", "deep_nesting", ...],
  "strengths": ["clean_structure", "good_naming", ...],
  "summary": "Brief assessment tailored to proficiency level",
  "comparedToReference": {
    "approach": "similar|more_complex|more_elegant|different",
    "notes": "How student's solution compares"
  },
  "remedialSuggestions": [
    // Specific practice recommendations based on weak areas
    "Practice: naming variables descriptively",
    "Study: list comprehensions in Python"
  ]
}

**Consistency Rules:**
1. SAME code should get SAME score regardless of student
2. Proficiency level affects:
   - Which criteria to emphasize (basics vs architecture)
   - Explanation depth in issues
   - Severity thresholds
3. Difficulty affects:
   - Score expectations
   - Leniency on minor issues
4. Use reference solution as quality baseline

**Tone:**
- Beginner: Very detailed explanations, encouraging
- Intermediate: Balanced, educational
- Advanced: Concise, professional, challenging
```

---

## Обновленный запрос к Edge Function

```typescript
// POST /functions/v1/validate-and-analyze-code

interface AnalysisRequest {
  userId: string;
  levelId: string;
  code: string;
  language: string;
  referenceSolution: string;
  testCases: Array<{input: string, output: string}>;

  // NEW: Контекст студента
  studentContext: {
    proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
    proficiencyScore: number;
    weakAreas: string[];
    commonMistakes: string[];
    errorPatterns: string[];
  };

  // NEW: Контекст задания
  levelContext: {
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
    targetSkills: string[];
  };
}
```

---

## Логика обновления Edge Function

```typescript
async function validateAndAnalyzeCode(request: AnalysisRequest) {
  // 1. Получить профиль студента из БД
  const studentProfile = await getStudentProfile(request.userId);

  // 2. Получить информацию об уровне
  const levelInfo = await getLevel(request.levelId);

  // 3. Построить контекст для промптов
  const context = {
    proficiencyLevel: studentProfile.proficiency_level,
    proficiencyScore: studentProfile.proficiency_score,
    weakAreas: studentProfile.weak_areas || [],
    commonMistakes: await getCommonMistakes(request.userId, 5), // last 5
    errorPatterns: studentProfile.error_patterns || [],
    difficulty: levelInfo.difficulty,
    topic: levelInfo.topic,
  };

  // 4. Validation промпт (с контекстом)
  const validationPrompt = buildValidationPrompt({
    language: request.language,
    referenceSolution: request.referenceSolution,
    userCode: request.code,
    testCases: request.testCases,
    ...context,
  });

  const validationResult = await callOpenRouter(validationPrompt, 'validation');

  // 5. Quality анализ промпт (с контекстом)
  const qualityPrompt = buildQualityPrompt({
    language: request.language,
    referenceSolution: request.referenceSolution,
    studentCode: request.code,
    ...context,
  });

  const qualityResult = await callOpenRouter(qualityPrompt, 'quality');

  // 6. Сохранить результаты + обновить weak_areas
  await saveAnalysisResults({
    userId: request.userId,
    levelId: request.levelId,
    validationResult,
    qualityResult,
  });

  // 7. Пересчитать proficiency_score (триггер сработает автоматически)

  // 8. Вернуть результат с персонажем
  return {
    isCorrect: validationResult.isCorrect,
    feedback: validationResult.feedback,
    specificHints: validationResult.specificHints, // для beginners
    quality: qualityResult,
    character: selectCharacter(validationResult, context),
    mood: selectMood(validationResult, context),
  };
}
```

---

## Входное тестирование (Initial Assessment)

### Цель
Определить начальный proficiency_level студента перед началом обучения.

### Формат
3-5 задач возрастающей сложности по основному языку:

1. **Task 1 - Very Easy (Syntax basics)**
   - Пример: "Создайте переменную name со значением 'Alice' и выведите её"
   - Проверяет: Базовый синтаксис, понимание переменных

2. **Task 2 - Easy (Simple logic)**
   - Пример: "Напишите функцию, которая принимает число и возвращает True если оно чётное"
   - Проверяет: Функции, условия, остаток от деления

3. **Task 3 - Medium (Loops + data structures)**
   - Пример: "Найдите сумму всех чётных чисел в списке [1,2,3,4,5,6]"
   - Проверяет: Циклы, списки, фильтрация

4. **Task 4 - Medium-Hard (Algorithm)**
   - Пример: "Найдите второй по величине элемент в списке"
   - Проверяет: Алгоритмы сортировки/поиска

5. **Task 5 - Hard (Complex logic)**
   - Пример: "Напишите функцию isPalindrome для строк"
   - Проверяет: Строки, индексы, reverse logic

### Scoring Initial Assessment

```typescript
function calculateInitialProficiency(results: AssessmentResult[]) {
  const scores = results.map(r => ({
    completed: r.isCorrect,
    quality: r.qualityScore,
    difficulty: r.taskDifficulty, // 1-5
  }));

  // Взвешенная сумма
  const weightedScore = scores.reduce((sum, s, idx) => {
    const difficultyWeight = (idx + 1); // Task 5 весит больше
    const completion = s.completed ? 50 : 0;
    const quality = s.quality * 0.5;
    return sum + (completion + quality) * difficultyWeight;
  }, 0);

  const maxScore = 5 * 100 * (1+2+3+4+5) / 5; // Максимум взвешенных баллов
  const proficiencyScore = (weightedScore / maxScore) * 100;

  let level: ProficiencyLevel;
  if (proficiencyScore < 40) level = 'beginner';
  else if (proficiencyScore < 70) level = 'intermediate';
  else level = 'advanced';

  return { level, score: Math.round(proficiencyScore) };
}
```

### UI для Initial Assessment

```typescript
// Страница /assessment при первом входе студента
// Показывает прогресс: Task 1/5
// Нет геймификации, только определение уровня
// После завершения → Welcome экран с результатом + рекомендации
```

---

## Миграция существующих пользователей

```sql
-- Скрипт для расчёта proficiency_level для существующих студентов

UPDATE profiles p
SET
  proficiency_score = (
    SELECT
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE (
          (COUNT(*) FILTER (WHERE up.status = 'completed')::FLOAT /
           NULLIF(COUNT(*), 0) * 40) +
          (COALESCE(AVG(ca.quality_score) FILTER (WHERE ca.quality_score IS NOT NULL), 0) * 0.4) +
          (20 - LEAST(COALESCE(AVG(JSONB_ARRAY_LENGTH(ca.issues)), 10) * 2, 20))
        )::INTEGER
      END
    FROM user_progress up
    LEFT JOIN submissions s ON s.level_id = up.level_id AND s.user_id = up.user_id
    LEFT JOIN code_analysis ca ON ca.submission_id = s.id
    WHERE up.user_id = p.id
  ),
  proficiency_level = (
    CASE
      WHEN proficiency_score < 41 THEN 'beginner'
      WHEN proficiency_score < 71 THEN 'intermediate'
      ELSE 'advanced'
    END
  ),
  proficiency_last_assessed = NOW()
WHERE role = 'student';
```

---

## Дополнительные улучшения

### 1. История изменения уровня

```sql
CREATE TABLE proficiency_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  old_level TEXT,
  new_level TEXT,
  old_score INTEGER,
  new_score INTEGER,
  reason TEXT,  -- 'auto_calculation' | 'manual_override' | 'initial_assessment'
  changed_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Teacher Override UI

```typescript
// В админке учителя - возможность вручную установить уровень
function overrideStudentProficiency(
  studentId: string,
  newLevel: ProficiencyLevel,
  reason: string
) {
  await supabase
    .from('profiles')
    .update({
      proficiency_level: newLevel,
      proficiency_manual_override: true,
      // Сохранить в history
    })
    .eq('id', studentId);
}
```

### 3. Аналитика для учителя

```typescript
interface ClassProficiencyStats {
  beginners: number;
  intermediate: number;
  advanced: number;
  averageScore: number;
  progressingStudents: Array<{id, name, levelUp: boolean}>;
}

// Dashboard учителя показывает распределение уровней в классе
```

---

## Метрики успеха

После внедрения отслеживать:

1. **Consistency** - одинаковый код получает одинаковую оценку (95%+ consistency)
2. **Rejection Rate** - % отклонённых тривиальных submissions (< 5 символов)
3. **Student Satisfaction** - опрос студентов о релевантности подсказок
4. **Progression Rate** - скорость перехода с beginner → intermediate → advanced
5. **False Positives** - % случаев когда 50% дано за неправильный код (должно быть 0%)

---

## Приоритет внедрения

**Phase 1 (MVP):**
1. ✅ Добавить proficiency_level в БД
2. ✅ Обновить промпты с учетом уровня
3. ✅ Реализовать автоматический расчёт уровня
4. ✅ Добавить pre-validation (отклонение пустых кодов)

**Phase 2:**
5. Входное тестирование (Initial Assessment)
6. Teacher manual override UI
7. Proficiency history tracking

**Phase 3:**
8. Advanced аналитика прогрессии
9. Персональные треки обучения на основе уровня
10. Адаптивные рекомендации упражнений

---

## Пример результата для Beginner vs Advanced

### Beginner Student (код с ошибкой)

```python
# Задача: Напишите функцию sum_even для суммы чётных чисел

def sum_even(numbers):
    summa = 0
    for num in numbers:
        if num % 2 = 0:  # Ошибка: = вместо ==
            summa += num
    return summa
```

**Feedback:**
```
❌ Код содержит ошибку на строке 4.

Проблема: В условии if используется знак = (присваивание),
а нужно == (сравнение).

Как исправить:
  if num % 2 == 0:
            ^^^ два знака равно для сравнения

Также обратите внимание:
- Переменная 'summa' - это транслит. Лучше использовать 'total' или 'sum_value'

Попробуйте ещё раз! Вы на правильном пути! 🐻
```

### Advanced Student (тот же код)

```
❌ Синтаксическая ошибка в условном операторе.

Используется оператор присваивания (=) вместо сравнения (==)
в логическом выражении. Также рекомендуется избегать транслитерации
в именах переменных.

Рассмотрите использование list comprehension или встроенной функции filter()
для более идиоматичного Python кода.
```

---

**Документ подготовлен:** 2025-11-06
**Версия:** 1.0
**Автор:** Claude Code Assistant
