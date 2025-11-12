import { useEffect, useState } from 'react';
import { getAuthorStats, type AuthorStats } from '../api/authorStatsApi';
import { Spinner } from '@/shared/components/ui';

export function AuthorStatsPage() {
  const [stats, setStats] = useState<AuthorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'levels' | 'success'>('levels');

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await getAuthorStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }

  const sortedStats = [...stats].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.author.last_name} ${a.author.first_name}`.localeCompare(
          `${b.author.last_name} ${b.author.first_name}`
        );
      case 'levels':
        return b.approved_levels - a.approved_levels;
      case 'success':
        return b.success_rate - a.success_rate;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка статистики..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-4">
        <p className="text-admin-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-text">Статистика по авторам</h1>
          <p className="text-admin-muted mt-1">
            Посмотрите, сколько заданий создал каждый редактор и как студенты справляются с ними
          </p>
        </div>
        <div>
          <label className="text-sm font-medium text-admin-muted mr-2">Сортировка:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
          >
            <option value="name">По имени</option>
            <option value="levels">По количеству заданий</option>
            <option value="success">По успешности</option>
          </select>
        </div>
      </div>

      {sortedStats.length === 0 ? (
        <div className="bg-admin-surface rounded-lg p-12 text-center border border-admin-muted/10">
          <p className="text-admin-muted">Нет редакторов с созданными заданиями</p>
        </div>
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-muted/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-admin-bg border-b border-admin-muted/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Автор</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase">Всего заданий</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase">Одобрено</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase">На модерации</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase">Отклонено</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase">Попыток</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase">Успешных</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase">% успеха</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-muted/10">
              {sortedStats.map((stat) => (
                <tr key={stat.author.id} className="hover:bg-admin-bg/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-admin-text">
                      {stat.author.full_name || `${stat.author.last_name} ${stat.author.first_name}`}
                    </div>
                    <div className="text-xs text-admin-muted">{stat.author.class || 'Без класса'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-semibold text-admin-text">{stat.total_levels}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-green-500/20 text-green-500">
                      {stat.approved_levels}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-500/20 text-yellow-500">
                      {stat.pending_levels}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-red-500/20 text-red-500">
                      {stat.rejected_levels}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-admin-muted">
                    {stat.total_submissions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-admin-muted">
                    {stat.passed_submissions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className={`text-sm font-semibold ${
                      stat.success_rate >= 70 ? 'text-green-500' :
                      stat.success_rate >= 50 ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {stat.success_rate}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {sortedStats.length > 0 && (
        <div className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6">
          <h2 className="text-lg font-semibold text-admin-text mb-4">Сводка</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-admin-muted">Всего авторов</div>
              <div className="text-2xl font-bold text-admin-text">{sortedStats.length}</div>
            </div>
            <div>
              <div className="text-sm text-admin-muted">Всего заданий</div>
              <div className="text-2xl font-bold text-admin-text">
                {sortedStats.reduce((sum, s) => sum + s.total_levels, 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-admin-muted">Одобрено</div>
              <div className="text-2xl font-bold text-green-500">
                {sortedStats.reduce((sum, s) => sum + s.approved_levels, 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-admin-muted">Средний % успеха</div>
              <div className="text-2xl font-bold text-admin-accent">
                {Math.round(
                  sortedStats.reduce((sum, s) => sum + s.success_rate, 0) / sortedStats.length
                )}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
