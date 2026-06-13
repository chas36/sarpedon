import { useEffect, useState } from 'react';
import { Card, Spinner } from '@/shared/components/ui';
import { comparePeriods, type ComparisonPeriod } from '../api/proficiencyTrendsApi';
import { getProficiencyLabel, getProficiencyBadgeColor } from '@/shared/types/proficiency.types';

interface PeriodComparisonCardProps {
  studentId: string;
  currentPeriodDays?: number;
  previousPeriodDays?: number;
}

export function PeriodComparisonCard({
  studentId,
  currentPeriodDays = 7,
  previousPeriodDays = 7
}: PeriodComparisonCardProps) {
  const [comparison, setComparison] = useState<{
    current: ComparisonPeriod;
    previous: ComparisonPeriod;
    improvement_percentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [studentId, currentPeriodDays, previousPeriodDays]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const data = await comparePeriods(studentId, currentPeriodDays, previousPeriodDays);
      setComparison(data);
    } catch (err) {
      console.error('Error comparing periods:', err);
      setError('Не удалось загрузить сравнение');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" text="Загрузка сравнения..." />
        </div>
      </Card>
    );
  }

  if (error || !comparison) {
    return (
      <Card>
        <div className="text-center py-4 text-admin-danger">
          {error || 'Нет данных'}
        </div>
      </Card>
    );
  }

  const { current, previous, improvement_percentage } = comparison;

  const isImproving = improvement_percentage > 5;
  const isDeclining = improvement_percentage < -5;
  const isStable = !isImproving && !isDeclining;

  const trendIcon = isImproving ? '📈' : isDeclining ? '📉' : '➡️';
  const trendColor = isImproving ? 'text-green-500' : isDeclining ? 'text-red-500' : 'text-admin-muted';
  const trendLabel = isImproving ? 'Улучшение' : isDeclining ? 'Снижение' : 'Стабильно';

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-admin-text">
            Сравнение периодов
          </h3>
          <div className="text-xs text-admin-muted">
            Последние {currentPeriodDays + previousPeriodDays} дней
          </div>
        </div>

        {/* Trend indicator */}
        <div className={`flex items-center justify-center gap-3 p-4 rounded-lg ${
          isImproving ? 'bg-green-500/10 border border-green-500/30' :
          isDeclining ? 'bg-red-500/10 border border-red-500/30' :
          'bg-admin-bg border border-admin-muted/10'
        }`}>
          <div className="text-3xl">{trendIcon}</div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${trendColor}`}>
              {improvement_percentage > 0 ? '+' : ''}{improvement_percentage}%
            </div>
            <div className="text-sm text-admin-muted">{trendLabel}</div>
          </div>
        </div>

        {/* Comparison grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Previous period */}
          <div className="bg-admin-bg rounded-lg p-4 border border-admin-muted/10">
            <div className="text-xs text-admin-muted uppercase mb-3">
              Предыдущие {previousPeriodDays} дней
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-admin-muted mb-1">Средний балл</div>
                <div className="text-2xl font-bold text-admin-text">
                  {previous.avg_score}
                </div>
              </div>

              <div>
                <div className="text-xs text-admin-muted mb-1">Уровень</div>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getProficiencyBadgeColor(previous.avg_level)}`}>
                  {getProficiencyLabel(previous.avg_level)}
                </span>
              </div>

              <div>
                <div className="text-xs text-admin-muted mb-1">Решений</div>
                <div className="text-lg font-semibold text-admin-text">
                  {previous.total_submissions}
                </div>
              </div>
            </div>
          </div>

          {/* Current period */}
          <div className="bg-admin-accent/10 rounded-lg p-4 border border-admin-accent/30">
            <div className="text-xs text-admin-accent uppercase mb-3 font-medium">
              Последние {currentPeriodDays} дней
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-admin-muted mb-1">Средний балл</div>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-admin-text">
                    {current.avg_score}
                  </div>
                  {previous.avg_score !== current.avg_score && (
                    <div className={`text-sm font-medium ${
                      current.avg_score > previous.avg_score ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {current.avg_score > previous.avg_score ? '↑' : '↓'}
                      {Math.abs(current.avg_score - previous.avg_score)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-admin-muted mb-1">Уровень</div>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getProficiencyBadgeColor(current.avg_level)}`}>
                  {getProficiencyLabel(current.avg_level)}
                </span>
              </div>

              <div>
                <div className="text-xs text-admin-muted mb-1">Решений</div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold text-admin-text">
                    {current.total_submissions}
                  </div>
                  {previous.total_submissions !== current.total_submissions && (
                    <div className={`text-sm font-medium ${
                      current.total_submissions > previous.total_submissions ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {current.total_submissions > previous.total_submissions ? '↑' : '↓'}
                      {Math.abs(current.total_submissions - previous.total_submissions)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        {current.total_submissions === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-500">
            ⚠️ Студент не решал задачи в текущем периоде
          </div>
        )}

        {isImproving && current.total_submissions > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-500">
            ✅ Отличная динамика! Продолжайте в том же духе
          </div>
        )}

        {isDeclining && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-500">
            ⚠️ Снижение показателей. Рекомендуется дополнительная помощь
          </div>
        )}
      </div>
    </Card>
  );
}
