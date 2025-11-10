import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLevels, deleteLevel } from '@/features/learning/api/levelsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button, Spinner } from '@/shared/components/ui';
import type { Level } from '@/shared/types';

export function EditorLevelsListPage() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadLevels();
  }, []);

  async function loadLevels() {
    try {
      setLoading(true);
      setError(null);
      const allLevels = await getLevels();

      // Показываем только задания, созданные этим редактором
      const myLevels = allLevels.filter(level => level.created_by === profile?.id);
      setLevels(myLevels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить задания');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(levelId: string) {
    if (!confirm('Вы уверены, что хотите удалить это задание?')) {
      return;
    }

    try {
      setDeletingId(levelId);
      await deleteLevel(levelId);
      setLevels(prev => prev.filter(l => l.id !== levelId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка при удалении');
    } finally {
      setDeletingId(null);
    }
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-green-500';
    if (difficulty <= 7) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 3) return 'Легко';
    if (difficulty <= 7) return 'Средне';
    return 'Сложно';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка заданий..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-learning-text">Мои задания</h1>
          <p className="text-learning-muted mt-1">
            Всего создано: {levels.length} {levels.length === 1 ? 'задание' : 'заданий'}
          </p>
        </div>
        <Button onClick={() => navigate('/editor/levels/new')}>
          ➕ Создать задание
        </Button>
      </div>

      {levels.length === 0 ? (
        <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-learning-text mb-2">
            У вас пока нет заданий
          </h2>
          <p className="text-learning-muted mb-6">
            Создайте первое задание для других учеников!
          </p>
          <Button onClick={() => navigate('/editor/levels/new')}>
            Создать первое задание
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {levels.map(level => (
            <div
              key={level.id}
              className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6 hover:border-learning-accent/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-learning-text mb-1">
                    {level.title}
                  </h3>
                  <p className="text-sm text-learning-muted line-clamp-2">
                    {level.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm mb-4">
                <span className={`font-medium ${getDifficultyColor(level.difficulty)}`}>
                  {getDifficultyLabel(level.difficulty)} ({level.difficulty}/10)
                </span>
                <span className="text-learning-muted">•</span>
                <span className="text-learning-muted">{level.language}</span>
                {level.topic && (
                  <>
                    <span className="text-learning-muted">•</span>
                    <span className="text-learning-muted">{level.topic}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-learning-muted mb-4">
                <span>🧪 {level.test_cases.length} тестов</span>
                {level.hints && level.hints.length > 0 && (
                  <>
                    <span>•</span>
                    <span>💡 {level.hints.length} подсказок</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/editor/levels/${level.id}`)}
                  className="flex-1"
                >
                  ✏️ Редактировать
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(level.id)}
                  disabled={deletingId === level.id}
                  className="text-red-500 hover:text-red-400"
                >
                  {deletingId === level.id ? (
                    <Spinner size="sm" />
                  ) : (
                    '🗑️ Удалить'
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {levels.length > 0 && (
        <div className="bg-learning-surface/50 rounded-lg p-4 border border-learning-muted/10">
          <p className="text-sm text-learning-muted text-center">
            💡 Совет: Создавайте задания с подробными описаниями и несколькими тест-кейсами
            для лучшей проверки решений!
          </p>
        </div>
      )}
    </div>
  );
}
