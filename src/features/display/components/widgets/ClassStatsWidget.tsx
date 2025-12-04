import { useEffect, useState } from 'react';
import { getClassStats } from '../../api/displayApi';
import type { ClassStats } from '../../types/display.types';
import { Spinner } from '@/shared/components/ui';

interface ClassStatsWidgetProps {
  className: string;
}

export function ClassStatsWidget({ className }: ClassStatsWidgetProps) {
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [className]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getClassStats(className);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
        <h3 className="text-lg font-semibold text-learning-text mb-4">
          📈 Статистика класса
        </h3>
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
      <h3 className="text-lg font-semibold text-learning-text mb-4">
        📈 Статистика класса
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-learning-bg p-4 rounded-lg">
          <div className="text-3xl font-bold text-learning-accent">
            {stats.totalStudents}
          </div>
          <div className="text-sm text-learning-muted mt-1">
            Всего учеников
          </div>
        </div>

        <div className="bg-learning-bg p-4 rounded-lg">
          <div className="text-3xl font-bold text-green-400">
            {stats.averageScore}
          </div>
          <div className="text-sm text-learning-muted mt-1">
            Средний балл
          </div>
        </div>

        <div className="bg-learning-bg p-4 rounded-lg">
          <div className="text-3xl font-bold text-blue-400">
            {stats.progressPercentage}%
          </div>
          <div className="text-sm text-learning-muted mt-1">
            Прогресс
          </div>
        </div>

        <div className="bg-learning-bg p-4 rounded-lg">
          <div className="text-3xl font-bold text-purple-400">
            {stats.completionRate}%
          </div>
          <div className="text-sm text-learning-muted mt-1">
            Завершено
          </div>
        </div>
      </div>
    </div>
  );
}
