import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@/shared/components/ui';
import {
  getAllEntranceTests,
  getTestStatistics,
  getTestAttempts
} from '../api/entranceTestApi';
import type { EntranceTest, TestStatistics, EntranceTestAttempt } from '../api/entranceTestApi';

export function EntranceTestResultsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<EntranceTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<EntranceTest | null>(null);
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [attempts, setAttempts] = useState<EntranceTestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      loadTestDetails(selectedTest.id);
    }
  }, [selectedTest]);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllEntranceTests();
      setTests(data);
      if (data.length > 0 && !selectedTest) {
        setSelectedTest(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить тесты');
    } finally {
      setLoading(false);
    }
  };

  const loadTestDetails = async (testId: string) => {
    try {
      const [stats, attemptsData] = await Promise.all([
        getTestStatistics(testId),
        getTestAttempts(testId)
      ]);
      setStatistics(stats);
      setAttempts(attemptsData);
    } catch (err) {
      console.error('Error loading test details:', err);
    }
  };

  const getProficiencyColor = (level?: string) => {
    switch (level) {
      case 'advanced':
        return 'text-green-500';
      case 'intermediate':
        return 'text-blue-500';
      case 'beginner':
        return 'text-yellow-500';
      default:
        return 'text-admin-muted';
    }
  };

  const getProficiencyLabel = (level?: string) => {
    switch (level) {
      case 'advanced':
        return 'Продвинутый';
      case 'intermediate':
        return 'Средний';
      case 'beginner':
        return 'Начинающий';
      default:
        return 'Не определен';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка..." />
      </div>
    );
  }

  if (error || tests.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-admin-text">Входные тесты</h1>
        </div>
        <div className="bg-admin-surface rounded-lg p-12 text-center border border-admin-muted/10">
          <p className="text-admin-muted">
            {error || 'Входные тесты не найдены'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-text">Результаты входных тестов</h1>
          <p className="text-admin-muted mt-1">Статистика и результаты студентов</p>
        </div>
      </div>

      {/* Test selector */}
      {tests.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-admin-text mb-2">Выберите тест:</label>
          <select
            value={selectedTest?.id || ''}
            onChange={(e) => {
              const test = tests.find(t => t.id === e.target.value);
              setSelectedTest(test || null);
            }}
            className="px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
          >
            {tests.map(test => (
              <option key={test.id} value={test.id}>
                {test.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
            <div className="text-sm text-admin-muted">Всего попыток</div>
            <div className="text-2xl font-bold text-admin-text mt-1">
              {statistics.total_attempts}
            </div>
          </div>

          <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
            <div className="text-sm text-admin-muted">Завершено</div>
            <div className="text-2xl font-bold text-green-500 mt-1">
              {statistics.completed_attempts}
            </div>
          </div>

          <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
            <div className="text-sm text-admin-muted">Средний балл</div>
            <div className="text-2xl font-bold text-admin-accent mt-1">
              {statistics.average_score}%
            </div>
          </div>

          <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
            <div className="text-sm text-admin-muted mb-2">Распределение уровней</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-yellow-500">Начинающий:</span>
                <span className="text-admin-text">{statistics.beginner_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-500">Средний:</span>
                <span className="text-admin-text">{statistics.intermediate_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-500">Продвинутый:</span>
                <span className="text-admin-text">{statistics.advanced_count}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attempts list */}
      <div className="bg-admin-surface rounded-lg border border-admin-muted/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-admin-muted/10">
          <h2 className="text-xl font-semibold text-admin-text">Результаты студентов</h2>
        </div>

        {attempts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-admin-muted">Попытки не найдены</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-admin-bg border-b border-admin-muted/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Студент</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Время</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Балл</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Уровень</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-muted/10">
              {attempts.map((attempt: any) => (
                <tr key={attempt.id} className="hover:bg-admin-bg/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-admin-text">
                      {attempt.profiles?.first_name} {attempt.profiles?.last_name}
                    </div>
                    {attempt.profiles?.class && (
                      <div className="text-xs text-admin-muted">{attempt.profiles.class}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-admin-muted">
                    {new Date(attempt.started_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-admin-muted">
                    {Math.floor(attempt.time_spent_seconds / 60)}:{(attempt.time_spent_seconds % 60).toString().padStart(2, '0')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-admin-text">
                      {attempt.score !== null ? `${attempt.score}%` : '—'}
                    </div>
                    {attempt.total_points_possible > 0 && (
                      <div className="text-xs text-admin-muted">
                        {attempt.total_points_earned}/{attempt.total_points_possible}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {attempt.proficiency_level_assigned ? (
                      <div>
                        <div className={`text-sm font-medium ${getProficiencyColor(attempt.proficiency_level_assigned)}`}>
                          {getProficiencyLabel(attempt.proficiency_level_assigned)}
                        </div>
                        <div className="text-xs text-admin-muted">
                          {attempt.proficiency_score_assigned}/100
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-admin-muted">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      attempt.status === 'completed'
                        ? 'bg-green-500/20 text-green-500'
                        : attempt.status === 'in_progress'
                        ? 'bg-blue-500/20 text-blue-500'
                        : 'bg-admin-muted/20 text-admin-muted'
                    }`}>
                      {attempt.status === 'completed' ? 'Завершен' :
                       attempt.status === 'in_progress' ? 'В процессе' : 'Прерван'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
