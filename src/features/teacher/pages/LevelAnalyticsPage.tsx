import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLevelStatistics } from '../api/statisticsApi';
import { Card, Button } from '@/shared/components/ui';
import { DistributionBarChart } from '../components/charts/DistributionBarChart';
import { SimpleProgressBar } from '../components/charts/SimpleProgressBar';
import { StatCard } from '../components/StatCard';
import { formatDate } from '../utils/dateUtils';
import type { Profile, Level } from '@/shared/types';

export function LevelAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [levelStats, setLevelStats] = useState<{
    level: Level;
    totalAttempts: number;
    uniqueStudents: number;
    completedCount: number;
    successRate: number;
    averageAttempts: number;
    attemptsDistribution: {
      '1': number;
      '2-3': number;
      '4-5': number;
      '6+': number;
      'unsolved': number;
    };
    submissions: Array<{
      student: Profile;
      attempts: number;
      isCorrect: boolean;
      lastSubmittedAt: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadLevelStatistics(id);
    }
  }, [id]);

  async function loadLevelStatistics(levelId: string) {
    try {
      setLoading(true);
      setError(null);
      const stats = await getLevelStatistics(levelId);
      setLevelStats(stats);
    } catch (err) {
      console.error('Failed to load level statistics:', err);
      setError('Не удалось загрузить статистику уровня');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-admin-muted">Загрузка статистики...</div>
      </div>
    );
  }

  if (error || !levelStats) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/levels')}>
          ← Назад к уровням
        </Button>
        <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-4">
          <p className="text-admin-danger">{error || 'Уровень не найден'}</p>
        </div>
      </div>
    );
  }

  const { level, totalAttempts, uniqueStudents, completedCount,
          successRate, averageAttempts, attemptsDistribution, submissions } = levelStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/levels')} className="mb-4">
          ← Назад к уровням
        </Button>
        <h1 className="text-3xl font-bold text-admin-text">{level.title}</h1>
        <p className="text-admin-muted mt-2">{level.description}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Всего попыток" value={totalAttempts} />
        <StatCard title="Уникальных студентов" value={uniqueStudents} />
        <StatCard
          title="Успешно решили"
          value={completedCount}
          subtitle={`${successRate}%`}
        />
        <StatCard title="Средняя попыток" value={averageAttempts.toFixed(1)} />
      </div>

      {/* Difficulty Assessment */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Оценка сложности
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-admin-muted">Успешных решений</span>
              <span className="text-admin-text font-medium">{successRate}%</span>
            </div>
            <SimpleProgressBar
              value={successRate}
              color={
                successRate >= 75 ? 'green' :
                successRate >= 50 ? 'yellow' :
                successRate >= 25 ? 'orange' : 'red'
              }
            />
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold">
              {successRate >= 75 ? 'Легко' :
               successRate >= 50 ? 'Средне' :
               successRate >= 25 ? 'Сложно' : 'Очень сложно'}
            </div>
            <div className="text-xs text-admin-muted">
              на основе {completedCount} из {uniqueStudents} студентов
            </div>
          </div>
        </div>
      </Card>

      {/* Attempts Distribution */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Распределение попыток до успеха
        </h2>
        <DistributionBarChart
          data={[
            { label: '1 попытка', count: attemptsDistribution['1'], color: '#10b981' },
            { label: '2-3 попытки', count: attemptsDistribution['2-3'], color: '#f59e0b' },
            { label: '4-5 попыток', count: attemptsDistribution['4-5'], color: '#f97316' },
            { label: '6+ попыток', count: attemptsDistribution['6+'], color: '#ef4444' },
            { label: 'Не решили', count: attemptsDistribution['unsolved'], color: '#6b7280' },
          ]}
        />
      </Card>

      {/* Students Results Table */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Результаты студентов
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-admin-bg border-b border-admin-muted/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                  Студент
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                  Попыток
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                  Последняя попытка
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-admin-muted uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-muted/10">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-admin-muted">
                    Нет попыток решения этого уровня
                  </td>
                </tr>
              ) : (
                submissions.map(s => (
                  <tr key={s.student.id} className="hover:bg-admin-bg/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-admin-text">
                        {s.student.full_name || `${s.student.id.slice(0, 8)}...`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-admin-text">{s.attempts}</td>
                    <td className="px-6 py-4">
                      {s.isCorrect ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-learning-success/20 text-learning-success">
                          ✓ Решено
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-400/20 text-yellow-400">
                          В процессе
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-admin-muted">
                      {formatDate(s.lastSubmittedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/teacher/students/${s.student.id}`)}
                      >
                        Профиль
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
