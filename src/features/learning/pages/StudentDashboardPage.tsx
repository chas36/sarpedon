import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserProgress } from '../api/submissionsApi';
import { Spinner } from '@/shared/components/ui';
import type { UserProgress } from '@/shared/types';

export function StudentDashboardPage() {
  const { user, profile } = useAuthStore();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProgress(user.id);
    }
  }, [user]);

  const loadProgress = async (userId: string) => {
    try {
      setLoading(true);
      const data = await getUserProgress(userId);
      setProgress(data);
    } catch (err) {
      console.error('Failed to load progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const completionRate = progress
    ? Math.round((progress.completed_levels / progress.total_levels) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-learning-text">
          Привет, {profile?.first_name}! 👋
        </h1>
        <p className="text-learning-muted mt-1">
          {profile?.class ? `Класс ${profile.class}` : 'Добро пожаловать на платформу'}
        </p>
      </div>

      {/* Progress Overview */}
      {progress && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
            <div className="text-sm text-learning-muted mb-1">Пройдено уровней</div>
            <div className="text-3xl font-bold text-learning-text">
              {progress.completed_levels}
              <span className="text-lg text-learning-muted ml-1">/ {progress.total_levels}</span>
            </div>
          </div>

          <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
            <div className="text-sm text-learning-muted mb-1">Процент завершения</div>
            <div className="text-3xl font-bold text-learning-success">{completionRate}%</div>
          </div>

          <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
            <div className="text-sm text-learning-muted mb-1">Всего попыток</div>
            <div className="text-3xl font-bold text-learning-text">{progress.total_attempts}</div>
          </div>

          <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
            <div className="text-sm text-learning-muted mb-1">Успешность</div>
            <div className="text-3xl font-bold text-learning-accent">
              {progress.success_rate || 0}%
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-semibold text-learning-text mb-4">Быстрый доступ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/student/levels"
            className="group relative overflow-hidden rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-blue-600/5 p-6 hover:border-blue-500/40 hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-learning-text mb-2 group-hover:text-learning-accent transition-colors">
                  Уровни
                </h3>
                <p className="text-sm text-learning-muted">Все доступные задания</p>
              </div>
              <div className="text-3xl opacity-60 group-hover:opacity-100 transition-opacity text-blue-400">
                📚
              </div>
            </div>
          </Link>

          <Link
            to="/student/progress"
            className="group relative overflow-hidden rounded-lg border border-green-500/20 bg-gradient-to-br from-green-500/20 to-green-600/5 p-6 hover:border-green-500/40 hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-learning-text mb-2 group-hover:text-learning-success transition-colors">
                  Мой прогресс
                </h3>
                <p className="text-sm text-learning-muted">Статистика и навыки</p>
              </div>
              <div className="text-3xl opacity-60 group-hover:opacity-100 transition-opacity text-green-400">
                📊
              </div>
            </div>
          </Link>

          <Link
            to="/student/competitions"
            className="group relative overflow-hidden rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-orange-600/5 p-6 hover:border-orange-500/40 hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-learning-text mb-2 group-hover:text-orange-400 transition-colors">
                  Соревнования
                </h3>
                <p className="text-sm text-learning-muted">Командные турниры</p>
              </div>
              <div className="text-3xl opacity-60 group-hover:opacity-100 transition-opacity text-orange-400">
                🏆
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Motivational Message */}
      <div className="bg-gradient-to-r from-learning-accent/10 to-learning-success/10 rounded-lg p-6 border border-learning-accent/20">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🎯</div>
          <div>
            <h3 className="text-lg font-semibold text-learning-text mb-1">
              {completionRate === 0 && 'Начни свой путь обучения!'}
              {completionRate > 0 && completionRate < 30 && 'Отличное начало! Продолжай в том же духе!'}
              {completionRate >= 30 && completionRate < 70 && 'Ты на правильном пути! Так держать!'}
              {completionRate >= 70 && completionRate < 100 && 'Почти у цели! Еще немного!'}
              {completionRate === 100 && 'Поздравляем! Ты прошел все уровни!'}
            </h3>
            <p className="text-sm text-learning-muted">
              {completionRate === 100
                ? 'Отличная работа! Теперь можешь помочь другим или создать свои задания.'
                : 'Выбери уровень и начни решать задачи прямо сейчас!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
