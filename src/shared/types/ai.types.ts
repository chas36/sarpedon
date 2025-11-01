/**
 * Типы для AI feedback системы
 */

/**
 * Запрос на анализ кода с помощью AI
 */
export interface AIFeedbackRequest {
  code: string;
  language: string;
  task_description: string;
  test_results?: {
    input: string;
    expected_output: string;
    actual_output: string;
    error?: string;
  }[];
  hints?: string[];
}

/**
 * Ответ от AI с обратной связью
 */
export interface AIFeedbackResponse {
  success: boolean;
  feedback: string;
  suggestions: string[];
  error?: string;
}

/**
 * Конфигурация для Hugging Face API
 */
export interface HuggingFaceConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}
