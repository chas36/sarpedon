import { useEffect, useState } from 'react';
import { Card } from '@/shared/components/ui';
import { StatCard } from '../components/StatCard';
import { TopStudentsList } from '../components/TopStudentsList';
import { StrugglingStudentsList } from '../components/StrugglingStudentsList';
import { SubmissionsTable } from '../components/SubmissionsTable';
import { ProgressLineChart } from '../components/charts/ProgressLineChart';
import { DistributionBarChart } from '../components/charts/DistributionBarChart';
import { ActivityHeatmap } from '../components/charts/ActivityHeatmap';
import {
  getAllClasses,
  getOverallStatistics,
  getTopStudents,
  getStrugglingStudents,
  getProgressOverTime,
  getStudentsDistribution,
  getAggregatedActivity,
  getRecentActivity,
} from '../api/statisticsApi';
import type { Profile, Submission, Level } from '@/shared/types';

export function StatisticsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    totalStudents: number;
    totalLevels: number;
    totalSubmissions: number;
    averageSuccessRate: number;
    activeStudentsLast7Days: number;
  } | null>(null);
  const [topStudents, setTopStudents] = useState<
    Array<{
      student: Profile;
      completedLevels: number;
      successRate: number;
      rank: number;
    }>
  >([]);
  const [strugglingStudents, setStrugglingStudents] = useState<
    Array<{
      student: Profile;
      completedLevels: number;
      successRate: number;
      lastActivityDate: string | null;
      issue: 'low_success' | 'low_activity' | 'inactive';
    }>
  >([]);
  const [progressData, setProgressData] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [distribution, setDistribution] = useState<{
    '0-25': number;
    '25-50': number;
    '50-75': number;
    '75-100': number;
  } | null>(null);
  const [activity, setActivity] = useState<
    Array<{ date: string; activityCount: number }>
  >([]);
  const [recentSubmissions, setRecentSubmissions] = useState<
    Array<Submission & { student: Profile; level: Level }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [selectedClass]);

  async function loadClasses() {
    try {
      const classesData = await getAllClasses();
      setClasses(classesData);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  }

  async function loadStatistics() {
    try {
      setLoading(true);
      setError(null);

      const className = selectedClass || undefined;

      const [
        statsData,
        topData,
        strugglingData,
        progressData,
        distributionData,
        activityData,
        recentData,
      ] = await Promise.all([
        getOverallStatistics(className),
        getTopStudents(10, className),
        getStrugglingStudents(className),
        getProgressOverTime(30, className),
        getStudentsDistribution(className),
        getAggregatedActivity(60, className),
        getRecentActivity(20, className),
      ]);

      setStats(statsData);
      setTopStudents(topData);
      setStrugglingStudents(strugglingData);
      setProgressData(progressData);
      setDistribution(distributionData);
      setActivity(activityData);
      setRecentSubmissions(recentData);
    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError('Не удалось загрузить статистику');
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Class Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-text">Статистика</h1>
          <p className="text-admin-muted mt-1">
            {selectedClass
              ? `Статистика класса ${selectedClass}`
              : 'Общий обзор успеваемости всех учеников'}
          </p>
        </div>

        {/* Class Filter */}
        {classes.length > 0 && (
          <div className="flex items-center gap-3">
            <label htmlFor="class-filter" className="text-sm text-admin-muted">
              Фильтр по классу:
            </label>
            <select
              id="class-filter"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-4 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
            >
              <option value="">Все классы</option>
              {classes.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Всего учеников" value={stats.totalStudents} />
          <StatCard title="Всего уровней" value={stats.totalLevels} />
          <StatCard title="Всего попыток" value={stats.totalSubmissions} />
          <StatCard
            title="Средняя успешность"
            value={`${stats.averageSuccessRate}%`}
          />
        </div>
      )}

      {/* Progress Chart */}
      {progressData.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Прогресс за последние 30 дней
          </h2>
          <ProgressLineChart data={progressData} label="Решенных задач" />
        </Card>
      )}

      {/* Distribution */}
      {distribution && (
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Распределение учеников по прогрессу
          </h2>
          <DistributionBarChart
            data={[
              { label: '0-25%', count: distribution['0-25'], color: '#ef4444' },
              { label: '25-50%', count: distribution['25-50'], color: '#f59e0b' },
              { label: '50-75%', count: distribution['50-75'], color: '#10b981' },
              { label: '75-100%', count: distribution['75-100'], color: '#00d9ff' },
            ]}
          />
        </Card>
      )}

      {/* Activity Heatmap */}
      {activity.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Активность учеников за последние 60 дней
          </h2>
          <ActivityHeatmap
            data={activity}
            tooltip={(date, count) => `${date}: ${count} решений`}
          />
        </Card>
      )}

      {/* Top & Struggling Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Топ 10 учеников
          </h2>
          <TopStudentsList students={topStudents} />
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Требуют внимания
          </h2>
          <StrugglingStudentsList students={strugglingStudents} />
        </Card>
      </div>

      {/* Recent Activity */}
      {recentSubmissions.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Последняя активность
          </h2>
          <SubmissionsTable
            submissions={recentSubmissions}
            showStudent={true}
            showLevel={true}
            limit={20}
          />
        </Card>
      )}
    </div>
  );
}
