import { useState } from 'react';
import { Button } from '@/shared/components/ui';
import type { ProficiencyLevel } from '@/shared/types';
import { setStudentProficiency } from '../api/proficiencyApi';

interface SetProficiencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentId: string;
  studentName: string;
  currentLevel?: ProficiencyLevel;
  currentScore?: number;
}

export function SetProficiencyModal({
  isOpen,
  onClose,
  onSuccess,
  studentId,
  studentName,
  currentLevel = 'beginner',
  currentScore = 0
}: SetProficiencyModalProps) {
  const [level, setLevel] = useState<ProficiencyLevel>(currentLevel);
  const [score, setScore] = useState<number>(currentScore);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (score < 0 || score > 100) {
      setError('Оценка должна быть от 0 до 100');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await setStudentProficiency(studentId, level, score, notes || undefined);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось установить уровень');
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
              Установить уровень владения
            </h2>
            <p className="text-sm text-admin-muted mt-1">
              Ученик: {studentName}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Level Select */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Уровень владения
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ProficiencyLevel)}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                required
              >
                <option value="beginner">Начинающий (0-40)</option>
                <option value="intermediate">Средний (41-70)</option>
                <option value="advanced">Продвинутый (71-100)</option>
              </select>
            </div>

            {/* Score Input */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Оценка (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
                required
              />
              <p className="text-xs text-admin-muted mt-1">
                Рекомендуемые диапазоны: Начинающий 0-40, Средний 41-70, Продвинутый 71-100
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">
                Примечание (необязательно)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Причина изменения уровня..."
                rows={3}
                className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent resize-none"
              />
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs text-yellow-600">
                ⚠️ При ручной установке уровня автоматический пересчет будет отключен.
                Чтобы включить его обратно, используйте кнопку "Пересчитать".
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
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
