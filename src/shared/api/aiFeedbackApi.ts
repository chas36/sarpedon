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

/**
 * Создать промпт для анализа кода
 */
function createFeedbackPrompt(request: AIFeedbackRequest): string {
  let prompt = `Ты - AI наставник по программированию для образовательной платформы. Твоя задача - помочь студенту улучшить свой код.

Задание: ${request.task_description}

Язык программирования: ${request.language}

Код студента:
\`\`\`${request.language}
${request.code}
\`\`\`
`;

  // Добавить результаты тестов, если есть
  if (request.test_results && request.test_results.length > 0) {
    prompt += '\nРезультаты тестов:\n';
    request.test_results.forEach((test, idx) => {
      prompt += `\nТест ${idx + 1}:
Входные данные: ${test.input || '(пусто)'}
Ожидаемый вывод: ${test.expected_output}
Фактический вывод: ${test.actual_output}
`;
      if (test.error) {
        prompt += `Ошибка: ${test.error}\n`;
      }
    });
  }

  // Добавить подсказки, если есть
  if (request.hints && request.hints.length > 0) {
    prompt += '\nПодсказки к заданию:\n';
    request.hints.forEach((hint, idx) => {
      prompt += `${idx + 1}. ${hint}\n`;
    });
  }

  prompt += `\nПроанализируй код студента и предоставь:
1. Краткую обратную связь (2-3 предложения) о том, что не так
2. Конкретные подсказки (не более 3-х) как исправить проблему, НЕ давая готовое решение

Отвечай на русском языке. Будь конструктивным и поддерживающим.

Формат ответа:
ОБРАТНАЯ СВЯЗЬ: <твой анализ>

ПОДСКАЗКИ:
- <подсказка 1>
- <подсказка 2>
- <подсказка 3>`;

  return prompt;
}

/**
 * Парсить ответ от AI модели
 */
function parseAIResponse(text: string): { feedback: string; suggestions: string[] } {
  const feedbackMatch = text.match(/ОБРАТНАЯ СВЯЗЬ:\s*(.+?)(?=ПОДСКАЗКИ:|$)/s);
  const suggestionsMatch = text.match(/ПОДСКАЗКИ:\s*(.+)/s);

  const feedback = feedbackMatch
    ? feedbackMatch[1].trim()
    : 'Попробуй еще раз! Обрати внимание на условие задачи.';

  const suggestions: string[] = [];
  if (suggestionsMatch) {
    const suggestionText = suggestionsMatch[1];
    const lines = suggestionText.split('\n').filter(line => line.trim().startsWith('-'));
    lines.forEach(line => {
      const cleaned = line.replace(/^-\s*/, '').trim();
      if (cleaned) {
        suggestions.push(cleaned);
      }
    });
  }

  // Если не нашли подсказки, добавить дефолтную
  if (suggestions.length === 0) {
    suggestions.push('Внимательно прочитай условие задачи еще раз');
    suggestions.push('Проверь, совпадает ли твой вывод с ожидаемым форматом');
  }

  return { feedback, suggestions };
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
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.95
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

    const { feedback, suggestions } = parseAIResponse(generatedText);

    return {
      success: true,
      feedback,
      suggestions
    };

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
