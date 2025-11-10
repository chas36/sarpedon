# AI Prompt Improvements - Implementation Guide

## Обзор

Этот документ содержит инструкции по внедрению улучшенной системы AI анализа кода с учетом уровня владения студента (proficiency level).

## Проблемы, которые решаются

1. ❌ **Непоследовательная оценка** - одинаковый код получает разные оценки у разных студентов
2. ❌ **Неточная система оценки** - может давать 50% за одно слово
3. ❌ **Нерелевантные подсказки** - не учитывается уровень студента
4. ❌ **Отсутствие контекста** - AI не знает слабые места студента и сложность задания
5. ❌ **Общие подсказки** - начинающим нужны конкретные указания на ошибки (строка, символ)

## Решение

### 1. Система уровней владения (Proficiency Levels)

- **Beginner (0-40)** - Начинающие, нужны детальные подсказки с номерами строк
- **Intermediate (41-70)** - Средний уровень, концептуальные подсказки
- **Advanced (71-100)** - Продвинутые, архитектурная обратная связь

### 2. Адаптивные промпты

- Учет уровня студента в формировании feedback
- Использование эталонного решения при оценке качества
- Контекст о слабых местах студента (weak_areas)
- Учет сложности задания (difficulty)

### 3. Строгая валидация

- Pre-validation: отклонение кода < 10 символов
- Проверка наличия релевантных конструкций
- Одинаковая оценка для одинакового кода

---

## Файлы в этой папке

### 📄 ai-prompts-improvement.md
**Полная спецификация улучшений**
- Подробное описание всех проблем
- Архитектура решения
- Примеры промптов
- Система входного тестирования
- Метрики успеха

### 📄 proficiency-migration.sql
**SQL миграция для базы данных**
- Добавление полей proficiency_level, proficiency_score в profiles
- Создание таблицы proficiency_history
- Триггеры для автоматического обновления уровня
- Функции для расчета proficiency_score
- Миграция существующих студентов
- RLS политики

### 📄 ai-prompt-templates.ts
**TypeScript шаблоны промптов**
- Функции buildValidationPrompt() и buildQualityPrompt()
- TypeScript типы для всех интерфейсов
- Адаптивные промпты под каждый уровень
- Готово к использованию в Edge Functions

---

## Пошаговое внедрение

### Phase 1: База данных (ВЫСОКИЙ ПРИОРИТЕТ)

#### Шаг 1.1: Применить SQL миграцию

```bash
# Из корневой директории проекта

# Применить миграцию через Supabase CLI
supabase db execute -f docs/improvements/proficiency-migration.sql

# ИЛИ через Supabase Dashboard:
# 1. Зайти в Supabase Dashboard → SQL Editor
# 2. Скопировать содержимое proficiency-migration.sql
# 3. Выполнить SQL
```

#### Шаг 1.2: Проверить миграцию

```sql
-- Проверить, что поля добавлены
SELECT
  proficiency_level,
  proficiency_score,
  proficiency_last_assessed
FROM profiles
WHERE role = 'student'
LIMIT 5;

-- Проверить распределение уровней
SELECT
  proficiency_level,
  COUNT(*) as count
FROM profiles
WHERE role = 'student'
GROUP BY proficiency_level;

-- Проверить историю
SELECT * FROM proficiency_history ORDER BY changed_at DESC LIMIT 10;
```

#### Ожидаемый результат:
- ✅ В profiles появились поля proficiency_level, proficiency_score
- ✅ Все существующие студенты получили начальный уровень
- ✅ В proficiency_history есть записи с reason='migration'
- ✅ Триггер работает (автоматически обновляет уровень после code_analysis)

---

### Phase 2: Supabase Edge Functions (ВЫСОКИЙ ПРИОРИТЕТ)

#### Шаг 2.1: Создать структуру Edge Function

```bash
# Создать директорию для Edge Function (если не существует)
mkdir -p supabase/functions/validate-and-analyze-code

# Создать файл
touch supabase/functions/validate-and-analyze-code/index.ts
```

#### Шаг 2.2: Скопировать ai-prompt-templates.ts

```bash
# Скопировать шаблоны промптов в Edge Function
cp docs/improvements/ai-prompt-templates.ts \
   supabase/functions/validate-and-analyze-code/ai-prompt-templates.ts
```

#### Шаг 2.3: Реализовать Edge Function

Создать `supabase/functions/validate-and-analyze-code/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildValidationPrompt,
  buildQualityPrompt,
  getCommonMistakes,
  type ValidationResponse,
  type QualityResponse,
} from './ai-prompt-templates.ts';

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function callOpenRouter(
  prompt: string,
  type: 'validation' | 'quality'
): Promise<any> {
  const model =
    type === 'validation'
      ? 'meta-llama/llama-3.1-8b-instruct:free'
      : 'meta-llama/llama-3.1-70b-instruct:free';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

serve(async (req) => {
  try {
    const {
      userId,
      levelId,
      code,
      language,
      referenceSolution,
      testCases,
    } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('proficiency_level, proficiency_score, weak_areas')
      .eq('id', userId)
      .single();

    // 2. Get level info
    const { data: level } = await supabase
      .from('levels')
      .select('difficulty, topic, target_skills')
      .eq('id', levelId)
      .single();

    // 3. Get common mistakes
    const commonMistakes = await getCommonMistakes(supabase, userId, 5);

    // 4. Build contexts
    const studentContext = {
      proficiencyLevel: profile.proficiency_level || 'beginner',
      proficiencyScore: profile.proficiency_score || 0,
      weakAreas: profile.weak_areas || [],
      commonMistakes,
      errorPatterns: [],
    };

    const levelContext = {
      difficulty: level.difficulty || 'medium',
      topic: level.topic || '',
      targetSkills: level.target_skills || [],
    };

    // 5. Build and call validation prompt
    const validationPrompt = buildValidationPrompt({
      language,
      referenceSolution,
      userCode: code,
      testCases,
      studentContext,
      levelContext,
    });

    const validationResult: ValidationResponse =
      await callOpenRouter(validationPrompt, 'validation');

    // 6. If correct, analyze quality
    let qualityResult: QualityResponse | null = null;

    if (validationResult.isCorrect) {
      const qualityPrompt = buildQualityPrompt({
        language,
        referenceSolution,
        studentCode: code,
        studentContext,
        levelContext,
      });

      qualityResult = await callOpenRouter(qualityPrompt, 'quality');
    }

    // 7. Save results to DB
    const { data: submission } = await supabase
      .from('submissions')
      .insert({
        user_id: userId,
        level_id: levelId,
        code,
        is_correct: validationResult.isCorrect,
        ai_feedback: validationResult.feedback,
      })
      .select()
      .single();

    if (qualityResult) {
      await supabase.from('code_analysis').insert({
        submission_id: submission.id,
        user_id: userId,
        level_id: levelId,
        quality_score: qualityResult.score,
        issues: qualityResult.issues,
        error_patterns: qualityResult.patterns,
        strengths: qualityResult.strengths,
      });
      // Триггер автоматически обновит proficiency_level!
    }

    // 8. Return response
    return new Response(
      JSON.stringify({
        isCorrect: validationResult.isCorrect,
        feedback: validationResult.feedback,
        specificHints: validationResult.specificHints,
        quality: qualityResult,
        character: 'johnny', // TODO: implement character selection
        mood: 'neutral',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

#### Шаг 2.4: Развернуть Edge Function

```bash
# Развернуть Edge Function
supabase functions deploy validate-and-analyze-code

# Установить переменные окружения
supabase secrets set OPENROUTER_API_KEY=your_key_here
```

#### Шаг 2.5: Протестировать Edge Function

```bash
# Тест
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/validate-and-analyze-code' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-id",
    "levelId": "test-level-id",
    "code": "def sum_even(numbers):\n    return sum([n for n in numbers if n % 2 == 0])",
    "language": "python",
    "referenceSolution": "def sum_even(nums):\n    total = 0\n    for n in nums:\n        if n % 2 == 0:\n            total += n\n    return total",
    "testCases": [
      {"input": "[1,2,3,4]", "output": "6"},
      {"input": "[10,15,20]", "output": "30"}
    ]
  }'
```

---

### Phase 3: Frontend Integration (СРЕДНИЙ ПРИОРИТЕТ)

#### Шаг 3.1: Обновить типы в frontend

Создать `src/shared/types/ai.ts`:

```typescript
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface StudentProfile {
  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number;
  proficiencyLastAssessed: Date | null;
}

export interface ValidationResponse {
  isCorrect: boolean;
  feedback: string;
  failedTests: number[];
  specificHints?: {
    lineErrors?: Array<{ line: number; issue: string }>;
    variableNameIssues?: string[];
    syntaxFixes?: string[];
  };
}

export interface QualityResponse {
  score: number;
  issues: Array<{
    category: string;
    severity: 'low' | 'medium' | 'high';
    line: number | null;
    description: string;
    suggestion: string;
  }>;
  patterns: string[];
  strengths: string[];
  summary: string;
}
```

#### Шаг 3.2: Добавить отображение specificHints для beginners

В компоненте `FeedbackModal.tsx` (или аналогичном):

```typescript
{response.specificHints && (
  <div className="mt-4 space-y-3">
    {response.specificHints.lineErrors && (
      <div>
        <h4 className="font-semibold text-red-600">Ошибки в коде:</h4>
        <ul className="list-disc ml-6 space-y-1">
          {response.specificHints.lineErrors.map((error, i) => (
            <li key={i}>
              <span className="font-mono bg-red-50 px-2 py-1 rounded">
                Строка {error.line}
              </span>
              : {error.issue}
            </li>
          ))}
        </ul>
      </div>
    )}

    {response.specificHints.variableNameIssues && (
      <div>
        <h4 className="font-semibold text-yellow-600">
          Проблемы с именами переменных:
        </h4>
        <ul className="list-disc ml-6">
          {response.specificHints.variableNameIssues.map((issue, i) => (
            <li key={i} className="font-mono">{issue}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}
```

#### Шаг 3.3: Показать proficiency level в профиле студента

В `StudentProfile.tsx`:

```typescript
const proficiencyBadge = {
  beginner: { label: 'Начинающий', color: 'bg-blue-100 text-blue-800' },
  intermediate: { label: 'Средний', color: 'bg-yellow-100 text-yellow-800' },
  advanced: { label: 'Продвинутый', color: 'bg-green-100 text-green-800' },
};

// В JSX:
<div className={`px-3 py-1 rounded-full text-sm font-medium ${proficiencyBadge[profile.proficiencyLevel].color}`}>
  {proficiencyBadge[profile.proficiencyLevel].label}
  <span className="ml-2 text-xs">({profile.proficiencyScore}/100)</span>
</div>
```

---

### Phase 4: Teacher Dashboard (СРЕДНИЙ ПРИОРИТЕТ)

#### Шаг 4.1: Показать распределение уровней в классе

```typescript
// В TeacherDashboard.tsx
const { data: stats } = await supabase
  .from('class_proficiency_stats')
  .select('*')
  .eq('class', currentClass)
  .single();

// Показать pie chart или bar chart с распределением
```

#### Шаг 4.2: Добавить возможность ручной установки уровня

```typescript
async function overrideProficiency(
  studentId: string,
  newLevel: ProficiencyLevel
) {
  const { data, error } = await supabase.rpc('set_student_proficiency_manual', {
    student_id: studentId,
    new_level: newLevel,
    teacher_id: currentTeacherId,
    reason_text: 'Teacher manual override',
  });

  if (!error) {
    toast.success('Уровень студента обновлен');
  }
}
```

---

### Phase 5: Входное тестирование (НИЗКИЙ ПРИОРИТЕТ)

**Реализовать позже после основной системы**

1. Создать 5 специальных уровней для Initial Assessment
2. Страница `/assessment` при первом входе студента
3. После завершения → расчет начального proficiency_level
4. Сохранение в БД с reason='initial_assessment'

---

## Проверка работы системы

### Критерии успеха

После внедрения проверить:

#### ✅ 1. База данных
- [ ] Поля proficiency_level, proficiency_score существуют в profiles
- [ ] Триггер работает (уровень обновляется после code_analysis)
- [ ] View class_proficiency_stats возвращает данные

#### ✅ 2. Edge Function
- [ ] Промпты формируются с учетом уровня студента
- [ ] Beginners получают specificHints с номерами строк
- [ ] Advanced получают концептуальный feedback
- [ ] Код < 10 символов отклоняется

#### ✅ 3. Frontend
- [ ] Proficiency level отображается в профиле
- [ ] specificHints показываются для beginners
- [ ] Teacher dashboard показывает распределение

#### ✅ 4. Consistency
- [ ] Одинаковый код получает одинаковую оценку isCorrect
- [ ] Уровень студента влияет только на feedback, не на correctness

---

## Отладка и тестирование

### Тест 1: Проверка автоматического обновления уровня

```sql
-- Вставить тестовую запись code_analysis
INSERT INTO code_analysis (submission_id, user_id, level_id, quality_score, issues, error_patterns, strengths)
VALUES (
  'test-submission-id',
  'test-user-id',
  'test-level-id',
  85,
  '[{"category": "naming", "severity": "low"}]'::jsonb,
  ARRAY['good_patterns'],
  ARRAY['clean_code']
);

-- Проверить, что proficiency_level обновился
SELECT proficiency_level, proficiency_score FROM profiles WHERE id = 'test-user-id';

-- Проверить, что запись появилась в истории
SELECT * FROM proficiency_history WHERE user_id = 'test-user-id' ORDER BY changed_at DESC LIMIT 1;
```

### Тест 2: Проверка адаптивных промптов

```typescript
// В Edge Function, добавить логирование:
console.log('Validation Prompt:', validationPrompt);
console.log('Quality Prompt:', qualityPrompt);

// Проверить, что промпты содержат:
// - proficiencyLevel
// - weakAreas
// - difficulty
// - Разные feedback styles для beginner/intermediate/advanced
```

### Тест 3: Сравнение результатов для разных уровней

```typescript
// Отправить ОДИНАКОВЫЙ код от студентов с разными уровнями
// Проверить, что:
// 1. isCorrect одинаковый
// 2. feedback разный (детальный для beginner, концептуальный для advanced)
// 3. specificHints только для beginner
```

---

## Мониторинг и метрики

После внедрения отслеживать в Supabase Analytics:

```sql
-- 1. Распределение по уровням (должно быть реалистичным)
SELECT proficiency_level, COUNT(*), AVG(proficiency_score)
FROM profiles
WHERE role = 'student'
GROUP BY proficiency_level;

-- 2. Progression rate (сколько студентов повышают уровень)
SELECT
  reason,
  old_level,
  new_level,
  COUNT(*) as transitions
FROM proficiency_history
WHERE changed_at > NOW() - INTERVAL '30 days'
GROUP BY reason, old_level, new_level;

-- 3. Отклоненные submissions (должно быть < 5%)
SELECT
  COUNT(*) FILTER (WHERE ai_feedback LIKE '%напишите решение%') as rejected,
  COUNT(*) as total,
  (COUNT(*) FILTER (WHERE ai_feedback LIKE '%напишите решение%')::FLOAT / COUNT(*) * 100) as rejection_rate
FROM submissions
WHERE submitted_at > NOW() - INTERVAL '7 days';
```

---

## FAQ

### Q: Как вручную изменить уровень студента?

```sql
SELECT set_student_proficiency_manual(
  'student-user-id'::UUID,
  'intermediate',
  'teacher-user-id'::UUID,
  'Student demonstrates intermediate skills'
);
```

### Q: Как вернуть автоматический расчет после ручной установки?

```sql
SELECT enable_auto_proficiency('student-user-id'::UUID);
```

### Q: Как пересчитать уровень для всех студентов?

```sql
-- ВНИМАНИЕ: Это может быть медленно для большого количества студентов!
UPDATE profiles
SET proficiency_manual_override = false
WHERE role = 'student';

-- Вызвать пересчет
DO $$
DECLARE
  student_rec RECORD;
  calc_score INTEGER;
  calc_level TEXT;
BEGIN
  FOR student_rec IN SELECT id FROM profiles WHERE role = 'student' LOOP
    SELECT * INTO calc_score, calc_level FROM calculate_proficiency_score(student_rec.id);
    UPDATE profiles SET proficiency_score = calc_score, proficiency_level = calc_level WHERE id = student_rec.id;
  END LOOP;
END $$;
```

### Q: Почему студент не получает specificHints?

- Проверьте, что proficiency_level = 'beginner'
- Проверьте, что Edge Function возвращает specificHints в response
- Проверьте, что frontend отображает этот блок

---

## Контакты и поддержка

Если возникли вопросы при внедрении:

1. Проверьте логи Edge Functions в Supabase Dashboard → Functions → Logs
2. Проверьте SQL ошибки в Supabase Dashboard → Database → Logs
3. Обратитесь к документации в `ai-prompts-improvement.md`

---

**Дата создания:** 2025-11-06
**Версия:** 1.0
**Автор:** Claude Code Assistant
