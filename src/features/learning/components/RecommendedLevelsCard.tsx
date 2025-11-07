import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/shared/components/ui';
import { getRecommendedLevels } from '../api/recommendationsApi';
import type { RecommendedLevel } from '../api/recommendationsApi';

interface RecommendedLevelsCardProps {
  studentId: string;
}

export function RecommendedLevelsCard({ studentId }: RecommendedLevelsCardProps) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendedLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [studentId]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecommendedLevels(studentId, 5);
      setRecommendations(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(errorMessage);
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-learning-text mb-4">
          🎯 Рекомендуем для вас
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
          🎯 Рекомендуем для вас
        </h2>
        <div className="text-center text-learning-muted py-4">
          <p className="mb-2">Не удалось загрузить рекомендации</p>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-learning-text mb-4">
          🎯 Рекомендуем для вас
        </h2>
        <div className="text-center py-8">
          <p className="text-learning-muted mb-2">
            Отличная работа! Вы решили все доступные задачи.
          </p>
          <p className="text-sm text-learning-muted">
            Скоро появятся новые уровни!
          </p>
        </div>
      </div>
    );
  }

  // Get difficulty color
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-green-400';
    if (difficulty <= 6) return 'text-yellow-400';
    if (difficulty <= 8) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get match score color
  const getMatchScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-learning-text mb-1">
          🎯 Рекомендуем для вас
        </h2>
        <p className="text-sm text-learning-muted">
          Задачи, подобранные специально для вашего уровня и навыков
        </p>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.level_id}
            onClick={() => navigate(`/learning/levels/${rec.level_id}`)}
            className="bg-learning-bg border border-learning-muted/10 rounded-lg p-4 cursor-pointer hover:border-learning-accent/30 transition-all duration-200 hover:shadow-lg"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-learning-text mb-1">
                  {rec.title}
                </h3>
                <p className="text-sm text-learning-muted line-clamp-2">
                  {rec.description}
                </p>
              </div>

              {/* Match Score Badge */}
              <div className="ml-3 flex-shrink-0">
                <div
                  className={`text-xs font-bold ${getMatchScoreColor(
                    rec.match_score
                  )} bg-learning-surface px-2 py-1 rounded`}
                >
                  {rec.match_score}%
                </div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-3 mb-2 text-xs text-learning-muted">
              <span className="flex items-center gap-1">
                <span>📊</span>
                <span className={getDifficultyColor(rec.difficulty)}>
                  Сложность: {rec.difficulty}/10
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span>💻</span>
                <span>{rec.language === 'python' ? 'Python' : rec.language}</span>
              </span>
            </div>

            {/* Recommendation Reason */}
            <div className="flex items-start gap-2 bg-learning-accent/10 border border-learning-accent/20 rounded px-3 py-2">
              <span className="text-learning-accent">💡</span>
              <p className="text-xs text-learning-accent flex-1">
                {rec.recommendation_reason}
              </p>
            </div>

            {/* Skills Tags */}
            {rec.target_skills && rec.target_skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {rec.target_skills.slice(0, 4).map((skill: string) => (
                  <span
                    key={skill}
                    className="text-xs px-2 py-0.5 bg-learning-muted/10 text-learning-muted rounded"
                  >
                    {skill}
                  </span>
                ))}
                {rec.target_skills.length > 4 && (
                  <span className="text-xs px-2 py-0.5 bg-learning-muted/10 text-learning-muted rounded">
                    +{rec.target_skills.length - 4}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* View All Link */}
      <div className="mt-4 pt-4 border-t border-learning-muted/10">
        <button
          onClick={() => navigate('/learning/levels')}
          className="text-sm text-learning-accent hover:text-blue-400 transition-colors font-medium"
        >
          Посмотреть все задачи →
        </button>
      </div>
    </div>
  );
}
