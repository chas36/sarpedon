import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getClassStatistics,
  getClassProgressOverTime,
  getClassActivity,
} from '../api/statisticsApi';
import { Card, Button } from '@/shared/components/ui';
import { StatCard } from '../components/StatCard';
import { ProgressLineChart } from '../components/charts/ProgressLineChart';
import { DistributionBarChart } from '../components/charts/DistributionBarChart';
import { ActivityHeatmap } from '../components/charts/ActivityHeatmap';
import { SimpleProgressBar } from '../components/charts/SimpleProgressBar';
import type { Profile } from '@/shared/types';

export function ClassAnalyticsPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [classStats, setClassStats] = useState<{
    className: string;
    totalStudents: number;
    averageCompletedLevels: number;
    averageSuccessRate: number;
    activeStudentsLast7Days: number;
    distribution: {
      '0-25': number;
      '25-50': number;
      '50-75': number;
      '75-100': number;
    };
    students: Array<{
      student: Profile;
      completedLevels: number;
      totalLevels: number;
      successRate: number;
      lastActivity: string | null;
      rank: number;
    }>;
  } | null>(null);
  const [classProgress, setClassProgress] = useState<Array<{ date: string; count: number }>>([]);
  const [classActivity, setClassActivity] = useState<Array<{ date: string; activityCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (name) {
      loadClassStatistics(name);
    }
  }, [name]);

  async function loadClassStatistics(className: string) {
    try {
      setLoading(true);
      setError(null);
      const [stats, progress, activity] = await Promise.all([
        getClassStatistics(className),
        getClassProgressOverTime(className, 30),
        getClassActivity(className, 60),
      ]);

      setClassStats(stats);
      setClassProgress(progress);
      setClassActivity(activity);
    } catch (err) {
      console.error('Failed to load class statistics:', err);
      setError('Не удалось загрузить статистику класса');
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

  if (error || !classStats) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/students')}>
          ← Назад к студентам
        </Button>
        <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-4">
          <p className="text-admin-danger">{error || 'Класс не найден'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/students')} className="mb-4">
          ← Назад к студентам
        </Button>
        <h1 className="text-3xl font-bold text-admin-text">
          Класс {classStats.className}
        </h1>
        <p className="text-admin-muted mt-1">
          Детальная статистика и рейтинг учеников
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Всего учеников" value={classStats.totalStudents} />
        <StatCard
          title="Средняя решенных задач"
          value={classStats.averageCompletedLevels.toFixed(1)}
        />
        <StatCard
          title="Средняя успешность"
          value={`${classStats.averageSuccessRate}%`}
        />
        <StatCard
          title="Активных за 7 дней"
          value={classStats.activeStudentsLast7Days}
        />
      </div>

      {/* Progress Chart */}
      {classProgress.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Прогресс класса за последние 30 дней
          </h2>
          <ProgressLineChart
            data={classProgress}
            label="Всего решенных задач классом"
          />
        </Card>
      )}

      {/* Distribution */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Распределение учеников по прогрессу
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-500">
              {classStats.distribution['0-25']}
            </div>
            <div className="text-sm text-admin-muted">0-25%</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {classStats.distribution['25-50']}
            </div>
            <div className="text-sm text-admin-muted">25-50%</div>
          </div>
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {classStats.distribution['50-75']}
            </div>
            <div className="text-sm text-admin-muted">50-75%</div>
          </div>
          <div className="bg-admin-accent/10 border border-admin-accent rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-admin-accent">
              {classStats.distribution['75-100']}
            </div>
            <div className="text-sm text-admin-muted">75-100%</div>
          </div>
        </div>
        <DistributionBarChart
          data={[
            { label: '0-25%', count: classStats.distribution['0-25'], color: '#ef4444' },
            { label: '25-50%', count: classStats.distribution['25-50'], color: '#f59e0b' },
            { label: '50-75%', count: classStats.distribution['50-75'], color: '#10b981' },
            { label: '75-100%', count: classStats.distribution['75-100'], color: '#00d9ff' },
          ]}
        />
      </Card>

      {/* Ranking */}
      <Card>
        <h2 className="text-xl font-semibold text-admin-text mb-4">
          Рейтинг учеников класса
        </h2>
        <div className="space-y-2">
          {classStats.students.length === 0 ? (
            <div className="text-center py-8 text-admin-muted">
              Нет учеников в этом классе
            </div>
          ) : (
            classStats.students.map((student, index) => (
              <div
                key={student.student.id}
                className="flex items-center gap-4 p-3 bg-admin-bg rounded-lg hover:bg-admin-surface transition-colors cursor-pointer"
                onClick={() => navigate(`/teacher/students/${student.student.id}`)}
              >
                <div className={`text-2xl font-bold ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-orange-400' :
                  'text-admin-muted'
                }`}>
                  #{index + 1}
                </div>

                <div className="flex-1">
                  <div className="font-medium text-admin-text">
                    {student.student.full_name || `${student.student.id.slice(0, 8)}...`}
                  </div>
                  <div className="text-xs text-admin-muted">
                    {student.student.email}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium text-admin-text">
                    {student.completedLevels} задач
                  </div>
                  <div className="text-xs text-admin-muted">
                    {student.successRate}% успешность
                  </div>
                </div>

                <div className="w-16">
                  <SimpleProgressBar
                    value={(student.completedLevels / student.totalLevels) * 100}
                    height={8}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Activity Heatmap */}
      {classActivity.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Активность класса за последние 60 дней
          </h2>
          <ActivityHeatmap
            data={classActivity}
            tooltip={(date, count) => `${date}: ${count} решений от класса`}
          />
        </Card>
      )}
    </div>
  );
}
