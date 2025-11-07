import { useEffect, useState } from 'react';
import { Spinner } from '@/shared/components/ui';
import { getStudentSkills } from '@/shared/api/proficiencyApi';
import type { SkillProficiency } from '@/shared/types/proficiency.types';

interface SkillsProgressCardProps {
  studentId: string;
}

export function SkillsProgressCard({ studentId }: SkillsProgressCardProps) {
  const [skills, setSkills] = useState<SkillProficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, [studentId]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentSkills(studentId);
      setSkills(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(errorMessage);
      console.error('Error loading skills:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-learning-text mb-4">
          Навыки программирования
        </h2>
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-learning-text mb-4">
          Навыки программирования
        </h2>
        <div className="text-center text-learning-muted py-4">
          <p className="mb-2">Не удалось загрузить данные о навыках</p>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-learning-text mb-4">
          Навыки программирования
        </h2>
        <div className="text-center py-8">
          <p className="text-learning-muted mb-2">
            Данных о навыках пока нет
          </p>
          <p className="text-sm text-learning-muted">
            Начните решать задачи, чтобы увидеть свой прогресс!
          </p>
        </div>
      </div>
    );
  }

  // Get color for skill bar based on proficiency
  const getSkillColor = (percentage: number) => {
    if (percentage >= 70) return 'from-green-500 to-emerald-500';
    if (percentage >= 40) return 'from-yellow-500 to-amber-500';
    return 'from-red-500 to-orange-500';
  };

  // Get text color for percentage
  const getTextColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-400';
    if (percentage >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-learning-text mb-1">
          Навыки программирования
        </h2>
        <p className="text-sm text-learning-muted">
          Ваш прогресс по каждому навыку
        </p>
      </div>

      <div className="space-y-4">
        {skills.map((skill) => (
          <div key={skill.skill_name} className="space-y-2">
            {/* Skill Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-learning-text">
                  {skill.skill_display_name}
                </span>
                <span className="text-xs text-learning-muted">
                  ({skill.submissions_count} попыток)
                </span>
              </div>
              <span className={`text-sm font-bold ${getTextColor(skill.proficiency_percentage)}`}>
                {skill.proficiency_percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-learning-bg rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getSkillColor(
                  skill.proficiency_percentage
                )} transition-all duration-500`}
                style={{ width: `${skill.proficiency_percentage}%` }}
              />
            </div>

            {/* Success Rate */}
            {skill.submissions_count > 0 && (
              <div className="flex items-center justify-between text-xs text-learning-muted">
                <span>
                  Успешно: {skill.successful_count}/{skill.submissions_count}
                </span>
                {skill.last_practiced && (
                  <span>
                    Последняя практика:{' '}
                    {new Date(skill.last_practiced).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-learning-muted/10">
        <p className="text-xs text-learning-muted mb-2">Легенда:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
            <span className="text-learning-muted">0-39%: Требует внимания</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500" />
            <span className="text-learning-muted">40-69%: Хорошо</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
            <span className="text-learning-muted">70-100%: Отлично</span>
          </div>
        </div>
      </div>
    </div>
  );
}
