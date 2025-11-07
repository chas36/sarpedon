import { useEffect, useState } from 'react';
import { Card, Spinner } from '@/shared/components/ui';
import { getClassProficiencyStats, type ProficiencyStats } from '../api/proficiencyApi';

interface ProficiencyOverviewCardProps {
  className?: string;
}

export function ProficiencyOverviewCard({ className }: ProficiencyOverviewCardProps) {
  const [stats, setStats] = useState<ProficiencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [className]);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await getClassProficiencyStats(className);
      setStats(data);
    } catch (err) {
      console.error('Failed to load proficiency stats:', err);
      setError('Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" text="Загрузка..." />
        </div>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <div className="text-center py-4 text-admin-danger">
          {error || 'Нет данных'}
        </div>
      </Card>
    );
  }

  const beginnerPercent = stats.total_students > 0
    ? Math.round((stats.beginner_count / stats.total_students) * 100)
    : 0;
  const intermediatePercent = stats.total_students > 0
    ? Math.round((stats.intermediate_count / stats.total_students) * 100)
    : 0;
  const advancedPercent = stats.total_students > 0
    ? Math.round((stats.advanced_count / stats.total_students) * 100)
    : 0;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-admin-text">
            📊 Распределение по уровням владения
          </h2>
          <div className="text-sm text-admin-muted">
            Средний балл: <span className="font-semibold text-admin-accent">{stats.average_score}/100</span>
          </div>
        </div>

        {/* Distribution Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Beginner */}
          <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-500">Начинающий</span>
              <span className="text-xs text-admin-muted">{beginnerPercent}%</span>
            </div>
            <div className="text-3xl font-bold text-yellow-500 mb-1">
              {stats.beginner_count}
            </div>
            <div className="w-full bg-admin-bg rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${beginnerPercent}%` }}
              />
            </div>
          </div>

          {/* Intermediate */}
          <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-500">Средний</span>
              <span className="text-xs text-admin-muted">{intermediatePercent}%</span>
            </div>
            <div className="text-3xl font-bold text-blue-500 mb-1">
              {stats.intermediate_count}
            </div>
            <div className="w-full bg-admin-bg rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${intermediatePercent}%` }}
              />
            </div>
          </div>

          {/* Advanced */}
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-500">Продвинутый</span>
              <span className="text-xs text-admin-muted">{advancedPercent}%</span>
            </div>
            <div className="text-3xl font-bold text-green-500 mb-1">
              {stats.advanced_count}
            </div>
            <div className="w-full bg-admin-bg rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${advancedPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="space-y-2">
          <div className="flex h-8 rounded-lg overflow-hidden">
            {stats.beginner_count > 0 && (
              <div
                className="bg-yellow-500 flex items-center justify-center text-xs font-semibold text-white transition-all duration-500"
                style={{ width: `${beginnerPercent}%` }}
                title={`Начинающий: ${stats.beginner_count}`}
              >
                {beginnerPercent >= 10 && stats.beginner_count}
              </div>
            )}
            {stats.intermediate_count > 0 && (
              <div
                className="bg-blue-500 flex items-center justify-center text-xs font-semibold text-white transition-all duration-500"
                style={{ width: `${intermediatePercent}%` }}
                title={`Средний: ${stats.intermediate_count}`}
              >
                {intermediatePercent >= 10 && stats.intermediate_count}
              </div>
            )}
            {stats.advanced_count > 0 && (
              <div
                className="bg-green-500 flex items-center justify-center text-xs font-semibold text-white transition-all duration-500"
                style={{ width: `${advancedPercent}%` }}
                title={`Продвинутый: ${stats.advanced_count}`}
              >
                {advancedPercent >= 10 && stats.advanced_count}
              </div>
            )}
          </div>
          <div className="text-xs text-admin-muted text-center">
            Всего студентов: {stats.total_students}
          </div>
        </div>
      </div>
    </Card>
  );
}
