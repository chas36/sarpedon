import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui';
import { addQuestion } from '../api/entranceTestApi';
import type { QuestionType, DifficultyLevel, EntranceTestQuestion } from '../api/entranceTestApi';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  testId: string;
  editingQuestion?: EntranceTestQuestion | null;
}

export function AddQuestionModal({
  isOpen,
  onClose,
  onSuccess,
  testId,
  editingQuestion
}: AddQuestionModalProps) {
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice');
  const [questionText, setQuestionText] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('beginner');
  const [points, setPoints] = useState(1);
  const [skillCategory, setSkillCategory] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingQuestion) {
      setQuestionType(editingQuestion.question_type);
      setQuestionText(editingQuestion.question_text);
      setDifficulty(editingQuestion.difficulty_level);
      setPoints(editingQuestion.points);
      setSkillCategory(editingQuestion.skill_category || '');
      setCorrectAnswer(editingQuestion.correct_answer || '');
      if (editingQuestion.options) {
        setOptions(editingQuestion.options);
      }
    }
  }, [editingQuestion]);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      setError('Должно быть минимум 2 варианта ответа');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!questionText.trim()) {
      setError('Текст вопроса обязателен');
      return;
    }

    if (questionType === 'multiple_choice') {
      const filledOptions = options.filter(o => o.trim());
      if (filledOptions.length < 2) {
        setError('Добавьте минимум 2 варианта ответа');
        return;
      }
      if (!correctAnswer.trim()) {
        setError('Укажите правильный ответ');
        return;
      }
      if (!filledOptions.includes(correctAnswer)) {
        setError('Правильный ответ должен быть одним из вариантов');
        return;
      }
    }

    if (questionType === 'true_false' && !correctAnswer) {
      setError('Укажите правильный ответ');
      return;
    }

    try {
      setLoading(true);

      await addQuestion({
        test_id: testId,
        question_type: questionType,
        question_text: questionText.trim(),
        difficulty_level: difficulty,
        points,
        correct_answer: correctAnswer.trim() || undefined,
        options: questionType === 'multiple_choice' ? options.filter(o => o.trim()) : undefined,
        skill_category: skillCategory.trim() || undefined,
        order_index: 0 // TODO: support order_index
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось добавить вопрос');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto">
      <div className="bg-admin-surface rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 border border-admin-muted/10">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-admin-muted/10">
            <h2 className="text-xl font-semibold text-admin-text">
              {editingQuestion ? 'Редактировать вопрос' : 'Добавить вопрос'}
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Тип вопроса
              </label>
              <select
                value={questionType}
                onChange={(e) => {
                  setQuestionType(e.target.value as QuestionType);
                  setCorrectAnswer('');
                }}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                disabled={!!editingQuestion}
              >
                <option value="multiple_choice">Множественный выбор</option>
                <option value="true_false">Правда/Ложь</option>
                <option value="code">Код (пока не поддерживается)</option>
              </select>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Текст вопроса *
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Что выведет код: print(2 + 2 * 2)?"
                rows={3}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent resize-none"
                required
              />
            </div>

            {/* Difficulty and Points */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">
                  Сложность
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                >
                  <option value="beginner">Начинающий</option>
                  <option value="intermediate">Средний</option>
                  <option value="advanced">Продвинутый</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">
                  Баллы
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                />
              </div>
            </div>

            {/* Skill Category */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Категория навыка (опционально)
              </label>
              <select
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value)}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
              >
                <option value="">Не указана</option>
                <option value="syntax">Синтаксис</option>
                <option value="variables">Переменные</option>
                <option value="operators">Операторы</option>
                <option value="conditionals">Условные операторы</option>
                <option value="loops">Циклы</option>
                <option value="functions">Функции</option>
                <option value="arrays">Массивы</option>
                <option value="strings">Строки</option>
                <option value="objects">Объекты</option>
                <option value="debugging">Отладка</option>
                <option value="algorithms">Алгоритмы</option>
                <option value="io">Ввод/вывод</option>
              </select>
            </div>

            {/* Multiple Choice Options */}
            {questionType === 'multiple_choice' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-admin-text">
                    Варианты ответов
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddOption}
                  >
                    + Добавить вариант
                  </Button>
                </div>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Вариант ${index + 1}`}
                        className="flex-1 px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                      />
                      {options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(index)}
                        >
                          Удалить
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correct Answer */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Правильный ответ *
              </label>
              {questionType === 'multiple_choice' ? (
                <select
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                  required
                >
                  <option value="">Выберите правильный ответ</option>
                  {options.filter(o => o.trim()).map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : questionType === 'true_false' ? (
                <select
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                  required
                >
                  <option value="">Выберите</option>
                  <option value="true">Правда</option>
                  <option value="false">Ложь</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="Введите правильный ответ"
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                />
              )}
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
              {loading ? 'Сохранение...' : editingQuestion ? 'Сохранить' : 'Добавить вопрос'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
