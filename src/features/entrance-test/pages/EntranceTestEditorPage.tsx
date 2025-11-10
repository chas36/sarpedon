import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@/shared/components/ui';
import {
  getEntranceTestWithQuestions,
  updateEntranceTest,
  deleteQuestion
} from '../api/entranceTestApi';
import type { TestWithQuestions, EntranceTestQuestion } from '../api/entranceTestApi';
import { AddQuestionModal } from '../components/AddQuestionModal';

export function EntranceTestEditorPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<EntranceTestQuestion | null>(null);

  // Edit mode for test info
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    passing_score: 60,
    time_limit_minutes: null as number | null
  });

  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  const loadTest = async () => {
    if (!testId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getEntranceTestWithQuestions(testId);
      setTest(data);
      setEditForm({
        title: data.title,
        description: data.description || '',
        passing_score: data.passing_score,
        time_limit_minutes: data.time_limit_minutes
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить тест');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTestInfo = async () => {
    if (!testId) return;

    try {
      await updateEntranceTest(testId, {
        title: editForm.title,
        description: editForm.description || undefined,
        passing_score: editForm.passing_score,
        time_limit_minutes: editForm.time_limit_minutes || undefined
      });
      setEditMode(false);
      loadTest();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const confirmed = window.confirm('Удалить этот вопрос?');
    if (!confirmed) return;

    try {
      await deleteQuestion(questionId);
      loadTest();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления вопроса');
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'advanced':
        return 'bg-red-500/20 text-red-500';
      case 'intermediate':
        return 'bg-blue-500/20 text-blue-500';
      case 'beginner':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-admin-muted/20 text-admin-muted';
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'advanced':
        return 'Продвинутый';
      case 'intermediate':
        return 'Средний';
      case 'beginner':
        return 'Начинающий';
      default:
        return level;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Множественный выбор';
      case 'true_false':
        return 'Правда/Ложь';
      case 'code':
        return 'Код';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка теста..." />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/teacher/entrance-tests')}>
          ← Назад к тестам
        </Button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-600">{error || 'Тест не найден'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/teacher/entrance-tests')}>
            ← Назад
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-admin-text">Редактирование теста</h1>
            <p className="text-admin-muted mt-1">
              {test.questions.length} {test.questions.length === 1 ? 'вопрос' : 'вопросов'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/teacher/entrance-tests/results?testId=${test.id}`)}
          >
            Посмотреть результаты
          </Button>
        </div>
      </div>

      {/* Test Info Card */}
      <div className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-admin-text">Информация о тесте</h2>
          {editMode ? (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleSaveTestInfo}>
                Сохранить
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                Отмена
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>
              Редактировать
            </Button>
          )}
        </div>

        {editMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Название
              </label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Описание
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">
                  Проходной балл (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.passing_score}
                  onChange={(e) => setEditForm({ ...editForm, passing_score: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">
                  Время (минуты)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.time_limit_minutes || ''}
                  onChange={(e) => setEditForm({ ...editForm, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Без ограничения"
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-sm text-admin-muted">Название</div>
              <div className="text-admin-text">{test.title}</div>
            </div>
            {test.description && (
              <div>
                <div className="text-sm text-admin-muted">Описание</div>
                <div className="text-admin-text">{test.description}</div>
              </div>
            )}
            <div className="flex gap-6">
              <div>
                <div className="text-sm text-admin-muted">Язык</div>
                <div className="text-admin-text capitalize">{test.language}</div>
              </div>
              <div>
                <div className="text-sm text-admin-muted">Проходной балл</div>
                <div className="text-admin-text">{test.passing_score}%</div>
              </div>
              {test.time_limit_minutes && (
                <div>
                  <div className="text-sm text-admin-muted">Время</div>
                  <div className="text-admin-text">{test.time_limit_minutes} минут</div>
                </div>
              )}
              <div>
                <div className="text-sm text-admin-muted">Статус</div>
                <div className={`text-sm font-medium ${test.is_active ? 'text-green-500' : 'text-admin-muted'}`}>
                  {test.is_active ? 'Активен' : 'Неактивен'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Questions Section */}
      <div className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-admin-text">
            Вопросы ({test.questions.length})
          </h2>
          <Button onClick={() => setShowAddModal(true)}>
            Добавить вопрос
          </Button>
        </div>

        {test.questions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-admin-muted mb-4">Вопросы не добавлены</p>
            <Button onClick={() => setShowAddModal(true)}>
              Добавить первый вопрос
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {test.questions.map((question, index) => (
              <div
                key={question.id}
                className="bg-admin-bg rounded-lg border border-admin-muted/10 p-4 hover:border-admin-accent/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-admin-accent/20 text-admin-accent flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getDifficultyColor(question.difficulty_level)}`}>
                            {getDifficultyLabel(question.difficulty_level)}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-admin-muted/20 text-admin-muted">
                            {getQuestionTypeLabel(question.question_type)}
                          </span>
                          {question.skill_category && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-admin-accent/20 text-admin-accent capitalize">
                              {question.skill_category}
                            </span>
                          )}
                          <span className="text-xs text-admin-muted">
                            {question.points} {question.points === 1 ? 'балл' : 'балла'}
                          </span>
                        </div>
                        <p className="text-admin-text mb-2">{question.question_text}</p>
                        {question.question_type === 'multiple_choice' && question.options && (
                          <div className="text-sm text-admin-muted">
                            Варианты: {question.options.length} • Ответ: {question.correct_answer}
                          </div>
                        )}
                        {question.question_type === 'true_false' && (
                          <div className="text-sm text-admin-muted">
                            Правильный ответ: {question.correct_answer === 'true' ? 'Правда' : 'Ложь'}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingQuestion(question)}
                        >
                          Редактировать
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Question Modal */}
      {(showAddModal || editingQuestion) && testId && (
        <AddQuestionModal
          isOpen={true}
          onClose={() => {
            setShowAddModal(false);
            setEditingQuestion(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingQuestion(null);
            loadTest();
          }}
          testId={testId}
          editingQuestion={editingQuestion}
        />
      )}
    </div>
  );
}
