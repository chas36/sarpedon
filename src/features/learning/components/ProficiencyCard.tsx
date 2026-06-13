import { useEffect, useState } from 'react';
import { ProficiencyBadge } from '@/shared/components/ui/ProficiencyBadge';
import { Spinner } from '@/shared/components/ui';
import { getStudentProficiency } from '@/shared/api/proficiencyApi';
import type { ProficiencyData } from '@/shared/types/proficiency.types';

interface ProficiencyCardProps {
  studentId: string;
}

export function ProficiencyCard({ studentId }: ProficiencyCardProps) {
  const [proficiency, setProficiency] = useState<ProficiencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProficiency();
  }, [studentId]);

  const loadProficiency = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentProficiency(studentId);
      setProficiency(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(errorMessage);
      console.error('Error loading proficiency:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  if (error || !proficiency) {
    return (
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <div className="text-center text-learning-muted py-4">
          <p className="mb-2">Данные об уровне недоступны</p>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    );
  }

  // Calculate percentage for progress bar
  const scorePercentage = Math.min(100, Math.max(0, proficiency.score));

  // Get level range description
  const getLevelRange = () => {
    switch (proficiency.level) {
      case 'beginner':
        return '0-40 баллов';
      case 'intermediate':
        return '41-70 баллов';
      case 'advanced':
        return '71-100 баллов';
    }
  };

  // Format last assessed date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Еще не оценивался';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-learning-text mb-1">
            Уровень владения
          </h2>
          <p className="text-sm text-learning-muted">
            {proficiency.manual_override
              ? 'Установлен учителем'
              : 'Рассчитывается автоматически'}
          </p>
        </div>
        <ProficiencyBadge level={proficiency.level} size="lg" />
      </div>

      {/* Score Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-learning-text">
            Текущий балл
          </span>
          <span className="text-2xl font-bold text-learning-accent">
            {proficiency.score}/100
          </span>
        </div>
        <div
          className="w-full h-4 bg-learning-bg rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={scorePercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-gradient-to-r from-learning-accent to-blue-500 transition-all duration-500"
            style={{ width: `${scorePercentage}%` }}
          />
        </div>
        <p className="text-xs text-learning-muted mt-1">{getLevelRange()}</p>
      </div>

      {/* Level Description */}
      <div className="space-y-3">
        <div className="bg-learning-bg rounded-lg p-4">
          <p className="text-sm text-learning-muted mb-1">Что это значит?</p>
          <p className="text-sm text-learning-text">
            {proficiency.level === 'beginner' &&
              'Вы только начинаете свой путь в программировании. Продолжайте решать задачи!'}
            {proficiency.level === 'intermediate' &&
              'Вы освоили базовые концепции и готовы к более сложным задачам!'}
            {proficiency.level === 'advanced' &&
              'Отличная работа! Вы владеете продвинутыми техниками программирования!'}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-learning-muted">Последняя оценка:</span>
          <span className="text-learning-text font-medium">
            {formatDate(proficiency.last_assessed)}
          </span>
        </div>
      </div>
    </div>
  );
}
