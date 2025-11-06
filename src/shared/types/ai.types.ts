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
  difficulty?: number;  // 1-10 для адаптации уровня подсказок
  test_results?: {
    input: string;
    expected_output: string;
    actual_output: string;
    error?: string;
  }[];
  hints?: string[];
  reference_solution?: string;  // Для сравнения подходов
}

/**
 * Оценка кода по различным факторам
 */
export interface CodeQualityMetrics {
  overall_score: number;  // 0-100
  readability: number;    // 0-100 (naming, formatting)
  correctness: number;    // 0-100 (logic, edge cases)
  efficiency: number;     // 0-100 (time/space complexity)
  best_practices: number; // 0-100 (language conventions)
}

/**
 * Ответ от AI с обратной связью
 */
export interface AIFeedbackResponse {
  success: boolean;
  feedback: string;
  suggestions: string[];
  quality_metrics?: CodeQualityMetrics;
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
