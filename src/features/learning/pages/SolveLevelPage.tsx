import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Spinner, CodeEditor, Modal } from '@/shared/components/ui';
import { getLevelById, getNextLevel } from '../api/levelsApi';
import { createSubmission, getLatestSubmission, getSubmissionHistory } from '../api/submissionsApi';
import type { Submission } from '@/shared/types';
import { executeCode, runTests } from '@/shared/api/codeExecutionApi';
import { getAIFeedback } from '@/shared/api/aiFeedbackApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Level, ExecutionResponse, AIFeedbackResponse, StudentProfile } from '@/shared/types';
import { useSubmissionCharacter } from '@/features/characters';
import { CharacterDisplay, CharacterEventOverlay } from '@/features/characters/components';
import type { CharacterResponse } from '@/features/characters';
import { supabase } from '@/shared/lib/supabase';

// ===== FEATURE FLAG: Temporarily disable characters =====
// Set to true when character graphics are ready
const ENABLE_CHARACTERS = false;

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
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Submission[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);

  // Character system state
  const [showCharacter, setShowCharacter] = useState(false);
  const [characterResponse, setCharacterResponse] = useState<CharacterResponse | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  // Character hook
  const { showFeedbackCharacter } = useSubmissionCharacter(user?.id || '');

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
      loadStudentProfile(user.id);
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

  const loadStudentProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('proficiency_level, proficiency_score')
        .eq('id', uid)
        .single();

      if (error) {
        console.error('Failed to load student profile:', error);
        return;
      }

      if (data) {
        setStudentProfile({
          proficiency_level: data.proficiency_level || 'beginner',
          proficiency_score: data.proficiency_score || 0,
          weak_areas: [], // TODO: Load from proficiency_history or user_skill_profile
          common_mistakes: []
        });
      }
    } catch (err) {
      console.error('Error loading student profile:', err);
    }
  };

  const loadHistory = async () => {
    if (!levelId || !user) return;
    try {
      const submissions = await getSubmissionHistory(user.id, levelId);
      setHistory(submissions);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to load submission history:', err);
    }
  };

  const restoreVersion = (submission: Submission) => {
    setCode(submission.code);
    setShowHistory(false);
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
      setLoadingAI(false);

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

        // Получаем AI feedback если тесты не прошли
        let aiResponse = null;
        if (!result.allTestsPassed) {
          setLoadingAI(true);
          try {
            aiResponse = await getAIFeedback({
              code: code.trim(),
              language: level.language,
              task_description: level.description,
              difficulty: level.difficulty,
              test_results: result.testResults.map(tr => ({
                input: tr.testCase.input,
                expected_output: tr.expectedOutput,
                actual_output: tr.actualOutput,
                error: tr.error
              })),
              hints: level.hints || [],
              reference_solution: level.reference_solution,
              student_profile: studentProfile || undefined
            });
            setAiFeedback(aiResponse);
          } catch (err) {
            console.error('Failed to get AI feedback:', err);
          } finally {
            setLoadingAI(false);
          }
        } else {
          setAiFeedback(null);
        }

        // Сохраняем submission с метриками качества
        let submissionId: string | undefined;
        if (levelId && user) {
          const submission = await createSubmission({
            user_id: user.id,
            level_id: levelId,
            code: code.trim(),
            status: result.allTestsPassed ? 'passed' : 'failed',
            quality_metrics: aiResponse?.quality_metrics,
            ai_feedback: aiResponse?.feedback
          });
          submissionId = submission?.id;

          // ===== CHARACTER SYSTEM: Show character with feedback =====
          if (ENABLE_CHARACTERS) {
            try {
              const qualityScore = aiResponse?.quality_metrics?.overall_score || 0;
              const characterResp = await showFeedbackCharacter(
                result.allTestsPassed,
                qualityScore,
                attemptNumber,
                submissionId || '',
                {
                  consecutiveErrors,
                  totalCompleted,
                  levelDifficulty: level.difficulty,
                }
              );

              setCharacterResponse(characterResp);
              setShowCharacter(true);

              // Update attempt tracking
              if (result.allTestsPassed) {
                setAttemptNumber(1); // Reset for next level
                setConsecutiveErrors(0);
                setTotalCompleted(prev => prev + 1);
              } else {
                setAttemptNumber(prev => prev + 1);
                setConsecutiveErrors(prev => prev + 1);
              }
            } catch (err) {
              console.error('Failed to show character:', err);
              // Continue without character on error
            }
          }
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

        {/* Examples Section */}
        {level.test_cases && level.test_cases.length > 0 && (
          <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-4">
            <h2 className="text-base font-semibold text-learning-text mb-3">
              📋 Примеры ввода и вывода
            </h2>
            <div className="space-y-3">
              {level.test_cases.slice(0, 3).map((testCase, idx) => (
                <div
                  key={idx}
                  className="bg-learning-bg border border-learning-muted/10 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-learning-accent">
                      Пример {idx + 1}
                    </span>
                    {testCase.description && (
                      <span className="text-xs text-learning-muted">
                        • {testCase.description}
                      </span>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-learning-muted mb-1">
                        Входные данные:
                      </div>
                      <pre className="text-xs bg-learning-surface p-2 rounded text-learning-text overflow-x-auto">
                        {testCase.input || '(нет)'}
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-learning-muted mb-1">
                        Ожидаемый вывод:
                      </div>
                      <pre className="text-xs bg-learning-surface p-2 rounded text-green-400 overflow-x-auto">
                        {testCase.output}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
              {level.test_cases.length > 3 && (
                <div className="text-xs text-learning-muted text-center">
                  ... и ещё {level.test_cases.length - 3} тест(ов) для проверки
                </div>
              )}
            </div>
          </div>
        )}

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
          <button
            onClick={loadHistory}
            className="px-4 py-3 bg-learning-surface text-learning-text rounded-lg hover:bg-learning-muted/20 transition-colors font-medium"
            title="Посмотреть историю версий кода"
          >
            📜 История
          </button>
          {saveStatus === 'saved' && (
            <div className="text-sm text-green-400">✓</div>
          )}
        </div>

        {/* Execution Results */}
        {executionResult && (
          <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-4 space-y-4">
            <h2 className="text-base font-semibold text-learning-text mb-3">
              📊 Результаты выполнения
            </h2>

            {/* Console Output Section - Always visible */}
            <div className="bg-learning-bg border border-learning-muted/10 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-learning-text mb-2 flex items-center gap-2">
                <span>🖥️</span>
                Консольный вывод
              </h3>

              {executionResult.results.stdout || executionResult.results.stderr ? (
                <div className="space-y-3">
                  {executionResult.results.stdout && (
                    <div>
                      <div className="text-xs text-learning-muted mb-1">Стандартный вывод (stdout):</div>
                      <pre className="bg-learning-surface p-3 rounded text-learning-text overflow-x-auto text-xs font-mono border border-learning-muted/10">
{executionResult.results.stdout}</pre>
                    </div>
                  )}
                  {executionResult.results.stderr && (
                    <div>
                      <div className="text-xs text-red-400 mb-1">⚠️ Ошибки (stderr):</div>
                      <pre className="bg-red-500/5 p-3 rounded text-red-400 overflow-x-auto text-xs font-mono border border-red-500/20">
{executionResult.results.stderr}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-learning-muted italic">
                  Нет вывода в консоль
                </div>
              )}
            </div>

            {/* Test Results Section */}
            {executionResult.testResults && executionResult.testResults.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-learning-text mb-2">
                  Результаты тестов
                </h3>
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
              {/* Quality Metrics */}
              {aiFeedback.quality_metrics && (
                <div className="bg-learning-surface/50 p-3 rounded">
                  <h3 className="text-xs font-semibold text-learning-muted mb-2">
                    📊 Оценка кода:
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-learning-muted">Общая оценка:</span>
                      <span className={`text-sm font-bold ${
                        aiFeedback.quality_metrics.overall_score >= 75 ? 'text-green-400' :
                        aiFeedback.quality_metrics.overall_score >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {aiFeedback.quality_metrics.overall_score}/100
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-learning-muted">Читаемость:</div>
                        <div className="text-learning-text font-medium">{aiFeedback.quality_metrics.readability}/100</div>
                      </div>
                      <div>
                        <div className="text-learning-muted">Корректность:</div>
                        <div className="text-learning-text font-medium">{aiFeedback.quality_metrics.correctness}/100</div>
                      </div>
                      <div>
                        <div className="text-learning-muted">Эффективность:</div>
                        <div className="text-learning-text font-medium">{aiFeedback.quality_metrics.efficiency}/100</div>
                      </div>
                      <div>
                        <div className="text-learning-muted">Лучшие практики:</div>
                        <div className="text-learning-text font-medium">{aiFeedback.quality_metrics.best_practices}/100</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-learning-surface border border-learning-muted/20 rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-learning-text">📜 История версий кода</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-learning-muted hover:text-learning-text transition-colors"
              >
                ✕
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-learning-muted text-center py-8">Пока нет сохраненных версий</p>
            ) : (
              <div className="space-y-3">
                {history.map((submission, idx) => (
                  <div
                    key={submission.id}
                    className="bg-learning-bg border border-learning-muted/10 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-learning-accent">
                            Версия {submission.version || idx + 1}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            submission.status === 'passed'
                              ? 'bg-green-500/10 text-green-400'
                              : submission.status === 'failed'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {submission.status === 'passed' ? '✓ Пройдено' :
                             submission.status === 'failed' ? '✗ Не пройдено' : 'В процессе'}
                          </span>
                          {submission.quality_metrics && (
                            <span className="text-xs text-learning-muted">
                              Оценка: {submission.quality_metrics.overall_score}/100
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-learning-muted">
                          {new Date(submission.submitted_at).toLocaleString('ru-RU')}
                        </div>
                      </div>
                      <button
                        onClick={() => restoreVersion(submission)}
                        className="px-3 py-1 bg-learning-accent text-white text-sm rounded hover:bg-blue-600 transition-colors"
                      >
                        Восстановить
                      </button>
                    </div>
                    <pre className="text-xs text-learning-text bg-learning-surface/50 p-2 rounded overflow-x-auto">
                      {submission.code}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== CHARACTER MODAL ===== */}
      {ENABLE_CHARACTERS && showCharacter && characterResponse && (
        <Modal
          isOpen={showCharacter}
          onClose={() => setShowCharacter(false)}
          size="large"
        >
          {/* Show event overlay if there's an event */}
          {characterResponse.event ? (
            <CharacterEventOverlay
              event={characterResponse.event}
              onComplete={() => setShowCharacter(false)}
            />
          ) : (
            /* Show regular character feedback */
            <CharacterDisplay
              character={characterResponse.characters[0]}
              mood={characterResponse.mood}
              message={characterResponse.message}
              emoji={characterResponse.emoji}
              onComplete={() => setShowCharacter(false)}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
