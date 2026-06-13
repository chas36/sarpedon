import { useEffect, useState } from 'react';
import { getEditorRewardStats, type RewardStats } from '../api/rewardsApi';
import { Spinner } from '@/shared/components/ui';

interface EditorRewardsCardProps {
  editorId: string;
}

export function EditorRewardsCard({ editorId }: EditorRewardsCardProps) {
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, [editorId]);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await getEditorRewardStats(editorId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки статистики');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6">
        <div className="flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/20 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🏆</span>
        <div>
          <h3 className="text-lg font-semibold text-learning-text">Награды за создание заданий</h3>
          <p className="text-sm text-learning-muted">Баллы начисляются при одобрении учителем</p>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-learning-bg/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-500">{stats.total_points}</div>
          <div className="text-xs text-learning-muted mt-1">Всего баллов</div>
        </div>
        <div className="bg-learning-bg/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{stats.total_approved_levels}</div>
          <div className="text-xs text-learning-muted mt-1">Одобрено заданий</div>
        </div>
        <div className="bg-learning-bg/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{stats.average_difficulty.toFixed(1)}</div>
          <div className="text-xs text-learning-muted mt-1">Средняя сложность</div>
        </div>
      </div>

      {/* Recent Rewards */}
      {stats.recent_rewards.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-learning-text mb-2">Недавние награды:</h4>
          <div className="space-y-2">
            {stats.recent_rewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-learning-bg/50 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-learning-text">
                    {reward.level?.title || 'Задание удалено'}
                  </div>
                  <div className="text-xs text-learning-muted">
                    {new Date(reward.awarded_at).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-purple-500">+{reward.points_awarded}</div>
                  <div className="text-xs text-learning-muted">Сложность: {reward.difficulty}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-xs text-learning-muted">
          💡 <strong>Как получить баллы:</strong> Создавайте качественные задания!
          Чем выше сложность задания (1-10), тем больше баллов вы получите при одобрении (сложность × 10).
        </p>
      </div>
    </div>
  );
}
