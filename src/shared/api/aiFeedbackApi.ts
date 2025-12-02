import { supabase } from '@/shared/lib/supabase';
import type { AIFeedbackRequest, AIFeedbackResponse, ProficiencyLevel } from '@/shared/types';
import { getOrInitializeTeacherSettings } from './teacherSettingsApi';

/**
 * AI Feedback Integration via Supabase Edge Function
 * Supports multiple AI providers: Groq, OpenRouter
 * С адаптивными промптами на основе proficiency level
 */

// Default fallback values if teacher settings are not available
const DEFAULT_AI_PROVIDER = 'groq';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_AI_TEMPERATURE = 0.3;

/**
 * Получить стиль подсказок в зависимости от уровня студента
 */
function getFeedbackStyle(proficiency: ProficiencyLevel): string {
  switch (proficiency) {
    case 'beginner':
      return `**Для НАЧИНАЮЩИХ студентов:**
- Используй простой и ободряющий язык
- Указывай на КОНКРЕТНЫЕ строки с ошибками: "На строке 3 в функции print() пропущена закрывающая скобка"
- Объясняй ПОЧЕМУ это неправильно: "Переменная 'rezult' не совпадает с 'result' - в Python имена должны точно совпадать"
- Давай пошаговые подсказки
- Фокусируйся на ОДНОЙ главной проблеме за раз
- Примеры:
  * "Проверьте название переменной на строке 5"
  * "Вы забыли двоеточие после 'if' на строке 2"
  * "Функция должна ВОЗВРАЩАТЬ значение (return), а не печатать его (print)"`;

    case 'intermediate':
      return `**Для студентов СРЕДНЕГО уровня:**
- Умеренная детализация, фокус на логике
- Упоминай проблемные участки БЕЗ точных номеров строк
- Объясняй концепции: "Ваш цикл не обрабатывает крайний случай пустого списка"
- Предлагай 2-3 области для проверки
- Примеры:
  * "Проверьте логику условия - оно не учитывает отрицательные числа"
  * "Цикл while может привести к бесконечной итерации"
  * "Рассмотрите использование встроенной функции вместо ручной итерации"`;

    case 'advanced':
      return `**Для ПРОДВИНУТЫХ студентов:**
- Концептуальная обратная связь высокого уровня
- БЕЗ номеров строк, фокус на архитектуре
- Обсуждай эффективность алгоритма, паттерны
- Предложи найти граничные случаи самостоятельно
- Примеры:
  * "Алгоритм работает, но имеет сложность O(n²) - можно оптимизировать до O(n)"
  * "Решение корректно, но не обрабатывает Unicode символы"
  * "Рассмотрите функциональный подход вместо императивного"`;
  }
}

/**
 * Получить критерии оценки в зависимости от уровня
 */
function getEvaluationCriteria(proficiency: ProficiencyLevel): string {
  switch (proficiency) {
    case 'beginner':
      return `### BEGINNER - Фокус на основах
1. **Синтаксис и именование** (30%)
   - Переменные имеют описательные имена (не 'x', 'temp', 'a')
   - Функции названы с глаголами
   - Нет русской транслитерации (плохо: 'summa', хорошо: 'sum')

2. **Структура кода** (25%)
   - Правильные отступы
   - Разумная длина строк (< 100 символов)
   - Нет дублированных блоков кода

3. **Базовая корректность** (25%)
   - Нет неиспользуемых переменных
   - Все функции используются
   - Нет явных логических ошибок

4. **Комментарии (если есть)** (20%)
   - Комментарии объясняют ПОЧЕМУ, а не ЧТО
   - Нет закомментированного кода`;

    case 'intermediate':
      return `### INTERMEDIATE - Добавляем сложность и паттерны
1. **Именование и ясность** (25%)
   - Последовательное соглашение об именовании (camelCase/snake_case)
   - Магические числа вынесены в константы
   - Булевы переменные названы ясно (is*, has*, can*)

2. **Дизайн функций** (25%)
   - Функции < 50 строк
   - Принцип единственной ответственности
   - Разумное количество параметров (< 5)

3. **Обработка ошибок** (20%)
   - Учтены граничные случаи
   - Присутствует валидация входных данных
   - Ошибки не подавляются молча

4. **Паттерны кода** (15%)
   - Нет глубокой вложенности (макс 3 уровня)
   - Соблюден принцип DRY
   - Подходящее использование возможностей языка

5. **Зависимости** (15%)
   - Нет изменения глобального состояния
   - Четкий поток данных
   - Минимальные побочные эффекты`;

    case 'advanced':
      return `### ADVANCED - Архитектура и эффективность
1. **Паттерны проектирования** (20%)
   - Подходящие абстракции
   - Соблюдение принципов SOLID
   - Чистая архитектура

2. **Производительность** (20%)
   - Учтена сложность алгоритма
   - Нет лишних итераций
   - Оптимизировано использование памяти

3. **Поддерживаемость** (20%)
   - Самодокументируемый код
   - Тестируемая структура
   - Расширяемый дизайн

4. **Владение языком** (20%)
   - Идиоматичные паттерны ${'{language}'}
   - Правильное использование продвинутых возможностей
   - Использование стандартной библиотеки

5. **Готовность к production** (20%)
   - Комплексная обработка ошибок
   - Покрыты граничные случаи
   - Учтены вопросы безопасности`;
  }
}

/**
 * Получить гайд по оценке в зависимости от уровня
 */
function getScoringGuide(proficiency: ProficiencyLevel, difficulty: number): string {
  const difficultyAdjustment = `
**Корректировка сложности:**
- Легкое задание (difficulty ${difficulty} <= 3) для ${proficiency}: Ожидается ${proficiency === 'beginner' ? '70+' : proficiency === 'intermediate' ? '80+' : '85+'} баллов
- Сложное задание (difficulty ${difficulty} >= 7) для ${proficiency}: Приемлемо ${proficiency === 'beginner' ? '50+' : proficiency === 'intermediate' ? '60+' : '70+'} баллов`;

  switch (proficiency) {
    case 'beginner':
      return `**Для BEGINNER:**
- 90-100: Отлично - Чистый синтаксис, хорошие имена, нет базовых ошибок
- 75-89: Хорошо - Минимальные проблемы с именованием или небольшие повторы
- 60-74: Приемлемо - Работает, но есть несколько проблем с именованием/структурой
- 40-59: Требует доработки - Много базовых ошибок (именование, неиспользуемые переменные, плохие отступы)
- 0-39: Плохо - Серьезные проблемы с синтаксисом, нет структуры, непонятные имена

${difficultyAdjustment}`;

    case 'intermediate':
      return `**Для INTERMEDIATE:**
- 90-100: Отлично - Чистые паттерны, хорошая обработка ошибок, DRY
- 75-89: Хорошо - Солидная структура с минимальными нарушениями паттернов
- 60-74: Приемлемо - Работает, но есть повторяющийся код или глубокая вложенность
- 40-59: Требует доработки - Плохой дизайн функций или отсутствует обработка ошибок
- 0-39: Плохо - Нет паттернов, глубокая вложенность, магические числа везде

${difficultyAdjustment}`;

    case 'advanced':
      return `**Для ADVANCED:**
- 90-100: Отлично - Готов к production, оптимальная сложность, чистая архитектура
- 75-89: Хорошо - Солидный дизайн с минимальными возможностями для оптимизации
- 60-74: Приемлемо - Работает, но субоптимальная сложность или отсутствуют абстракции
- 40-59: Требует доработки - Плохая архитектура или неэффективные алгоритмы
- 0-39: Плохо - Неподдерживаемый или крайне неэффективный код

${difficultyAdjustment}`;
  }
}

/**
 * Создать улучшенный промпт с учетом уровня студента
 */
function createAdaptiveFeedbackPrompt(request: AIFeedbackRequest): string {
  const difficultyLevel = request.difficulty || 5;
  const proficiency = request.student_profile?.proficiency_level || 'beginner';
  const proficiencyScore = request.student_profile?.proficiency_score || 0;
  const weakAreas = request.student_profile?.weak_areas || [];
  const commonMistakes = request.student_profile?.common_mistakes || [];

  // PRE-VALIDATION: Отклоняем слишком короткий код
  const codeLength = request.code.trim().length;
  if (codeLength < 10) {
    // Это обрабатывается вне AI - в самой функции getAIFeedback
    return '';
  }

  let prompt = `Ты - AI наставник по программированию для образовательной платформы.
Ты анализируешь код от студента уровня **${proficiency.toUpperCase()}** (${proficiencyScore}/100).

**КРИТИЧЕСКИ ВАЖНО:**
- Твои оценки должны быть КОНСИСТЕНТНЫМИ - ОДИНАКОВЫЙ код ВСЕГДА получает ОДИНАКОВУЮ оценку
- Уровень студента (${proficiency}) влияет ТОЛЬКО на СТИЛЬ обратной связи, НЕ на корректность оценки
- Используй детерминированные критерии оценки

**Контекст студента:**
- Уровень владения: ${proficiency} (${proficiencyScore}/100)`;

  if (weakAreas.length > 0) {
    prompt += `\n- Слабые места: ${weakAreas.join(', ')}`;
  }

  if (commonMistakes.length > 0) {
    prompt += `\n- Частые ошибки: ${commonMistakes.join(', ')}`;
  }

  prompt += `

**Задание:**
${request.task_description}

**Язык программирования:** ${request.language}
**Уровень сложности задания:** ${difficultyLevel}/10

${request.reference_solution ? `**Эталонное решение (для сравнения):**
\`\`\`${request.language}
${request.reference_solution}
\`\`\`
` : ''}

**Код студента:**
\`\`\`${request.language}
${request.code}
\`\`\`
`;

  // Добавить результаты тестов
  if (request.test_results && request.test_results.length > 0) {
    const passedTests = request.test_results.filter(t => t.actual_output === t.expected_output).length;
    const totalTests = request.test_results.length;

    prompt += `\n📊 **Результаты тестирования:** ${passedTests}/${totalTests} тестов пройдено\n`;

    request.test_results.forEach((test, idx) => {
      const status = test.actual_output === test.expected_output ? '✅ PASS' : '❌ FAIL';
      prompt += `\n${status} | Тест ${idx + 1}:`;
      prompt += `\n  Вход: ${test.input || '(нет входных данных)'}`;
      prompt += `\n  Ожидалось: "${test.expected_output}"`;
      prompt += `\n  Получено: "${test.actual_output}"`;
      if (test.error) {
        prompt += `\n  Ошибка: ${test.error}`;
      }
    });
    prompt += '\n';
  }

  prompt += `
---

📋 **ЗАДАЧА АНАЛИЗА:**

${getEvaluationCriteria(proficiency)}

**OVERALL_SCORE** = среднее арифметическое всех метрик выше

---

**СТИЛЬ ОБРАТНОЙ СВЯЗИ:**

${getFeedbackStyle(proficiency)}

---

**SCORING GUIDE:**

${getScoringGuide(proficiency, difficultyLevel)}

---

**КОНТЕКСТ СЛАБЫХ МЕСТ:**
${weakAreas.length > 0 ? `- Студент имеет слабости в: ${weakAreas.join(', ')}. Уделите особое внимание этим аспектам.` : '- Слабые места пока не выявлены.'}
${commonMistakes.length > 0 ? `- Частые ошибки студента: "${commonMistakes.join(', ')}". Проверьте, не повторяются ли они.` : ''}

---

**СРАВНЕНИЕ С ЭТАЛОНОМ:**
${request.reference_solution ? `1. Сравни структуру кода с эталонным решением
2. Отметь, является ли подход студента:
   - Более сложным чем нужно (предложи упрощение)
   - Более элегантным (похвали!)
   - Другим, но валидным (объясни компромиссы)
3. НЕ штрафуй за креативные решения, которые работают` : 'Эталонное решение не предоставлено.'}

---

**ФОРМАТ ОТВЕТА (строго JSON):**

\`\`\`json
{
  "readability": <0-100>,
  "correctness": <0-100>,
  "efficiency": <0-100>,
  "best_practices": <0-100>,
  "overall_score": <среднее арифметическое>,
  "feedback": "<2-3 предложения о главной проблеме, адаптированные под уровень ${proficiency}>",
  "suggestions": [
    "<подсказка 1, специфичная для уровня ${proficiency}>",
    "<подсказка 2>",
    "<подсказка 3>"
  ]
}
\`\`\`

**ВАЖНО:**
- Отвечай ТОЛЬКО валидным JSON, без дополнительного текста
- Язык: русский
- Будь ${proficiency === 'beginner' ? 'очень поддерживающим и детальным' : proficiency === 'intermediate' ? 'балансируй между поддержкой и вызовом' : 'профессиональным, сжатым и требовательным'}
`;

  return prompt;
}

/**
 * Парсить JSON ответ от AI модели с метриками качества
 */
function parseAIResponse(text: string): AIFeedbackResponse {
  try {
    // Извлечь JSON из markdown блока, если есть
    let jsonText = text.trim();
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonText);

    // Валидация структуры
    const readability = Math.max(0, Math.min(100, parsed.readability || 50));
    const correctness = Math.max(0, Math.min(100, parsed.correctness || 0));
    const efficiency = Math.max(0, Math.min(100, parsed.efficiency || 50));
    const best_practices = Math.max(0, Math.min(100, parsed.best_practices || 50));

    const overall_score = Math.round((readability + correctness + efficiency + best_practices) / 4);

    return {
      success: true,
      feedback: parsed.feedback || 'Проверь свой код внимательнее!',
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 3)
        : [
            'Внимательно прочитай условие задачи',
            'Проверь форматирование вывода',
            'Проверь логику программы'
          ],
      quality_metrics: {
        overall_score,
        readability,
        correctness,
        efficiency,
        best_practices
      }
    };
  } catch (error) {
    console.error('Failed to parse AI JSON response:', error);
    console.log('Raw AI response:', text);

    // Fallback - попробовать извлечь из старого формата
    const feedbackMatch = text.match(/feedback["']?\s*:\s*["'](.+?)["']/);
    const feedback = feedbackMatch
      ? feedbackMatch[1]
      : 'Попробуй еще раз! Обрати внимание на результаты тестов.';

    return {
      success: true,
      feedback,
      suggestions: [
        'Сравни свой вывод с ожидаемым',
        'Проверь граничные случаи',
        'Используй подсказки из задания'
      ]
    };
  }
}

/**
 * Получить обратную связь от AI по коду студента
 * УЛУЧШЕННАЯ ВЕРСИЯ с адаптивными промптами
 */
export async function getAIFeedback(request: AIFeedbackRequest): Promise<AIFeedbackResponse> {
  // PRE-VALIDATION: Отклоняем слишком короткий или пустой код
  const codeLength = request.code.trim().replace(/\s+/g, '').length;
  if (codeLength < 10) {
    return {
      success: false,
      feedback: 'Пожалуйста, напишите решение задачи. Код слишком короткий.',
      suggestions: [
        'Прочитай условие задачи внимательно',
        'Напиши код, который решает задачу',
        'Убедись, что твой код выводит результат'
      ],
      quality_metrics: {
        overall_score: 0,
        readability: 0,
        correctness: 0,
        efficiency: 0,
        best_practices: 0
      }
    };
  }

  try {
    // Get teacher settings for the student's teacher or use defaults
    let teacherSettings;
    try {
      // For now, we get settings for the current user
      // In future, we should get the teacher assigned to this student's class
      teacherSettings = await getOrInitializeTeacherSettings();
    } catch (err) {
      console.warn('Could not fetch teacher settings, using defaults:', err);
      teacherSettings = null;
    }

    // Check if AI is enabled
    if (teacherSettings && !teacherSettings.ai_enabled) {
      return {
        success: false,
        feedback: 'AI временно недоступен, но ты можешь попробовать сам!',
        suggestions: [
          'Проверь, правильно ли ты понял условие задачи',
          'Убедись, что твой код выводит результат в нужном формате',
          'Попробуй протестировать код с примерами из задания'
        ],
        error: 'AI disabled by teacher'
      };
    }

    const prompt = createAdaptiveFeedbackPrompt(request);

    if (!prompt) {
      throw new Error('Failed to create prompt');
    }

    // Use settings from teacher or defaults
    const aiProvider = teacherSettings?.ai_provider || DEFAULT_AI_PROVIDER;
    const aiModel = teacherSettings?.ai_model || DEFAULT_MODEL;
    const aiTemperature = teacherSettings?.ai_temperature || DEFAULT_AI_TEMPERATURE;
    const aiMaxTokens = teacherSettings?.ai_max_tokens || 1000;
    const aiTopP = teacherSettings?.ai_top_p || 0.9;

    console.log('Calling Edge Function ai-feedback (adaptive mode)');
    console.log('AI Provider:', aiProvider);
    console.log('AI Model:', aiModel);
    console.log('Student proficiency:', request.student_profile?.proficiency_level || 'unknown');

    // Вызываем Edge Function
    const { data, error } = await supabase.functions.invoke('ai-feedback', {
      body: {
        provider: aiProvider,
        model: aiModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: aiTemperature,
        max_tokens: aiMaxTokens,
        top_p: aiTopP,
        // Include API keys if teacher has custom keys
        apiKey: aiProvider === 'groq' ? teacherSettings?.groq_api_key : teacherSettings?.openrouter_api_key
      }
    });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`Edge Function error: ${error.message || error}`);
    }

    if (!data) {
      throw new Error('No data returned from Edge Function');
    }

    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error('Нет ответа от AI модели');
    }

    const result = parseAIResponse(generatedText);
    return result;

  } catch (error) {
    console.error('AI Feedback error:', error);

    // Fallback подсказки
    return {
      success: false,
      feedback: 'AI временно недоступен, но ты можешь попробовать сам!',
      suggestions: [
        'Проверь, правильно ли ты понял условие задачи',
        'Убедись, что твой код выводит результат в нужном формате',
        'Попробуй протестировать код с примерами из задания'
      ],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
