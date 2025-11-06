import { supabase } from '@/shared/lib/supabase';
import type { AIFeedbackRequest, AIFeedbackResponse } from '@/shared/types';

/**
 * Groq API Integration via Supabase Edge Function
 * Документация: https://console.groq.com/docs
 *
 * Бесплатный tier:
 * - 14,400 запросов в день
 * - 6,000-15,000 токенов в минуту
 * - OpenAI-совместимый API
 *
 * Модели:
 * - llama-3.3-70b-versatile - мощная, универсальная
 * - llama-3.1-8b-instant - быстрая, легкая
 * - mixtral-8x7b-32768 - хороший контекст
 */
const USE_AI = true;
const GROQ_MODEL = 'llama-3.1-8b-instant'; // Быстрая модель для бесплатного tier

// Низкая temperature для более консистентных ответов
const AI_TEMPERATURE = 0.3;

/**
 * Создать улучшенный промпт для детального анализа кода
 */
function createFeedbackPrompt(request: AIFeedbackRequest): string {
  const difficultyLevel = request.difficulty || 5;
  const isBeginnerLevel = difficultyLevel <= 3;

  let prompt = `Ты - AI наставник по программированию для образовательной платформы.

КРИТИЧЕСКИ ВАЖНО: Твои оценки должны быть КОНСИСТЕНТНЫМИ - один и тот же код всегда должен получать ОДИНАКОВУЮ оценку. Используй детерминированные критерии.

Задание: ${request.task_description}
Язык программирования: ${request.language}
Уровень сложности: ${difficultyLevel}/10 ${isBeginnerLevel ? '(начинающий уровень)' : ''}

Код студента:
\`\`\`${request.language}
${request.code}
\`\`\`
`;

  // Добавить результаты тестов
  if (request.test_results && request.test_results.length > 0) {
    const passedTests = request.test_results.filter(t => t.actual_output === t.expected_output).length;
    const totalTests = request.test_results.length;

    prompt += `\n📊 Результаты тестирования: ${passedTests}/${totalTests} тестов пройдено\n`;

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

  prompt += `\n📋 ЗАДАЧА АНАЛИЗА:

Оцени код строго по критериям (0-100 баллов каждый):

1. READABILITY (читаемость):
   - Понятные имена переменных/функций
   - Правильное форматирование
   - Комментарии там где нужно

2. CORRECTNESS (корректность):
   - Правильная логика для всех тестов
   - Обработка граничных случаев
   - Отсутствие логических ошибок

3. EFFICIENCY (эффективность):
   - Оптимальность для уровня ${difficultyLevel}/10
   - Нет избыточных операций

4. BEST_PRACTICES (лучшие практики):
   - Соблюдение конвенций ${request.language}
   - Правильное использование языковых конструкций

OVERALL_SCORE = среднее арифметическое 4-х оценок выше

Дай ${isBeginnerLevel ? 'простые и понятные' : 'детальные'} подсказки:
- Что конкретно не так (укажи на ошибки в тестах)
- Как направить мысль студента (НЕ давай готовое решение!)
- Максимум 3 подсказки, каждая < 100 символов

ФОРМАТ ОТВЕТА (строго JSON):
\`\`\`json
{
  "readability": <0-100>,
  "correctness": <0-100>,
  "efficiency": <0-100>,
  "best_practices": <0-100>,
  "overall_score": <среднее>,
  "feedback": "<2-3 предложения о главной проблеме>",
  "suggestions": [
    "<подсказка 1>",
    "<подсказка 2>",
    "<подсказка 3>"
  ]
}
\`\`\`

Отвечай ТОЛЬКО валидным JSON, без дополнительного текста. Язык: русский.`;

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
 */
export async function getAIFeedback(request: AIFeedbackRequest): Promise<AIFeedbackResponse> {
  // Если AI временно отключен, возвращаем умные fallback подсказки
  if (!USE_AI) {
    // Анализируем результаты тестов для персонализированных подсказок
    const suggestions: string[] = [];
    let feedback = 'Давай разберемся что пошло не так! ';

    if (request.test_results && request.test_results.length > 0) {
      const failedTests = request.test_results.filter(tr => tr.actual_output !== tr.expected_output);

      if (failedTests.length === request.test_results.length) {
        feedback += 'Все тесты не прошли. Проверь основную логику программы.';
        suggestions.push('Внимательно перечитай условие задачи - возможно ты неправильно понял что нужно сделать');
      } else {
        feedback += `${failedTests.length} из ${request.test_results.length} тестов не прошли. Ты на правильном пути!`;
        suggestions.push('Основная логика работает, но есть крайние случаи которые нужно обработать');
      }

      // Проверяем типичные ошибки
      const hasEmptyOutput = failedTests.some(t => !t.actual_output || t.actual_output.trim() === '');
      const hasExtraSpaces = failedTests.some(t => t.actual_output.trim() === t.expected_output.trim() && t.actual_output !== t.expected_output);
      const hasWrongFormat = failedTests.some(t => t.actual_output.length !== t.expected_output.length);

      if (hasEmptyOutput) {
        suggestions.push('Некоторые тесты не дают вывод - убедись что используешь print() для вывода результата');
      }
      if (hasExtraSpaces) {
        suggestions.push('Проблема с пробелами или переносами строк - проверь форматирование вывода');
      }
      if (hasWrongFormat && !hasEmptyOutput) {
        suggestions.push('Формат вывода не совпадает - сравни длину и структуру твоего вывода с ожидаемым');
      }
    }

    // Базовые подсказки если не нашли специфичных
    if (suggestions.length === 0) {
      suggestions.push('Сравни свой вывод с ожидаемым символ за символом');
      suggestions.push('Попробуй запустить код вручную с тестовыми данными');
    }

    suggestions.push('Используй подсказки из условия задачи - они помогут найти решение');

    return {
      success: false,
      feedback,
      suggestions,
      error: 'Using smart fallback hints (HuggingFace API unavailable)'
    };
  }

  try {
    const prompt = createFeedbackPrompt(request);

    // Логируем для отладки
    console.log('Calling Edge Function ai-feedback');
    console.log('AI Request Model:', GROQ_MODEL);

    // Вызываем Edge Function вместо прямого запроса к Groq API
    const { data, error } = await supabase.functions.invoke('ai-feedback', {
      body: {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: AI_TEMPERATURE,  // Низкая temperature для консистентности
        max_tokens: 800,  // Увеличено для структурированного ответа
        top_p: 0.9
      }
    });

    // Логируем ответ для отладки
    console.log('Edge Function response:', { data, error });

    if (error) {
      console.error('Edge Function error:', error);
      throw new Error(`Edge Function error: ${error.message || error}`);
    }

    if (!data) {
      throw new Error('No data returned from Edge Function');
    }

    // Groq использует OpenAI формат: data.choices[0].message.content
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error('Нет ответа от AI модели');
    }

    const result = parseAIResponse(generatedText);
    return result;

  } catch (error) {
    console.error('AI Feedback error:', error);

    // Вернуть fallback подсказки если AI не доступен
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
