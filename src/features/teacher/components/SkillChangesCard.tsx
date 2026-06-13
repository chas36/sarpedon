import { useEffect, useState } from 'react';
import { Card, Spinner } from '@/shared/components/ui';
import { getSkillChanges, type SkillSnapshot } from '../api/proficiencyTrendsApi';

interface SkillChangesCardProps {
  studentId: string;
  daysBack?: number;
}

export function SkillChangesCard({ studentId, daysBack = 7 }: SkillChangesCardProps) {
  const [skills, setSkills] = useState<SkillSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [studentId, daysBack]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const data = await getSkillChanges(studentId, daysBack);
      // Sort by change (most improved first, then most declined)
      data.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      setSkills(data);
    } catch (err) {
      console.error('Error loading skill changes:', err);
      setError('Не удалось загрузить изменения навыков');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" text="Загрузка изменений..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-4 text-admin-danger">
          {error}
        </div>
      </Card>
    );
  }

  // Separate skills by trend
  const improving = skills.filter(s => s.trend === 'improving');
  const declining = skills.filter(s => s.trend === 'declining');
  const stable = skills.filter(s => s.trend === 'stable');

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-admin-text">
            Изменения навыков
          </h3>
          <div className="text-xs text-admin-muted">
            За последние {daysBack} дней
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{improving.length}</div>
            <div className="text-xs text-admin-muted mt-1">Улучшились</div>
          </div>
          <div className="bg-admin-muted/10 border border-admin-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-admin-muted">{stable.length}</div>
            <div className="text-xs text-admin-muted mt-1">Стабильно</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-500">{declining.length}</div>
            <div className="text-xs text-admin-muted mt-1">Снизились</div>
          </div>
        </div>

        {/* Improving skills */}
        {improving.length > 0 && (
          <div>
            <div className="text-sm font-medium text-green-500 mb-2 flex items-center gap-2">
              <span>📈</span>
              <span>Улучшились:</span>
            </div>
            <div className="space-y-2">
              {improving.map(skill => (
                <div
                  key={skill.skill_name}
                  className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-admin-text">
                      {skill.skill_display_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-admin-muted">
                      {skill.previous_proficiency}% → {skill.current_proficiency}%
                    </div>
                    <div className="text-sm font-semibold text-green-500">
                      +{skill.change}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Declining skills */}
        {declining.length > 0 && (
          <div>
            <div className="text-sm font-medium text-red-500 mb-2 flex items-center gap-2">
              <span>📉</span>
              <span>Снизились:</span>
            </div>
            <div className="space-y-2">
              {declining.map(skill => (
                <div
                  key={skill.skill_name}
                  className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm font-medium text-admin-text">
                      {skill.skill_display_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-admin-muted">
                      {skill.previous_proficiency}% → {skill.current_proficiency}%
                    </div>
                    <div className="text-sm font-semibold text-red-500">
                      {skill.change}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stable skills (collapsed) */}
        {stable.length > 0 && (
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-admin-muted hover:text-admin-text transition-colors">
              ➡️ Стабильные навыки ({stable.length})
            </summary>
            <div className="mt-2 space-y-1">
              {stable.map(skill => (
                <div
                  key={skill.skill_name}
                  className="flex items-center justify-between p-2 bg-admin-bg rounded text-xs"
                >
                  <span className="text-admin-muted">{skill.skill_display_name}</span>
                  <span className="text-admin-text">{skill.current_proficiency}%</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Insights */}
        {improving.length === 0 && declining.length === 0 && (
          <div className="bg-admin-bg rounded-lg p-4 text-center text-admin-muted text-sm">
            Недостаточно данных для отображения изменений
          </div>
        )}

        {declining.length > improving.length && declining.length >= 3 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-500">
            ⚠️ Снижение по нескольким навыкам. Рекомендуется дополнительная практика
          </div>
        )}

        {improving.length >= 5 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-500">
            🎉 Отличный прогресс по большинству навыков!
          </div>
        )}
      </div>
    </Card>
  );
}
