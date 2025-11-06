import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Spinner, CodeEditor } from '@/shared/components/ui';
import { getLevelById, getNextLevel } from '../api/levelsApi';
import { createSubmission, getLatestSubmission } from '../api/submissionsApi';
import { executeCode, runTests } from '@/shared/api/codeExecutionApi';
import { getAIFeedback } from '@/shared/api/aiFeedbackApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Level, ExecutionResponse, AIFeedbackResponse } from '@/shared/types';

export function SolveLevelPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [level, setLevel] = useState<Level | null>(null);
  const [nextLevel, setNextLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [running, setRunning] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null);
  const [aiFeedback, setAiFeedback] = useState<AIFeedbackResponse | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Reset state when levelId changes
  useEffect(() => {
    // Clear previous level's state
    setExecutionResult(null);
    setAiFeedback(null);
    setCode('');
    setRunning(false);
    setLoadingAI(false);
    setSaving(false);
    setSaveStatus('idle');
    setError(null);

    // Load new level data
    if (levelId && user) {
      loadLevel(levelId);
      loadLastSubmission(levelId, user.id);
      loadNextLevelInfo(levelId);
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

  const loadNextLevelInfo = async (id: string) => {
    try {
      const next = await getNextLevel(id);
      setNextLevel(next);
    } catch (err) {
      console.log('No next level found or error loading:', err);
      setNextLevel(null);
    }
  };

  const loadLastSubmission = async (lid: string, uid: string) => {
    try {
      const lastSubmission = await getLatestSubmission(uid, lid);
      if (lastSubmission) {
        setCode(lastSubmission.code);
      }
    } catch (err) {
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

  const handleGetAIFeedback = async (executionResult: ExecutionResponse) => {
    if (!level || !executionResult.testResults) return;

    try {
      setLoadingAI(true);
      setAiFeedback(null);

      const feedback = await getAIFeedback({
        code: code.trim(),
        language: level.language,
        task_description: level.description,
        test_results: executionResult.testResults.map(tr => ({
          input: tr.testCase.input,
          expected_output: tr.expectedOutput,
          actual_output: tr.actualOutput,
          error: tr.error
        })),
        hints: level.hints || []
      });

      setAiFeedback(feedback);
    } catch (err) {
      console.error('Failed to get AI feedback:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleRunCode = async () => {
    if (!level || !code.trim()) return;

    try {
      setRunning(true);
      setExecutionResult(null);

      if (level.test_cases && level.test_cases.length > 0) {
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

        if (levelId && user) {
          await createSubmission({
            user_id: user.id,
            level_id: levelId,
            code: code.trim(),
            status: result.allTestsPassed ? 'passed' : 'failed'
          });
        }

        if (!result.allTestsPassed) {
          handleGetAIFeedback(result);
        } else {
          setAiFeedback(null);
        }
      } else {
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

  const handleGoToNextLevel = () => {
    if (nextLevel) {
      navigate(`/student/levels/${nextLevel.id}/solve`);
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
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* Main Content - Left Side (2/3) */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
        {/* Header */}
        <div className="flex items-start justify-between sticky top-0 bg-learning-bg pb-2 z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-learning-text">
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
            ← Все уровни
          </Link>
        </div>

        {/* Description */}
        <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-4">
          <h2 className="text-base font-semibold text-learning-text mb-2">
            📝 Описание задачи
          </h2>
          <p className="text-learning-text whitespace-pre-wrap text-sm">
            {level.description}
          </p>

          {level.target_skills && level.target_skills.length > 0 && (
            <div className="mt-3">
              <h3 className="text-xs font-medium text-learning-muted mb-2">
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
        <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-4 flex-1">
          <h2 className="text-base font-semibold text-learning-text mb-2">
            💻 Твое решение
          </h2>
          <CodeEditor
            value={code}
            onChange={setCode}
            language={level.language}
            height="400px"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 sticky bottom-0 bg-learning-bg pt-2">
          <button
            onClick={handleRunCode}
            disabled={running || !code.trim()}
            className="flex-1 px-6 py-3 bg-learning-accent text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-center"
          >
            {running ? '⏳ Выполнение...' : '▶️ Запустить код'}
          </button>
          <button
            onClick={handleSaveCode}
            disabled={saving || !code.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? '💾 Сохранение...' : '💾 Сохранить'}
          </button>
          {saveStatus === 'saved' && (
            <div className="text-sm text-green-400">✓</div>
          )}
        </div>

        {/* Execution Results */}
        {executionResult && (
          <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-4">
            <h2 className="text-base font-semibold text-learning-text mb-3">
              📊 Результаты выполнения
            </h2>

            {executionResult.testResults && executionResult.testResults.length > 0 && (
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
                      <span className={`font-medium text-sm ${
                        testResult.passed ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {testResult.passed ? '✓' : '✗'} Тест {idx + 1}
                      </span>
                    </div>

                    {!testResult.passed && (
                      <div className="text-xs space-y-2">
                        <div>
                          <div className="text-learning-muted mb-1">Ожидалось:</div>
                          <pre className="bg-learning-bg p-2 rounded text-green-400">
                            {testResult.expectedOutput}
                          </pre>
                        </div>
                        <div>
                          <div className="text-learning-muted mb-1">Получено:</div>
                          <pre className="bg-learning-bg p-2 rounded text-red-400">
                            {testResult.actualOutput || '(пусто)'}
                          </pre>
                        </div>
                        {testResult.error && (
                          <div>
                            <div className="text-learning-muted mb-1">Ошибка:</div>
                            <pre className="bg-learning-bg p-2 rounded text-red-400">
                              {testResult.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(executionResult.results.stdout || executionResult.results.stderr) && (
              <div className="space-y-2 mt-3 text-xs">
                {executionResult.results.stdout && (
                  <div>
                    <div className="text-learning-muted mb-1">Вывод:</div>
                    <pre className="bg-learning-bg p-2 rounded text-learning-text overflow-x-auto">
                      {executionResult.results.stdout}
                    </pre>
                  </div>
                )}
                {executionResult.results.stderr && (
                  <div>
                    <div className="text-learning-muted mb-1">Ошибки:</div>
                    <pre className="bg-learning-bg p-2 rounded text-red-400 overflow-x-auto">
                      {executionResult.results.stderr}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar - Right Side (1/3) */}
      <div className="w-96 flex flex-col gap-4">
        {/* Success Message with Next Button */}
        {executionResult?.allTestsPassed && (
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-2 border-green-500/30 rounded-lg p-6 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-green-400 mb-2">
              Отлично!
            </h2>
            <p className="text-learning-text mb-4">
              Все тесты пройдены! Ты молодец!
            </p>
            {nextLevel ? (
              <button
                onClick={handleGoToNextLevel}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                Следующее задание →
              </button>
            ) : (
              <Link
                to="/student/levels"
                className="block w-full px-6 py-3 bg-learning-accent text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Все уровни
              </Link>
            )}
          </div>
        )}

        {/* AI Helper Section */}
        <div className="bg-gradient-to-br from-learning-accent/5 to-purple-500/5 border border-learning-accent/20 rounded-lg p-4 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-3xl">🤖</div>
            <div>
              <h2 className="text-base font-bold text-learning-accent">
                AI Наставник
              </h2>
              <p className="text-xs text-learning-muted">
                Твой помощник
              </p>
            </div>
          </div>

          {loadingAI && (
            <div className="flex items-center gap-2 text-sm">
              <Spinner size="sm" />
              <span className="text-learning-accent">Анализирую...</span>
            </div>
          )}

          {aiFeedback && !loadingAI && (
            <div className="space-y-3">
              <div className="text-sm text-learning-text bg-learning-surface/50 p-3 rounded">
                {aiFeedback.feedback}
              </div>

              {aiFeedback.suggestions && aiFeedback.suggestions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-learning-muted mb-2">
                    💡 Подсказки:
                  </h3>
                  <ul className="space-y-2">
                    {aiFeedback.suggestions.map((suggestion, idx) => (
                      <li
                        key={idx}
                        className="flex gap-2 text-sm text-learning-text bg-learning-surface/50 p-2 rounded"
                      >
                        <span className="text-learning-accent font-bold shrink-0">{idx + 1}.</span>
                        <span className="text-xs">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!aiFeedback && !loadingAI && !executionResult?.allTestsPassed && (
            <div className="text-sm text-learning-muted text-center py-6">
              Запусти код, и я помогу тебе, если что-то пойдет не так! 😊
            </div>
          )}

          {executionResult?.allTestsPassed && (
            <div className="text-sm text-green-400 text-center py-6">
              Отличная работа! Задание выполнено! 🌟
            </div>
          )}
        </div>

        {/* Hints Section */}
        {level.hints && level.hints.length > 0 && (
          <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-learning-text mb-2">
              💭 Подсказки к заданию
            </h3>
            <ul className="space-y-2">
              {level.hints.map((hint, idx) => (
                <li
                  key={idx}
                  className="text-xs text-learning-muted bg-learning-bg p-2 rounded"
                >
                  <span className="text-learning-accent font-bold">{idx + 1}.</span> {hint}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
