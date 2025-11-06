import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLevelsWithStats, deleteLevel } from '@/features/learning/api/levelsApi';
import { Button, Spinner } from '@/shared/components/ui';
import { AILevelGeneratorModal } from '../components/AILevelGeneratorModal';
import type { Level } from '@/shared/types';
import { getDifficultyLabel, getDifficultyBadgeClass } from '../utils/difficultyUtils';

export function LevelsManagePage() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  useEffect(() => {
    loadLevels();
  }, []);

  async function loadLevels() {
    try {
      setLoading(true);
      setError(null);
      const data = await getLevelsWithStats();
      setLevels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить уровни');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Вы уверены, что хотите удалить уровень "${title}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteLevel(id);
      setLevels(levels.filter(l => l.id !== id));
    } catch (err) {
      alert('Ошибка при удалении уровня: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка уровней..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-4">
        <p className="text-admin-danger">{error}</p>
        <Button variant="ghost" size="sm" onClick={loadLevels} className="mt-2">
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-text">Управление уровнями</h1>
          <p className="text-admin-muted mt-1">
            Создавайте и редактируйте учебные задания
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowAIGenerator(true)}
          >
            🤖 AI Генератор
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/teacher/levels/new')}
          >
            + Создать вручную
          </Button>
        </div>
      </div>

      {/* AI Generator Modal */}
      <AILevelGeneratorModal
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onLevelsCreated={() => {
          loadLevels();
          setShowAIGenerator(false);
        }}
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">Всего уровней</div>
          <div className="text-2xl font-bold text-admin-text mt-1">{levels.length}</div>
        </div>
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">Легкие (1-3)</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            {levels.filter(l => typeof l.difficulty === 'number' && l.difficulty <= 3).length}
          </div>
        </div>
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">Средние (4-5)</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">
            {levels.filter(l => typeof l.difficulty === 'number' && l.difficulty >= 4 && l.difficulty <= 5).length}
          </div>
        </div>
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">Сложные (6-7)</div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {levels.filter(l => typeof l.difficulty === 'number' && l.difficulty >= 6 && l.difficulty <= 7).length}
          </div>
        </div>
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">Очень сложные (8-10)</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {levels.filter(l => typeof l.difficulty === 'number' && l.difficulty >= 8).length}
          </div>
        </div>
      </div>

      {/* Levels List */}
      {levels.length === 0 ? (
        <div className="bg-admin-surface rounded-lg p-12 text-center border border-admin-muted/10">
          <p className="text-admin-muted mb-4">Пока нет созданных уровней</p>
          <Button variant="primary" onClick={() => navigate('/teacher/levels/new')}>
            Создать первый уровень
          </Button>
        </div>
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-muted/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-admin-bg border-b border-admin-muted/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase tracking-wider">
                  Язык
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase tracking-wider">
                  Сложность
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase tracking-wider">
                  Тесты
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-admin-muted uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-muted/10">
              {levels.map((level) => (
                <tr key={level.id} className="hover:bg-admin-bg/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-admin-muted">
                    {level.order_index}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-admin-text">{level.title}</div>
                    <div className="text-sm text-admin-muted line-clamp-1">
                      {level.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-admin-accent/20 text-admin-accent">
                      {level.language}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getDifficultyBadgeClass(level.difficulty)}`}>
                      {level.difficulty}/10 • {getDifficultyLabel(level.difficulty)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-admin-text">
                    {level.test_cases?.length || 0} тестов
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/teacher/levels/${level.id}`)}
                    >
                      Редактировать
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(level.id, level.title)}
                      disabled={deletingId === level.id}
                      loading={deletingId === level.id}
                    >
                      Удалить
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
