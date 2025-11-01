import type { AIFeedbackRequest, AIFeedbackResponse } from '@/shared/types';

/**
 * Hugging Face Inference API endpoint
 */
const HF_INFERENCE_URL = 'https://api-inference.huggingface.co/models';

/**
 * Модель для анализа кода
 * Qwen/Qwen3-Coder - специализированная модель для работы с кодом
 */
const CODE_MODEL = 'Qwen/Qwen2.5-Coder-32B-Instruct';

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
  try {
    const apiKey = getHuggingFaceApiKey();
    const prompt = createFeedbackPrompt(request);

    const response = await fetch(`${HF_INFERENCE_URL}/${CODE_MODEL}`, {
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

    if (!response.ok) {
      // Проверить, не модель ли загружается
      if (response.status === 503) {
        const data = await response.json();
        if (data.error?.includes('loading')) {
          return {
            success: false,
            feedback: 'AI модель загружается. Попробуйте через 20-30 секунд.',
            suggestions: ['Модель Hugging Face может требовать время на загрузку при первом запуске'],
            error: 'Model is loading'
          };
        }
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
