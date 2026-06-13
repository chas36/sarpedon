import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as codeExecutionApi from '../codeExecutionApi';
import type { TestCase } from '@/shared/types';

// Mock fetch globally
global.fetch = vi.fn();

describe('codeExecutionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeCode', () => {
    it('should execute Python code successfully', async () => {
      const mockResponse = {
        run: {
          stdout: 'Hello, World!\n',
          stderr: '',
          code: 0
        }
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await codeExecutionApi.executeCode({
        language: 'python',
        code: 'print("Hello, World!")'
      });

      expect(result.success).toBe(true);
      expect(result.results.stdout).toBe('Hello, World!\n');
      expect(result.results.exitCode).toBe(0);
    });

    it('should handle execution errors', async () => {
      const mockResponse = {
        run: {
          stdout: '',
          stderr: 'SyntaxError: invalid syntax\n',
          code: 1
        }
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await codeExecutionApi.executeCode({
        language: 'python',
        code: 'print("Hello'
      });

      expect(result.success).toBe(false);
      expect(result.results.stderr).toContain('SyntaxError');
      expect(result.results.exitCode).toBe(1);
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        codeExecutionApi.executeCode({
          language: 'python',
          code: 'print("test")'
        })
      ).rejects.toThrow('Network error');
    });

    it('should pass stdin to the code', async () => {
      const mockResponse = {
        run: {
          stdout: 'Input: test\n',
          stderr: '',
          code: 0
        }
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await codeExecutionApi.executeCode({
        language: 'python',
        code: 'x = input(); print(f"Input: {x}")',
        stdin: 'test'
      });

      expect(result.success).toBe(true);
      expect(result.results.stdout).toContain('test');
    });
  });

  describe('runTests', () => {
    it('should run all test cases and pass', async () => {
      const mockResponse = {
        run: {
          stdout: 'Hello, World!\n',
          stderr: '',
          code: 0
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const testCases: TestCase[] = [
        { input: '', expected_output: 'Hello, World!' }
      ];

      const result = await codeExecutionApi.runTests({
        language: 'python',
        code: 'print("Hello, World!")',
        testCases
      });

      expect(result.success).toBe(true);
      expect(result.allTestsPassed).toBe(true);
      expect(result.testResults).toHaveLength(1);
      expect(result.testResults![0].passed).toBe(true);
    });

    it('should detect failing test cases', async () => {
      const mockResponse = {
        run: {
          stdout: 'Hello!\n',
          stderr: '',
          code: 0
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const testCases: TestCase[] = [
        { input: '', expected_output: 'Hello, World!' }
      ];

      const result = await codeExecutionApi.runTests({
        language: 'python',
        code: 'print("Hello!")',
        testCases
      });

      expect(result.success).toBe(true);
      expect(result.allTestsPassed).toBe(false);
      expect(result.testResults![0].passed).toBe(false);
    });

    it('should handle multiple test cases', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ run: { stdout: '2\n', stderr: '', code: 0 } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ run: { stdout: '4\n', stderr: '', code: 0 } })
        } as Response);

      const testCases: TestCase[] = [
        { input: '1 1', expected_output: '2' },
        { input: '2 2', expected_output: '4' }
      ];

      const result = await codeExecutionApi.runTests({
        language: 'python',
        code: 'a, b = map(int, input().split()); print(a + b)',
        testCases
      });

      expect(result.success).toBe(true);
      expect(result.allTestsPassed).toBe(true);
      expect(result.testResults).toHaveLength(2);
    });

    it('should handle execution errors in tests', async () => {
      const mockResponse = {
        run: {
          stdout: '',
          stderr: 'RuntimeError\n',
          code: 1
        }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const testCases: TestCase[] = [
        { input: '', expected_output: 'test' }
      ];

      const result = await codeExecutionApi.runTests({
        language: 'python',
        code: 'raise RuntimeError()',
        testCases
      });

      expect(result.success).toBe(true);
      expect(result.allTestsPassed).toBe(false);
      expect(result.testResults![0].passed).toBe(false);
      expect(result.testResults![0].error).toContain('RuntimeError');
    });
  });

  describe('mapLanguage', () => {
    it('should map language names correctly', () => {
      expect(codeExecutionApi.mapLanguage('python')).toBe('python');
      expect(codeExecutionApi.mapLanguage('javascript')).toBe('javascript');
      expect(codeExecutionApi.mapLanguage('java')).toBe('java');
    });
  });
});
