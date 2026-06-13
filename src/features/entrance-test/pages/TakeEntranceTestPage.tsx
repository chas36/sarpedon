import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@/shared/components/ui';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  getEntranceTestWithQuestions,
  startEntranceTest,
  submitAnswer,
  completeEntranceTest,
  updateTimeSpent
} from '../api/entranceTestApi';
import type { TestWithQuestions, EntranceTestQuestion } from '../api/entranceTestApi';

export function TakeEntranceTestPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [test, setTest] = useState<TestWithQuestions | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);

  // Load test
  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  // Timer
  useEffect(() => {
    if (!testStarted || testCompleted) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [testStarted, testCompleted]);

  // Auto-save time every 10 seconds
  useEffect(() => {
    if (!attemptId || !testStarted || testCompleted) return;

    const interval = setInterval(() => {
      updateTimeSpent(attemptId, timeElapsed).catch(console.error);
    }, 10000);

    return () => clearInterval(interval);
  }, [attemptId, testStarted, testCompleted, timeElapsed]);

  const loadTest = async () => {
    if (!testId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getEntranceTestWithQuestions(testId);
      setTest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить тест');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async () => {
    if (!testId || !user) return;

    try {
      setSubmitting(true);
      const id = await startEntranceTest(testId, user.id);
      setAttemptId(id);
      setTestStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось начать тест');
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = test?.questions[currentQuestionIndex];

  const handleAnswer = (answer: string) => {
    if (!currentQuestion) return;
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, answer);
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (!test || currentQuestionIndex >= test.questions.length - 1) return;
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex <= 0) return;
    setCurrentQuestionIndex(prev => prev - 1);
  };

  const checkAnswer = (question: EntranceTestQuestion, answer: string): { isCorrect: boolean; points: number } => {
    if (!question.correct_answer) {
      return { isCorrect: false, points: 0 };
    }

    const isCorrect = answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
    const points = isCorrect ? question.points : 0;

    return { isCorrect, points };
  };

  const handleSubmitTest = async () => {
    if (!attemptId || !test) return;

    const confirmed = window.confirm(
      `Вы уверены, что хотите завершить тест?\n\nОтвечено вопросов: ${answers.size} из ${test.questions.length}`
    );

    if (!confirmed) return;

    try {
      setSubmitting(true);

      // Submit all answers
      for (const question of test.questions) {
        const answer = answers.get(question.id) || '';
        const { isCorrect, points } = checkAnswer(question, answer);

        await submitAnswer(attemptId, question.id, answer, isCorrect, points);
      }

      // Update final time
      await updateTimeSpent(attemptId, timeElapsed);

      // Complete test (this will calculate proficiency)
      await completeEntranceTest(attemptId);

      setTestCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось завершить тест');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = test ? ((currentQuestionIndex + 1) / test.questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка теста..." />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/student')}>
          ← Назад
        </Button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-600">{error || 'Тест не найден'}</p>
        </div>
      </div>
    );
  }

  // Test completed screen
  if (testCompleted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-learning-surface rounded-lg border border-learning-border p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-learning-text mb-4">
            Тест завершен!
          </h1>
          <p className="text-learning-muted mb-6">
            Ваши результаты обработаны, и начальный уровень владения был установлен.
          </p>
          <div className="space-y-3">
            <div className="text-sm text-learning-muted">
              Время прохождения: {formatTime(timeElapsed)}
            </div>
            <div className="text-sm text-learning-muted">
              Ответов дано: {answers.size} из {test.questions.length}
            </div>
          </div>
          <div className="mt-8">
            <Button onClick={() => navigate('/student')}>
              Перейти к заданиям
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Test intro screen
  if (!testStarted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/student')}>
          ← Назад
        </Button>

        <div className="bg-learning-surface rounded-lg border border-learning-border p-8">
          <h1 className="text-3xl font-bold text-learning-text mb-4">
            {test.title}
          </h1>

          {test.description && (
            <p className="text-learning-muted mb-6">{test.description}</p>
          )}

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-learning-text">
              <span className="text-2xl">📝</span>
              <div>
                <div className="font-medium">Количество вопросов</div>
                <div className="text-sm text-learning-muted">{test.questions.length}</div>
              </div>
            </div>

            {test.time_limit_minutes && (
              <div className="flex items-center gap-3 text-learning-text">
                <span className="text-2xl">⏱️</span>
                <div>
                  <div className="font-medium">Время на прохождение</div>
                  <div className="text-sm text-learning-muted">{test.time_limit_minutes} минут</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-learning-text">
              <span className="text-2xl">🎯</span>
              <div>
                <div className="font-medium">Проходной балл</div>
                <div className="text-sm text-learning-muted">{test.passing_score}%</div>
              </div>
            </div>
          </div>

          <div className="bg-learning-accent/10 border border-learning-accent/20 rounded-lg p-4 mb-8">
            <p className="text-sm text-learning-text">
              💡 Этот тест поможет определить ваш начальный уровень владения программированием.
              На основе результатов вам будут даваться персонализированные задания и подсказки.
            </p>
          </div>

          <Button
            onClick={handleStartTest}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? 'Начинаем...' : 'Начать тест'}
          </Button>
        </div>
      </div>
    );
  }

  // Test taking screen
  if (!currentQuestion) {
    return <div>Вопрос не найден</div>;
  }

  const currentAnswer = answers.get(currentQuestion.id) || '';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-learning-text">{test.title}</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-learning-muted">
            ⏱️ {formatTime(timeElapsed)}
          </div>
          <div className="text-sm text-learning-muted">
            {currentQuestionIndex + 1} / {test.questions.length}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-learning-bg rounded-full h-2">
        <div
          className="bg-learning-accent rounded-full h-2 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <div className="bg-learning-surface rounded-lg border border-learning-border p-8">
        {/* Question header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 text-xs font-medium rounded bg-learning-accent/20 text-learning-accent capitalize">
                {currentQuestion.difficulty_level === 'beginner' ? 'Начинающий' :
                 currentQuestion.difficulty_level === 'intermediate' ? 'Средний' : 'Продвинутый'}
              </span>
              {currentQuestion.skill_category && (
                <span className="px-2 py-1 text-xs font-medium rounded bg-learning-muted/20 text-learning-muted capitalize">
                  {currentQuestion.skill_category}
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-learning-text">
              {currentQuestion.question_text}
            </h2>
          </div>
          <div className="text-sm font-medium text-learning-muted ml-4">
            {currentQuestion.points} {currentQuestion.points === 1 ? 'балл' : 'балла'}
          </div>
        </div>

        {/* Answer options */}
        <div className="space-y-3">
          {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    currentAnswer === option
                      ? 'border-learning-accent bg-learning-accent/10'
                      : 'border-learning-border hover:border-learning-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      currentAnswer === option
                        ? 'border-learning-accent bg-learning-accent'
                        : 'border-learning-muted'
                    }`}>
                      {currentAnswer === option && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-learning-text">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <div className="space-y-2">
              {['true', 'false'].map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    currentAnswer === option
                      ? 'border-learning-accent bg-learning-accent/10'
                      : 'border-learning-border hover:border-learning-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      currentAnswer === option
                        ? 'border-learning-accent bg-learning-accent'
                        : 'border-learning-muted'
                    }`}>
                      {currentAnswer === option && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-learning-text">
                      {option === 'true' ? 'Правда' : 'Ложь'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          ← Назад
        </Button>

        <div className="text-sm text-learning-muted">
          Отвечено: {answers.size} / {test.questions.length}
        </div>

        {currentQuestionIndex === test.questions.length - 1 ? (
          <Button
            onClick={handleSubmitTest}
            disabled={submitting}
          >
            {submitting ? 'Отправка...' : 'Завершить тест'}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Далее →
          </Button>
        )}
      </div>
    </div>
  );
}
