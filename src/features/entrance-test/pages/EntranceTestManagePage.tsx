import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@/shared/components/ui';
import {
  getAllEntranceTests,
  getTestStatistics,
  createEntranceTest,
  updateEntranceTest
} from '../api/entranceTestApi';
import type { EntranceTest, TestStatistics } from '../api/entranceTestApi';

export function EntranceTestManagePage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<EntranceTest[]>([]);
  const [statistics, setStatistics] = useState<Map<string, TestStatistics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllEntranceTests();
      setTests(data);

      // Load statistics for each test
      const stats = new Map<string, TestStatistics>();
      for (const test of data) {
        try {
          const testStats = await getTestStatistics(test.id);
          stats.set(test.id, testStats);
        } catch (err) {
          console.error(`Failed to load stats for test ${test.id}`, err);
        }
      }
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить тесты');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (test: EntranceTest) => {
    try {
      await updateEntranceTest(test.id, { is_active: !test.is_active });
      loadTests();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка обновления теста');
    }
  };

  const handleViewResults = (testId: string) => {
    navigate(`/teacher/entrance-tests/results?testId=${testId}`);
  };

  const handleEditTest = (testId: string) => {
    navigate(`/teacher/entrance-tests/${testId}/edit`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-text">Управление входными тестами</h1>
          <p className="text-admin-muted mt-1">Создание и редактирование тестов для определения уровня студентов</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Создать новый тест
        </Button>
      </div>

      {/* Tests List */}
      {tests.length === 0 ? (
        <div className="bg-admin-surface rounded-lg p-12 text-center border border-admin-muted/10">
          <p className="text-admin-muted mb-4">Тесты не найдены</p>
          <Button onClick={() => setShowCreateModal(true)}>
            Создать первый тест
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tests.map((test) => {
            const stats = statistics.get(test.id);
            return (
              <div
                key={test.id}
                className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6 hover:border-admin-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-admin-text">
                        {test.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        test.is_active
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-admin-muted/20 text-admin-muted'
                      }`}>
                        {test.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </div>
                    {test.description && (
                      <p className="text-admin-muted text-sm mb-3">{test.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-admin-muted">
                      <span>📝 Язык: {test.language}</span>
                      {test.time_limit_minutes && (
                        <span>⏱️ {test.time_limit_minutes} мин</span>
                      )}
                      <span>🎯 Проходной балл: {test.passing_score}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(test)}
                    >
                      {test.is_active ? 'Деактивировать' : 'Активировать'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEditTest(test.id)}
                    >
                      Редактировать
                    </Button>
                    {stats && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewResults(test.id)}
                      >
                        Результаты
                      </Button>
                    )}
                  </div>
                </div>

                {/* Statistics */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-admin-muted/10">
                    <div>
                      <div className="text-xs text-admin-muted">Всего попыток</div>
                      <div className="text-lg font-semibold text-admin-text">
                        {stats.total_attempts}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-admin-muted">Завершено</div>
                      <div className="text-lg font-semibold text-green-500">
                        {stats.completed_attempts}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-admin-muted">Средний балл</div>
                      <div className="text-lg font-semibold text-admin-accent">
                        {stats.average_score}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-admin-muted">Начинающие</div>
                      <div className="text-lg font-semibold text-yellow-500">
                        {stats.beginner_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-admin-muted">Средний / Продвинутые</div>
                      <div className="text-lg font-semibold text-admin-text">
                        {stats.intermediate_count} / {stats.advanced_count}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Test Modal */}
      {showCreateModal && (
        <CreateTestModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(testId) => {
            setShowCreateModal(false);
            navigate(`/teacher/entrance-tests/${testId}/edit`);
          }}
        />
      )}
    </div>
  );
}

// Create Test Modal Component
interface CreateTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (testId: string) => void;
}

function CreateTestModal({ isOpen, onClose, onSuccess }: CreateTestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('python');
  const [passingScore, setPassingScore] = useState(60);
  const [timeLimit, setTimeLimit] = useState<number | null>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Название теста обязательно');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const test = await createEntranceTest({
        title: title.trim(),
        description: description.trim() || undefined,
        language,
        passing_score: passingScore,
        time_limit_minutes: timeLimit || undefined
      });
      onSuccess(test.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать тест');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-admin-surface rounded-lg shadow-xl w-full max-w-md mx-4 border border-admin-muted/10">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-admin-muted/10">
            <h2 className="text-xl font-semibold text-admin-text">
              Создать новый тест
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Название теста *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Входное тестирование по Python"
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание теста..."
                rows={3}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent resize-none"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Язык программирования
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            {/* Passing Score */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Проходной балл (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
            </div>

            {/* Time Limit */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Ограничение по времени (минуты)
              </label>
              <input
                type="number"
                min="0"
                value={timeLimit || ''}
                onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Без ограничения"
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
              <p className="text-xs text-admin-muted mt-1">
                Оставьте пустым для неограниченного времени
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-admin-muted/10 flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Создание...' : 'Создать тест'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
