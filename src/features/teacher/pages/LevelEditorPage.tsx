import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLevelById, createLevel, updateLevel, type CreateLevelData } from '@/features/learning/api/levelsApi';
import { getAllClasses } from '@/features/teacher/api/classesApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button, Spinner } from '@/shared/components/ui';
import type { TestCase, Class } from '@/shared/types';
import { getDifficultyLabel, getDifficultyColor } from '../utils/difficultyUtils';

export function LevelEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const isEditMode = id !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);

  // Form state
  const [formData, setFormData] = useState<CreateLevelData>({
    title: '',
    description: '',
    educational_context: '',
    reference_solution: '',
    test_cases: [{ input: '', output: '', description: '' }],
    hints: [''],
    difficulty: 5, // Default to medium difficulty on 1-10 scale
    order_index: 1,
    topic: '',
    language: 'python',
    target_skills: ['basics'],
    is_remedial: false,
    remedial_for: [],
    allowed_classes: [] // Empty = available to all
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadClasses();
    if (isEditMode && id) {
      loadLevel(id);
    }
  }, [id, isEditMode]);

  async function loadClasses() {
    try {
      const data = await getAllClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  }

  async function loadLevel(levelId: string) {
    try {
      setLoading(true);
      const level = await getLevelById(levelId);
      setFormData({
        title: level.title,
        description: level.description,
        educational_context: level.educational_context || '',
        reference_solution: level.reference_solution,
        test_cases: level.test_cases,
        hints: level.hints || [''],
        difficulty: level.difficulty,
        order_index: level.order_index,
        topic: level.topic || '',
        language: level.language,
        target_skills: level.target_skills,
        is_remedial: level.is_remedial,
        remedial_for: level.remedial_for || [],
        allowed_classes: level.allowed_classes || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить уровень');
    } finally {
      setLoading(false);
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Название обязательно';
    }

    if (!formData.description.trim()) {
      errors.description = 'Описание обязательно';
    }

    if (!formData.reference_solution.trim()) {
      errors.reference_solution = 'Эталонное решение обязательно';
    }

    if (formData.test_cases.length === 0) {
      errors.test_cases = 'Нужен хотя бы один тест-кейс';
    } else {
      const invalidTests = formData.test_cases.some(tc => !tc.output.trim());
      if (invalidTests) {
        errors.test_cases = 'Все тест-кейсы должны иметь ожидаемый вывод';
      }
    }

    if (formData.order_index < 1) {
      errors.order_index = 'Порядковый номер должен быть больше 0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (!profile?.id) {
      setError('Не удалось определить ID пользователя');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Clean up empty hints
      const cleanedData = {
        ...formData,
        hints: formData.hints.filter(h => h.trim() !== ''),
        test_cases: formData.test_cases.filter(tc => tc.output.trim() !== '')
      };

      if (isEditMode && id) {
        await updateLevel(id, cleanedData);
      } else {
        await createLevel(cleanedData, profile.id);
      }

      navigate('/teacher/levels');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  function addTestCase() {
    setFormData({
      ...formData,
      test_cases: [...formData.test_cases, { input: '', output: '', description: '' }]
    });
  }

  function removeTestCase(index: number) {
    setFormData({
      ...formData,
      test_cases: formData.test_cases.filter((_, i) => i !== index)
    });
  }

  function updateTestCase(index: number, field: keyof TestCase, value: string) {
    const updated = [...formData.test_cases];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, test_cases: updated });
  }

  function addHint() {
    setFormData({
      ...formData,
      hints: [...(formData.hints || []), '']
    });
  }

  function removeHint(index: number) {
    setFormData({
      ...formData,
      hints: formData.hints?.filter((_, i) => i !== index) || []
    });
  }

  function updateHint(index: number, value: string) {
    const updated = [...(formData.hints || [])];
    updated[index] = value;
    setFormData({ ...formData, hints: updated });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка уровня..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/teacher/levels')}
          className="mb-4"
        >
          ← Назад к списку
        </Button>
        <h1 className="text-3xl font-bold text-admin-text">
          {isEditMode ? 'Редактировать уровень' : 'Создать новый уровень'}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-4">
          <p className="text-admin-danger">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10 space-y-4">
          <h2 className="text-xl font-semibold text-admin-text mb-4">Основная информация</h2>

          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Название уровня *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              placeholder="Например: Hello World"
            />
            {validationErrors.title && (
              <p className="mt-1 text-sm text-admin-danger">{validationErrors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Описание задания *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              placeholder="Что должен сделать студент..."
            />
            {validationErrors.description && (
              <p className="mt-1 text-sm text-admin-danger">{validationErrors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-admin-text mb-1">
              Образовательный контекст
            </label>
            <textarea
              value={formData.educational_context}
              onChange={(e) => setFormData({ ...formData, educational_context: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              placeholder="Теория и объяснения для студента..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-admin-text mb-1">
                Язык программирования *
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-admin-text mb-1">
                Сложность * (1-10)
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-admin-bg rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <span className="text-2xl font-bold text-admin-text w-8 text-center">{formData.difficulty}</span>
                    <span
                      className="text-xs font-medium px-2 py-1 rounded whitespace-nowrap"
                      style={{
                        backgroundColor: `${getDifficultyColor(formData.difficulty)}20`,
                        color: getDifficultyColor(formData.difficulty)
                      }}
                    >
                      {getDifficultyLabel(formData.difficulty)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-admin-muted px-1">
                  <span>1 - Легкий</span>
                  <span>5 - Средний</span>
                  <span>10 - Очень сложный</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-admin-text mb-1">
                Порядковый номер *
              </label>
              <input
                type="number"
                min="1"
                value={formData.order_index}
                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              />
              {validationErrors.order_index && (
                <p className="mt-1 text-sm text-admin-danger">{validationErrors.order_index}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-admin-text mb-1">
                Тема (опционально)
              </label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                placeholder="Например: Циклы"
              />
            </div>
          </div>

          {/* Class Access Control */}
          <div>
            <label className="block text-sm font-medium text-admin-text mb-2">
              Доступ для классов
            </label>
            <p className="text-xs text-admin-muted mb-3">
              Выберите классы, которым будет доступен этот уровень. Если не выбрано ни одного - уровень доступен всем.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto bg-admin-bg border border-admin-muted/20 rounded-lg p-3">
              {classes.length === 0 ? (
                <p className="text-sm text-admin-muted">Нет доступных классов. Создайте классы в разделе Студенты.</p>
              ) : (
                classes.map((cls) => (
                  <label key={cls.name} className="flex items-center gap-2 cursor-pointer hover:bg-admin-surface p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.allowed_classes?.includes(cls.name) || false}
                      onChange={(e) => {
                        const currentClasses = formData.allowed_classes || [];
                        const newClasses = e.target.checked
                          ? [...currentClasses, cls.name]
                          : currentClasses.filter(c => c !== cls.name);
                        setFormData({ ...formData, allowed_classes: newClasses });
                      }}
                      className="w-4 h-4 text-admin-accent bg-admin-bg border-admin-muted/20 rounded focus:ring-admin-accent"
                    />
                    <span className="text-sm text-admin-text">{cls.name}</span>
                    <span className="text-xs text-admin-muted ml-auto">
                      ({cls.student_count || 0} студентов)
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Reference Solution */}
        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10 space-y-4">
          <h2 className="text-xl font-semibold text-admin-text">Эталонное решение *</h2>
          <textarea
            value={formData.reference_solution}
            onChange={(e) => setFormData({ ...formData, reference_solution: e.target.value })}
            rows={10}
            className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
            placeholder="print('Hello World')"
          />
          {validationErrors.reference_solution && (
            <p className="mt-1 text-sm text-admin-danger">{validationErrors.reference_solution}</p>
          )}
        </div>

        {/* Test Cases */}
        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-admin-text">Тест-кейсы *</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addTestCase}>
              + Добавить тест
            </Button>
          </div>

          {validationErrors.test_cases && (
            <p className="text-sm text-admin-danger">{validationErrors.test_cases}</p>
          )}

          <div className="space-y-4">
            {formData.test_cases.map((testCase, index) => (
              <div key={index} className="bg-admin-bg rounded-lg p-4 border border-admin-muted/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-admin-text">Тест #{index + 1}</h3>
                  {formData.test_cases.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeTestCase(index)}
                    >
                      Удалить
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-admin-muted mb-1">
                      Входные данные
                    </label>
                    <input
                      type="text"
                      value={testCase.input}
                      onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                      className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded text-admin-text text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
                      placeholder="Опционально"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-admin-muted mb-1">
                      Ожидаемый вывод *
                    </label>
                    <input
                      type="text"
                      value={testCase.output}
                      onChange={(e) => updateTestCase(index, 'output', e.target.value)}
                      className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded text-admin-text text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
                      placeholder="Hello World"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-admin-muted mb-1">
                      Описание теста
                    </label>
                    <input
                      type="text"
                      value={testCase.description || ''}
                      onChange={(e) => updateTestCase(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded text-admin-text text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
                      placeholder="Базовый случай"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hints */}
        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-admin-text">Подсказки</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addHint}>
              + Добавить подсказку
            </Button>
          </div>

          <div className="space-y-3">
            {formData.hints?.map((hint, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => updateHint(index, e.target.value)}
                  className="flex-1 px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent"
                  placeholder={`Подсказка ${index + 1}`}
                />
                {(formData.hints?.length || 0) > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeHint(index)}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/teacher/levels')}
            disabled={saving}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            disabled={saving}
          >
            {isEditMode ? 'Сохранить изменения' : 'Создать уровень'}
          </Button>
        </div>
      </form>
    </div>
  );
}
