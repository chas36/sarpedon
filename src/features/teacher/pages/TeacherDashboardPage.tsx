import { useEffect, useState } from 'react';
import { Card } from '@/shared/components/ui';
import { QuickLinkCard } from '../components/QuickLinkCard';
import { StatCard } from '../components/StatCard';
import { TopStudentsList } from '../components/TopStudentsList';
import { StrugglingStudentsList } from '../components/StrugglingStudentsList';
import { SubmissionsTable } from '../components/SubmissionsTable';
import {
  getOverallStatistics,
  getTopStudentsWeighted,
  getStrugglingStudents,
  getRecentActivity,
} from '../api/statisticsApi';
import type { Profile, Submission, Level } from '@/shared/types';

export function TeacherDashboardPage() {
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
      weightedScore?: number;
      averageDifficulty?: number;
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
  const [recentSubmissions, setRecentSubmissions] = useState<
    Array<Submission & { student: Profile; level: Level }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      const [statsData, topData, strugglingData, recentData] = await Promise.all([
        getOverallStatistics(),
        getTopStudentsWeighted(5),
        getStrugglingStudents(),
        getRecentActivity(10),
      ]);

      setStats(statsData);
      setTopStudents(topData);
      setStrugglingStudents(strugglingData);
      setRecentSubmissions(recentData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-admin-muted">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-admin-text">Панель преподавателя</h1>
        <p className="text-admin-muted mt-1">Добро пожаловать! Вот обзор вашей платформы</p>
      </div>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Всего учеников"
            value={stats.totalStudents}
            icon="👥"
          />
          <StatCard
            title="Всего уровней"
            value={stats.totalLevels}
            icon="📚"
          />
          <StatCard
            title="Всего попыток"
            value={stats.totalSubmissions}
            icon="💻"
          />
          <StatCard
            title="Средняя успешность"
            value={`${stats.averageSuccessRate}%`}
            icon="📊"
          />
          <StatCard
            title="Активных за 7 дней"
            value={stats.activeStudentsLast7Days}
            icon="🔥"
          />
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-semibold text-admin-text mb-4">Быстрый доступ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickLinkCard
            to="/teacher/students"
            title="Ученики"
            description="Управление учениками и их прогрессом"
            icon="👥"
            color="blue"
          />
          <QuickLinkCard
            to="/teacher/levels"
            title="Уровни"
            description="Создание и редактирование заданий"
            icon="📝"
            color="purple"
          />
          <QuickLinkCard
            to="/teacher/proficiency-analytics"
            title="Аналитика"
            description="Подробная статистика и отчеты"
            icon="📊"
            color="green"
          />
          <QuickLinkCard
            to="/teacher/entrance-tests"
            title="Входные тесты"
            description="Управление тестированием"
            icon="✅"
            color="orange"
          />
        </div>
      </div>

      {/* Top & Struggling Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4 flex items-center">
            <span className="mr-2">🏆</span>
            Топ 5 учеников
          </h2>
          {topStudents.length > 0 ? (
            <TopStudentsList students={topStudents} showWeightedScore={false} />
          ) : (
            <div className="text-admin-muted text-center py-8">Нет данных</div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4 flex items-center">
            <span className="mr-2">⚠️</span>
            Требуют внимания
          </h2>
          {strugglingStudents.length > 0 ? (
            <StrugglingStudentsList students={strugglingStudents.slice(0, 5)} />
          ) : (
            <div className="text-admin-muted text-center py-8">Все справляются отлично!</div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      {recentSubmissions.length > 0 && (
        <Card>
          <h2 className="text-xl font-semibold text-admin-text mb-4 flex items-center">
            <span className="mr-2">🕒</span>
            Последняя активность
          </h2>
          <SubmissionsTable
            submissions={recentSubmissions}
            showStudent={true}
            showLevel={true}
            limit={10}
          />
        </Card>
      )}
    </div>
  );
}
