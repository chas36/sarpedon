import type { AIFeedbackRequest, AIFeedbackResponse } from '@/shared/types';

/**
 * ВАЖНО: Hugging Face закрыл бесплатный Serverless Inference API с 1 ноября 2025
 *
 * Все endpoints возвращают 404:
 * - https://api-inference.huggingface.co (старый, не работает)
 * - https://router.huggingface.co/hf-inference (новый, требует оплату)
 *
 * АЛЬТЕРНАТИВЫ для будущей интеграции:
 * 1. Groq API - бесплатный, быстрый (30 req/мин)
 *    https://console.groq.com/
 *
 * 2. Ollama - локальный, полностью бесплатный
 *    Требует backend сервер для запуска моделей
 *
 * 3. OpenRouter - агрегатор с бесплатным tier
 *    https://openrouter.ai/
 *
 * ТЕКУЩЕЕ РЕШЕНИЕ: Используем умные fallback подсказки
 * Они анализируют результаты тестов и дают полезные советы без AI
 */
const USE_AI = false;
const HF_INFERENCE_URL = 'https://api-inference.huggingface.co/models';
const CODE_MODEL = 'codellama/CodeLlama-7b-hf';

/**
 * Получить AI ключ из переменных окружения
 */
function getHuggingFaceApiKey(): string {
  const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_HUGGINGFACE_API_KEY не установлен в .env');
  }
  return apiKey;
}

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
    const apiKey = getHuggingFaceApiKey();
    const prompt = createFeedbackPrompt(request);

    // Логируем для отладки
    const requestUrl = `${HF_INFERENCE_URL}/${CODE_MODEL}`;
    console.log('AI Request URL:', requestUrl);
    console.log('AI Request has API key:', !!apiKey);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.95,
          return_full_text: false
        }
      })
    });

    // Логируем ответ для отладки
    console.log('AI Response status:', response.status);
    console.log('AI Response OK:', response.ok);

    if (!response.ok) {
      // Проверить, не модель ли загружается
      if (response.status === 503) {
        const data = await response.json().catch(() => ({}));
        if (data.error?.includes('loading')) {
          return {
            success: false,
            feedback: 'AI модель загружается. Попробуйте через 20-30 секунд.',
            suggestions: ['Модель Hugging Face может требовать время на загрузку при первом запуске'],
            error: 'Model is loading'
          };
        }
      }

      // При ошибках 404, 401, 403 - вернуть fallback вместо throw
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        console.warn(`Hugging Face API error: ${response.status}. Используем fallback подсказки.`);
        return {
          success: false,
          feedback: 'AI сервис временно недоступен, но ты можешь попробовать сам!',
          suggestions: [
            'Проверь, правильно ли ты понял условие задачи',
            'Убедись, что твой код выводит результат в нужном формате',
            'Попробуй протестировать код с примерами из задания',
            'Обрати внимание на ожидаемый вывод в результатах тестов'
          ],
          error: `API error ${response.status}`
        };
      }

      throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Hugging Face возвращает массив с одним объектом
    const generatedText = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;

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
