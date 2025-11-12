import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPendingLevels,
  approveLevel,
  rejectLevel,
  getModerationStats,
  getAllLevelsDebug,
  type LevelWithAuthor,
  type ModerationStats
} from '../api/moderationApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button, Spinner } from '@/shared/components/ui';

export function ModerationPage() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [levels, setLevels] = useState<LevelWithAuthor[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<LevelWithAuthor | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // DEBUG: First check all levels
      await getAllLevelsDebug();

      const [levelsData, statsData] = await Promise.all([
        getPendingLevels(),
        getModerationStats()
      ]);
      console.log('Loaded pending levels:', levelsData);
      console.log('Loaded stats:', statsData);
      setLevels(levelsData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading moderation data:', err);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(levelId: string) {
    if (!profile?.id) return;

    if (!confirm('Одобрить это задание для публикации?')) return;

    try {
      setProcessing(levelId);
      await approveLevel(levelId, profile.id);
      setLevels(prev => prev.filter(l => l.id !== levelId));
      if (stats) {
        setStats({
          ...stats,
          pending: stats.pending - 1,
          approved: stats.approved + 1
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка при одобрении');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(levelId: string) {
    if (!profile?.id) return;

    if (!rejectionNotes.trim()) {
      alert('Укажите причину отклонения');
      return;
    }

    try {
      setProcessing(levelId);
      await rejectLevel(levelId, profile.id, rejectionNotes);
      setLevels(prev => prev.filter(l => l.id !== levelId));
      if (stats) {
        setStats({
          ...stats,
          pending: stats.pending - 1,
          rejected: stats.rejected + 1
        });
      }
      setSelectedLevel(null);
      setRejectionNotes('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка при отклонении');
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка..." />
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
      <div>
        <h1 className="text-3xl font-bold text-admin-text">Модерация заданий</h1>
        <p className="text-admin-muted mt-1">Проверяйте и одобряйте задания, созданные редакторами</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
            <div className="text-sm text-admin-muted">На модерации</div>
            <div className="text-2xl font-bold text-yellow-500 mt-1">{stats.pending}</div>
          </div>
          <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
            <div className="text-sm text-admin-muted">Одобрено</div>
            <div className="text-2xl font-bold text-green-500 mt-1">{stats.approved}</div>
          </div>
          <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
            <div className="text-sm text-admin-muted">Отклонено</div>
            <div className="text-2xl font-bold text-red-500 mt-1">{stats.rejected}</div>
          </div>
          <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
            <div className="text-sm text-admin-muted">Всего</div>
            <div className="text-2xl font-bold text-admin-text mt-1">{stats.total}</div>
          </div>
        </div>
      )}

      {/* Pending Levels */}
      {levels.length === 0 ? (
        <div className="bg-admin-surface rounded-lg p-12 text-center border border-admin-muted/10">
          <p className="text-admin-muted">Нет заданий на модерации</p>
        </div>
      ) : (
        <div className="space-y-4">
          {levels.map((level) => (
            <div
              key={level.id}
              className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-admin-text">{level.title}</h3>
                  <p className="text-sm text-admin-muted mt-1">
                    Автор: {level.author?.full_name || level.author?.first_name + ' ' + level.author?.last_name || 'Неизвестно'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-admin-muted">
                    <span>Сложность: {level.difficulty}/10</span>
                    <span>Язык: {level.language}</span>
                    <span>Тесты: {level.test_cases.length}</span>
                    <span>Создано: {new Date(level.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setSelectedLevel(selectedLevel?.id === level.id ? null : level)}
                  >
                    {selectedLevel?.id === level.id ? 'Свернуть' : 'Подробнее'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(level.id)}
                    disabled={processing === level.id}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {processing === level.id ? '...' : '✓ Одобрить'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedLevel(level)}
                    disabled={processing === level.id}
                    className="text-red-500 hover:text-red-400"
                  >
                    ✗ Отклонить
                  </Button>
                </div>
              </div>

              {selectedLevel?.id === level.id && (
                <div className="mt-4 pt-4 border-t border-admin-muted/10 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-admin-text mb-2">Описание:</h4>
                    <p className="text-admin-muted whitespace-pre-wrap">{level.description}</p>
                  </div>

                  {level.educational_context && (
                    <div>
                      <h4 className="text-sm font-medium text-admin-text mb-2">Теория:</h4>
                      <p className="text-admin-muted whitespace-pre-wrap">{level.educational_context}</p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-admin-text mb-2">Эталонное решение:</h4>
                    <pre className="bg-admin-bg p-4 rounded-lg text-sm text-admin-text overflow-x-auto">
                      {level.reference_solution}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-admin-text mb-2">Тест-кейсы:</h4>
                    <div className="space-y-2">
                      {level.test_cases.map((tc, i) => (
                        <div key={i} className="bg-admin-bg p-3 rounded-lg text-sm">
                          <div className="text-admin-muted">Вход: <span className="text-admin-text font-mono">{tc.input || '(нет)'}</span></div>
                          <div className="text-admin-muted">Выход: <span className="text-admin-text font-mono">{tc.output}</span></div>
                          {tc.description && <div className="text-admin-muted mt-1">{tc.description}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {level.hints && level.hints.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-admin-text mb-2">Подсказки:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {level.hints.map((hint, i) => (
                          <li key={i} className="text-admin-muted">{hint}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Rejection Form */}
                  <div className="bg-admin-bg p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-admin-text mb-2">Причина отклонения:</h4>
                    <textarea
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder="Укажите, что нужно исправить..."
                      rows={3}
                      className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleReject(level.id)}
                      disabled={processing === level.id || !rejectionNotes.trim()}
                      className="mt-2 bg-red-500 hover:bg-red-600"
                    >
                      Отклонить с комментарием
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
