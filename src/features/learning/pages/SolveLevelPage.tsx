import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spinner, CodeEditor } from '@/shared/components/ui';
import { getLevelById } from '../api/levelsApi';
import { createSubmission, getLatestSubmission } from '../api/submissionsApi';
import { executeCode, runTests } from '@/shared/api/codeExecutionApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Level, ExecutionResponse } from '@/shared/types';

export function SolveLevelPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const { user } = useAuthStore();
  const [level, setLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [running, setRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null);

  useEffect(() => {
    if (levelId && user) {
      loadLevel(levelId);
      loadLastSubmission(levelId, user.id);
    }
  }, [levelId, user]);

  const loadLevel = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLevelById(id);
      setLevel(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
      if (errorMessage.includes('not found')) {
        setError('Уровень не найден');
      } else {
        setError('Ошибка загрузки уровня');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLastSubmission = async (lid: string, uid: string) => {
    try {
      const lastSubmission = await getLatestSubmission(uid, lid);
      if (lastSubmission) {
        setCode(lastSubmission.code);
      }
    } catch (err) {
      // Ignore error - just means no previous submission
      console.log('No previous submission found');
    }
  };

  const handleSaveCode = async () => {
    if (!levelId || !code.trim() || !user) return;

    try {
      setSaving(true);
      setSaveStatus('idle');
      await createSubmission({
        user_id: user.id,
        level_id: levelId,
        code: code.trim(),
        status: 'pending'
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      console.error('Failed to save submission:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRunCode = async () => {
    if (!level || !code.trim()) return;

    try {
      setRunning(true);
      setExecutionResult(null);

      // Если есть тестовые случаи, запустить с тестами
      if (level.test_cases && level.test_cases.length > 0) {
        // Преобразовать test_cases из базы данных в формат execution API
        const testCases = level.test_cases.map(tc => ({
          input: tc.input,
          expected_output: tc.output
        }));

        const result = await runTests({
          language: level.language,
          code: code.trim(),
          testCases
        });

        setExecutionResult(result);

        // Автоматически сохранить результат
        if (levelId && user) {
          await createSubmission({
            user_id: user.id,
            level_id: levelId,
            code: code.trim(),
            status: result.allTestsPassed ? 'passed' : 'failed'
          });
        }
      } else {
        // Если нет тестовых случаев, просто выполнить код
        const result = await executeCode({
          language: level.language,
          code: code.trim()
        });

        setExecutionResult(result);
      }
    } catch (err) {
      console.error('Failed to execute code:', err);
      setExecutionResult({
        success: false,
        results: {
          stdout: '',
          stderr: err instanceof Error ? err.message : 'Ошибка выполнения кода',
          exitCode: 1
        },
        error: err instanceof Error ? err.message : 'Ошибка выполнения кода'
      });
    } finally {
      setRunning(false);
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels = {
      easy: 'Легко',
      medium: 'Средне',
      hard: 'Сложно'
    };
    return labels[difficulty as keyof typeof labels] || difficulty;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-500/10 text-green-400 border-green-500/20',
      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      hard: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-learning-surface text-learning-text';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">
            {error}
          </h2>
          <div className="space-y-4 mt-4">
            <button
              onClick={() => levelId && loadLevel(levelId)}
              className="px-4 py-2 bg-learning-accent text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Попробовать снова
            </button>
            <div>
              <Link
                to="/student/levels"
                className="text-learning-accent hover:underline"
              >
                Назад к уровням
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!level) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-learning-text">
              {level.title}
            </h1>
            <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(level.difficulty)}`}>
              {getDifficultyLabel(level.difficulty)}
            </span>
          </div>
          {level.topic && (
            <p className="text-sm text-learning-muted">
              {level.topic}
            </p>
          )}
        </div>
        <Link
          to="/student/levels"
          className="text-sm text-learning-accent hover:underline"
        >
          Назад к уровням
        </Link>
      </div>

      {/* Description */}
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-learning-text mb-3">
          Описание задачи
        </h2>
        <p className="text-learning-text whitespace-pre-wrap">
          {level.description}
        </p>

        {/* Target Skills */}
        {level.target_skills && level.target_skills.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-learning-muted mb-2">
              Навыки:
            </h3>
            <div className="flex flex-wrap gap-2">
              {level.target_skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 bg-learning-accent/10 text-learning-accent rounded"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Code Editor */}
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-learning-text mb-3">
          Ваше решение
        </h2>
        <CodeEditor
          value={code}
          onChange={setCode}
          language={level.language}
          height="500px"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunCode}
            disabled={running || !code.trim()}
            className="px-6 py-3 bg-learning-accent text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {running ? 'Выполнение...' : 'Запустить код'}
          </button>
          <button
            onClick={handleSaveCode}
            disabled={saving || !code.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
        {saveStatus === 'saved' && (
          <div className="text-sm text-green-400">
            ✓ Код сохранен
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="text-sm text-red-400">
            ✗ Ошибка сохранения
          </div>
        )}
      </div>

      {/* Execution Results */}
      {executionResult && (
        <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-learning-text mb-4">
            Результаты выполнения
          </h2>

          {/* Test Results Summary */}
          {executionResult.testResults && executionResult.testResults.length > 0 && (
            <div className="mb-4">
              <div className={`p-4 rounded-lg ${
                executionResult.allTestsPassed
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-lg font-semibold ${
                    executionResult.allTestsPassed ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {executionResult.allTestsPassed ? '✓ Все тесты прошли!' : '✗ Некоторые тесты не прошли'}
                  </span>
                  <span className="text-sm text-learning-muted">
                    {executionResult.testResults.filter(t => t.passed).length} / {executionResult.testResults.length}
                  </span>
                </div>

                {/* Individual Test Results */}
                <div className="space-y-2">
                  {executionResult.testResults.map((testResult, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded ${
                        testResult.passed
                          ? 'bg-green-500/5 border border-green-500/10'
                          : 'bg-red-500/5 border border-red-500/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`font-medium ${
                          testResult.passed ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {testResult.passed ? '✓' : '✗'} Тест {idx + 1}
                        </span>
                      </div>

                      {testResult.testCase.description && (
                        <div className="text-sm text-learning-muted mb-2">
                          {testResult.testCase.description}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-learning-muted mb-1">Входные данные:</div>
                          <pre className="bg-learning-bg p-2 rounded text-learning-text overflow-x-auto">
                            {testResult.testCase.input || '(пусто)'}
                          </pre>
                        </div>
                        <div>
                          <div className="text-learning-muted mb-1">Ожидаемый вывод:</div>
                          <pre className="bg-learning-bg p-2 rounded text-green-400 overflow-x-auto">
                            {testResult.expectedOutput}
                          </pre>
                        </div>
                      </div>

                      {!testResult.passed && (
                        <div className="mt-2">
                          <div className="text-learning-muted mb-1 text-sm">Ваш вывод:</div>
                          <pre className="bg-learning-bg p-2 rounded text-red-400 overflow-x-auto text-sm">
                            {testResult.actualOutput || '(пусто)'}
                          </pre>
                          {testResult.error && (
                            <div className="mt-2">
                              <div className="text-learning-muted mb-1 text-sm">Ошибка:</div>
                              <pre className="bg-learning-bg p-2 rounded text-red-400 overflow-x-auto text-sm">
                                {testResult.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Standard Output/Error */}
          {(executionResult.results.stdout || executionResult.results.stderr) && (
            <div className="space-y-3">
              {executionResult.results.stdout && (
                <div>
                  <div className="text-sm text-learning-muted mb-2">Вывод (stdout):</div>
                  <pre className="bg-learning-bg p-3 rounded text-learning-text overflow-x-auto text-sm">
                    {executionResult.results.stdout}
                  </pre>
                </div>
              )}

              {executionResult.results.stderr && (
                <div>
                  <div className="text-sm text-learning-muted mb-2">Ошибки (stderr):</div>
                  <pre className="bg-learning-bg p-3 rounded text-red-400 overflow-x-auto text-sm">
                    {executionResult.results.stderr}
                  </pre>
                </div>
              )}

              <div className="text-xs text-learning-muted">
                Код завершения: {executionResult.results.exitCode}
              </div>
            </div>
          )}

          {/* Error Message */}
          {executionResult.error && !executionResult.results.stdout && !executionResult.results.stderr && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-4">
              <div className="text-red-400 font-medium mb-2">Ошибка выполнения</div>
              <div className="text-sm text-learning-text">{executionResult.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
