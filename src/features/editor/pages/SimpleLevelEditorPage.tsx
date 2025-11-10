import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLevelById, createLevel, updateLevel, type CreateLevelData } from '@/features/learning/api/levelsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button, Spinner } from '@/shared/components/ui';
import type { TestCase } from '@/shared/types';

// Упрощенный редактор для студентов-редакторов (без AI, продвинутых функций)
export function SimpleLevelEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const isEditMode = id !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Упрощенная форма (без allowed_classes, remedial, и других продвинутых функций)
  const [formData, setFormData] = useState<CreateLevelData>({
    title: '',
    description: '',
    educational_context: '',
    reference_solution: '',
    test_cases: [{ input: '', output: '', description: '' }],
    hints: [''],
    difficulty: 5, // Средняя сложность по умолчанию
    order_index: 1,
    topic: '',
    language: 'python',
    target_skills: ['basics'],
    is_remedial: false,
    remedial_for: [],
    allowed_classes: [] // Доступно всем
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode && id) {
      loadLevel(id);
    }
  }, [id, isEditMode]);

  async function loadLevel(levelId: string) {
    try {
      setLoading(true);
      const level = await getLevelById(levelId);

      // Редакторы могут редактировать только свои уровни
      if (level.created_by !== profile?.id) {
        setError('Вы можете редактировать только свои задания');
        setTimeout(() => navigate('/student/editor/my-levels'), 2000);
        return;
      }

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
        is_remedial: false, // Редакторы не создают remedial задания
        remedial_for: [],
        allowed_classes: level.allowed_classes || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить задание');
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
        test_cases: formData.test_cases.filter(tc => tc.output.trim() !== ''),
        moderation_status: 'pending_review' as const // Задания редакторов требуют модерации
      };

      if (isEditMode && id) {
        await updateLevel(id, cleanedData);
      } else {
        await createLevel(cleanedData, profile.id);
      }

      navigate('/student/editor/my-levels');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  }

  const handleInputChange = (field: keyof CreateLevelData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, { input: '', output: '', description: '' }]
    }));
  };

  const removeTestCase = (index: number) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, i) => i !== index)
    }));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.map((tc, i) =>
        i === index ? { ...tc, [field]: value } : tc
      )
    }));
  };

  const addHint = () => {
    setFormData(prev => ({
      ...prev,
      hints: [...prev.hints, '']
    }));
  };

  const removeHint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      hints: prev.hints.filter((_, i) => i !== index)
    }));
  };

  const updateHint = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      hints: prev.hints.map((h, i) => i === index ? value : h)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка задания..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-learning-text">
            {isEditMode ? 'Редактировать задание' : 'Создать новое задание'}
          </h1>
          <p className="text-learning-muted mt-1">
            Создайте задание для других учеников. Все поля обязательны.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate('/student/editor/my-levels')}
        >
          Отмена
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основная информация */}
        <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-learning-text">Основная информация</h2>

          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-learning-text mb-2">
              Название задания *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-4 py-2 bg-learning-bg border rounded-lg text-learning-text focus:outline-none focus:ring-2 ${
                validationErrors.title
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-learning-muted/20 focus:ring-learning-accent'
              }`}
              placeholder="Например: Сумма двух чисел"
            />
            {validationErrors.title && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.title}</p>
            )}
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-learning-text mb-2">
              Описание задания *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={`w-full px-4 py-2 bg-learning-bg border rounded-lg text-learning-text focus:outline-none focus:ring-2 ${
                validationErrors.description
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-learning-muted/20 focus:ring-learning-accent'
              }`}
              placeholder="Опишите, что нужно сделать в этом задании..."
            />
            {validationErrors.description && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.description}</p>
            )}
          </div>

          {/* Дополнительная информация */}
          <div>
            <label className="block text-sm font-medium text-learning-text mb-2">
              Теория и объяснения (опционально)
            </label>
            <textarea
              value={formData.educational_context}
              onChange={(e) => handleInputChange('educational_context', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-learning-bg border border-learning-muted/20 rounded-lg text-learning-text focus:outline-none focus:ring-2 focus:ring-learning-accent"
              placeholder="Объясните теорию, которая нужна для решения этого задания..."
            />
          </div>

          {/* Язык программирования */}
          <div>
            <label className="block text-sm font-medium text-learning-text mb-2">
              Язык программирования *
            </label>
            <select
              value={formData.language}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full px-4 py-2 bg-learning-bg border border-learning-muted/20 rounded-lg text-learning-text focus:outline-none focus:ring-2 focus:ring-learning-accent"
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          {/* Сложность */}
          <div>
            <label className="block text-sm font-medium text-learning-text mb-2">
              Сложность (1 - легко, 10 - сложно)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-2xl font-bold text-learning-accent w-12 text-center">
                {formData.difficulty}
              </span>
            </div>
          </div>

          {/* Тема */}
          <div>
            <label className="block text-sm font-medium text-learning-text mb-2">
              Тема
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => handleInputChange('topic', e.target.value)}
              className="w-full px-4 py-2 bg-learning-bg border border-learning-muted/20 rounded-lg text-learning-text focus:outline-none focus:ring-2 focus:ring-learning-accent"
              placeholder="Например: Переменные, Циклы, Функции..."
            />
          </div>
        </div>

        {/* Эталонное решение */}
        <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-learning-text">Эталонное решение</h2>
          <p className="text-sm text-learning-muted">
            Введите правильное решение задачи. Оно будет использоваться для проверки.
          </p>
          <textarea
            value={formData.reference_solution}
            onChange={(e) => handleInputChange('reference_solution', e.target.value)}
            rows={10}
            className={`w-full px-4 py-2 bg-learning-bg border rounded-lg text-learning-text font-mono text-sm focus:outline-none focus:ring-2 ${
              validationErrors.reference_solution
                ? 'border-red-500 focus:ring-red-500'
                : 'border-learning-muted/20 focus:ring-learning-accent'
            }`}
            placeholder="def solution():\n    # Ваш код здесь\n    pass"
          />
          {validationErrors.reference_solution && (
            <p className="text-red-500 text-sm mt-1">{validationErrors.reference_solution}</p>
          )}
        </div>

        {/* Тест-кейсы */}
        <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-learning-text">Тест-кейсы</h2>
              <p className="text-sm text-learning-muted">
                Добавьте примеры входных и выходных данных для проверки решения
              </p>
            </div>
            <Button type="button" size="sm" onClick={addTestCase}>
              ➕ Добавить тест
            </Button>
          </div>

          {validationErrors.test_cases && (
            <p className="text-red-500 text-sm">{validationErrors.test_cases}</p>
          )}

          {formData.test_cases.map((testCase, index) => (
            <div key={index} className="bg-learning-bg rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-learning-text">
                  Тест #{index + 1}
                </h3>
                {formData.test_cases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTestCase(index)}
                    className="text-red-500 hover:text-red-400 text-sm"
                  >
                    Удалить
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-learning-muted mb-1">
                  Входные данные
                </label>
                <input
                  type="text"
                  value={testCase.input}
                  onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                  className="w-full px-3 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text text-sm focus:outline-none focus:ring-2 focus:ring-learning-accent"
                  placeholder="Например: 5 3"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-learning-muted mb-1">
                  Ожидаемый вывод *
                </label>
                <input
                  type="text"
                  value={testCase.output}
                  onChange={(e) => updateTestCase(index, 'output', e.target.value)}
                  className="w-full px-3 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text text-sm focus:outline-none focus:ring-2 focus:ring-learning-accent"
                  placeholder="Например: 8"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-learning-muted mb-1">
                  Описание (опционально)
                </label>
                <input
                  type="text"
                  value={testCase.description || ''}
                  onChange={(e) => updateTestCase(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 bg-learning-surface border border-learning-muted/20 rounded-lg text-learning-text text-sm focus:outline-none focus:ring-2 focus:ring-learning-accent"
                  placeholder="Объясните, что проверяет этот тест"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Подсказки */}
        <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-learning-text">Подсказки</h2>
              <p className="text-sm text-learning-muted">
                Добавьте подсказки, которые помогут ученикам решить задание
              </p>
            </div>
            <Button type="button" size="sm" onClick={addHint}>
              ➕ Добавить подсказку
            </Button>
          </div>

          {formData.hints.map((hint, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={hint}
                onChange={(e) => updateHint(index, e.target.value)}
                className="flex-1 px-4 py-2 bg-learning-bg border border-learning-muted/20 rounded-lg text-learning-text focus:outline-none focus:ring-2 focus:ring-learning-accent"
                placeholder={`Подсказка ${index + 1}`}
              />
              {formData.hints.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeHint(index)}
                  className="text-red-500 hover:text-red-400 text-sm px-2"
                >
                  Удалить
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Кнопки сохранения */}
        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/student/editor/my-levels')}
            disabled={saving}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Сохранение...
              </>
            ) : (
              isEditMode ? 'Сохранить изменения' : 'Создать задание'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
