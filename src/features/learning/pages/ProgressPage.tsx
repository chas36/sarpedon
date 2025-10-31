import { useEffect, useState } from 'react';
import { Spinner } from '@/shared/components/ui';
import { getUserProgress } from '../api/submissionsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { UserProgress } from '@/shared/types';

export function ProgressPage() {
  const { user } = useAuthStore();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProgress(user.id);
    }
  }, [user]);

  const loadProgress = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserProgress(userId);
      setProgress(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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
            Ошибка загрузки прогресса
          </h2>
          <p className="text-learning-muted mb-4">{error}</p>
          <button
            onClick={() => user && loadProgress(user.id)}
            className="px-4 py-2 bg-learning-accent text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-learning-text mb-2">
          Мой прогресс
        </h1>
        <p className="text-learning-muted">
          Отслеживайте свои достижения и прогресс в обучении
        </p>
      </div>

      {/* Progress Overview */}
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-learning-text mb-4">
          Общая статистика
        </h2>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-learning-text">
              Завершено уровней
            </span>
            <span className="text-2xl font-bold text-learning-accent">
              {progress.completion_percentage}%
            </span>
          </div>
          <div
            className="w-full h-4 bg-learning-bg rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress.completion_percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-gradient-to-r from-learning-accent to-blue-500 transition-all duration-500"
              style={{ width: `${progress.completion_percentage}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Levels */}
          <div className="bg-learning-bg rounded-lg p-4">
            <p className="text-sm text-learning-muted mb-1">Всего уровней</p>
            <p className="text-3xl font-bold text-learning-text">{progress.total_levels}</p>
          </div>

          {/* Completed Levels */}
          <div className="bg-learning-bg rounded-lg p-4">
            <p className="text-sm text-learning-muted mb-1">Завершено</p>
            <p className="text-3xl font-bold text-green-400">{progress.completed_levels}</p>
          </div>

          {/* In Progress */}
          <div className="bg-learning-bg rounded-lg p-4">
            <p className="text-sm text-learning-muted mb-1">В процессе</p>
            <p className="text-3xl font-bold text-yellow-400">{progress.in_progress_levels}</p>
          </div>
        </div>
      </div>

      {/* Submissions Statistics */}
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-learning-text mb-4">
          Статистика попыток
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Submissions */}
          <div className="bg-learning-bg rounded-lg p-4">
            <p className="text-sm text-learning-muted mb-1">Всего попыток</p>
            <p className="text-3xl font-bold text-learning-text">{progress.total_submissions}</p>
          </div>

          {/* Passed Submissions */}
          <div className="bg-learning-bg rounded-lg p-4">
            <p className="text-sm text-learning-muted mb-1">Успешно</p>
            <p className="text-3xl font-bold text-green-400">
              Успешно: {progress.passed_submissions}
            </p>
          </div>

          {/* Failed Submissions */}
          <div className="bg-learning-bg rounded-lg p-4">
            <p className="text-sm text-learning-muted mb-1">Неудачно</p>
            <p className="text-3xl font-bold text-red-400">
              Неудачно: {progress.failed_submissions}
            </p>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      {progress.total_submissions > 0 && (
        <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-learning-text mb-4">
            Процент успеха
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full h-4 bg-learning-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                  style={{
                    width: `${Math.round((progress.passed_submissions / progress.total_submissions) * 100)}%`
                  }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold text-learning-text">
              {Math.round((progress.passed_submissions / progress.total_submissions) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
