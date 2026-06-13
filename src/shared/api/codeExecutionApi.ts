/**
 * API для выполнения кода через Piston API
 * Документация: https://emkc.org/api/v2/piston
 */

import type {
  ExecutionRequest,
  ExecutionResponse,
  TestCase,
  TestResult
} from '@/shared/types';

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

/**
 * Маппинг языков программирования для Piston API
 */
export function mapLanguage(language: string): string {
  const languageMap: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'csharp',
    ruby: 'ruby',
    go: 'go',
    rust: 'rust',
    php: 'php',
    swift: 'swift',
    kotlin: 'kotlin',
    typescript: 'typescript'
  };

  return languageMap[language.toLowerCase()] || language;
}

/**
 * Выполнить код через Piston API
 */
export async function executeCode(
  request: ExecutionRequest
): Promise<ExecutionResponse> {
  try {
    const response = await fetch(PISTON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: mapLanguage(request.language),
        version: '*', // использовать последнюю версию
        files: [
          {
            name: 'main',
            content: request.code
          }
        ],
        stdin: request.stdin || '',
        args: [],
        compile_timeout: 10000,
        run_timeout: 3000,
        compile_memory_limit: -1,
        run_memory_limit: -1
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const exitCode = data.run?.code ?? 1;
    const stdout = data.run?.stdout ?? '';
    const stderr = data.run?.stderr ?? '';

    return {
      success: exitCode === 0,
      results: {
        stdout,
        stderr,
        exitCode,
        executionTime: undefined // Piston API не возвращает время выполнения
      }
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Запустить код с несколькими тестовыми случаями
 */
export async function runTests(
  request: ExecutionRequest & { testCases: TestCase[] }
): Promise<ExecutionResponse> {
  const { testCases, ...executionRequest } = request;
  const testResults: TestResult[] = [];
  let allTestsPassed = true;
  let lastExecutionResult: ExecutionResult = {
    stdout: '',
    stderr: '',
    exitCode: 0
  };

  // Выполнить код для каждого тестового случая
  for (const testCase of testCases) {
    try {
      const result = await executeCode({
        ...executionRequest,
        stdin: testCase.input
      });

      // Сохранить результат последнего выполнения
      lastExecutionResult = result.results;

      // Очистить вывод от лишних пробелов и переносов строк
      const actualOutput = result.results.stdout.trim();
      const expectedOutput = testCase.expected_output.trim();

      const passed = actualOutput === expectedOutput && result.success;

      testResults.push({
        testCase,
        passed,
        actualOutput,
        expectedOutput,
        error: result.success ? undefined : result.results.stderr
      });

      if (!passed) {
        allTestsPassed = false;
      }
    } catch (error) {
      // В случае ошибки выполнения, тест провален
      testResults.push({
        testCase,
        passed: false,
        actualOutput: '',
        expectedOutput: testCase.expected_output,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      allTestsPassed = false;
    }
  }

  return {
    success: true, // runTests всегда успешен если мы смогли выполнить тесты
    results: lastExecutionResult,
    testResults,
    allTestsPassed
  };
}
