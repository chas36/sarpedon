/**
 * Code execution types
 */

export interface ExecutionRequest {
  language: string;
  code: string;
  stdin?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime?: number;
}

export interface TestCase {
  input: string;
  expected_output: string;
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  error?: string;
}

export interface ExecutionResponse {
  success: boolean;
  results: ExecutionResult;
  testResults?: TestResult[];
  allTestsPassed?: boolean;
  error?: string;
}
