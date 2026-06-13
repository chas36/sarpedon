import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '@/shared/components/ui';
import { getRecommendedLevels } from '../api/recommendationsApi';
import { getSubmissionsByUser } from '../api/submissionsApi';
import type { RecommendedLevel } from '../api/recommendationsApi';

interface RecommendedLevelsCardProps {
  studentId: string;
}

export function RecommendedLevelsCard({ studentId }: RecommendedLevelsCardProps) {
  const [recommendations, setRecommendations] = useState<RecommendedLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadRecommendations();
  }, [studentId]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем рекомендации и попытки студента
      const [data, submissions] = await Promise.all([
        getRecommendedLevels(studentId, 10),
        getSubmissionsByUser(studentId),
      ]);

      // Создаем Set из ID уровней, которые студент уже выполнил
      const completedLevelIds = new Set(
        submissions
          .filter(s => s.status === 'passed')
          .map(s => s.level_id)
      );

      // Фильтруем рекомендации, исключая выполненные
      const filteredRecommendations = data.filter(
        rec => !completedLevelIds.has(rec.level_id)
      );

      setRecommendations(filteredRecommendations.slice(0, 5));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(errorMessage);
      console.error('Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % recommendations.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + recommendations.length) % recommendations.length);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-learning-accent/10 to-learning-surface border border-learning-accent/20 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-learning-text mb-4 flex items-center gap-2">
          <span>🎯</span>
          <span>Рекомендуем для вас</span>
        </h2>
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Не показываем блок при ошибке
  }

  if (recommendations.length === 0) {
    return null; // Не показываем блок если нет рекомендаций
  }

  // Get difficulty color
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-green-400 bg-green-500/10 border-green-500/20';
    if (difficulty <= 6) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    if (difficulty <= 8) return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  const currentRec = recommendations[currentIndex];

  return (
    <div className="bg-gradient-to-br from-learning-accent/10 to-learning-surface border border-learning-accent/20 rounded-lg p-6 relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-learning-accent via-blue-400 to-learning-accent" />

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-learning-text flex items-center gap-2">
            <span>🎯</span>
            <span>Рекомендуем для вас</span>
          </h2>
          <p className="text-sm text-learning-muted mt-1">
            Задачи, подобранные специально для твоего уровня
          </p>
        </div>
        {recommendations.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={prevSlide}
              className="p-2 rounded-full hover:bg-learning-accent/10 transition-colors text-learning-text"
              aria-label="Предыдущая рекомендация"
            >
              ←
            </button>
            <span className="text-sm text-learning-muted">
              {currentIndex + 1} / {recommendations.length}
            </span>
            <button
              onClick={nextSlide}
              className="p-2 rounded-full hover:bg-learning-accent/10 transition-colors text-learning-text"
              aria-label="Следующая рекомендация"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Carousel Card */}
      <Link
        to={`/student/levels/${currentRec.level_id}/solve`}
        className="block bg-learning-surface border border-learning-accent/30 rounded-lg p-5 hover:border-learning-accent hover:scale-[1.01] transition-all duration-200 group"
      >
        <div className="space-y-4">
          {/* Title and badges */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-learning-text group-hover:text-learning-accent transition-colors flex-1">
              {currentRec.title}
            </h3>
            <div className="flex gap-2 flex-shrink-0">
              <span className={`text-xs px-2 py-1 rounded-full font-medium border ${getDifficultyColor(currentRec.difficulty)}`}>
                {currentRec.difficulty}/10
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-learning-muted leading-relaxed">
            {currentRec.description}
          </p>

          {/* Recommendation reason */}
          <div className="flex items-start gap-2 bg-learning-accent/10 border border-learning-accent/30 rounded-lg px-3 py-2.5">
            <span className="text-lg">💡</span>
            <div className="flex-1">
              <p className="text-sm text-learning-accent font-medium">
                {currentRec.recommendation_reason}
              </p>
            </div>
          </div>

          {/* Meta info and skills */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs px-2 py-1 bg-learning-muted/10 text-learning-muted rounded border border-learning-muted/20">
              💻 {currentRec.language === 'python' ? 'Python' : currentRec.language}
            </span>
            {currentRec.target_skills && currentRec.target_skills.length > 0 && (
              <>
                {currentRec.target_skills.slice(0, 3).map((skill: string) => (
                  <span
                    key={skill}
                    className="text-xs px-2 py-1 bg-learning-accent/10 text-learning-accent rounded border border-learning-accent/20"
                  >
                    {skill}
                  </span>
                ))}
                {currentRec.target_skills.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-learning-muted/10 text-learning-muted rounded border border-learning-muted/20">
                    +{currentRec.target_skills.length - 3}
                  </span>
                )}
              </>
            )}
          </div>

          {/* CTA */}
          <div className="pt-3 border-t border-learning-muted/10">
            <div className="flex items-center justify-between">
              <span className="text-sm text-learning-muted">
                Кликни, чтобы начать решать
              </span>
              <span className="text-learning-accent group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Dots indicator for mobile */}
      {recommendations.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {recommendations.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-learning-accent w-6'
                  : 'bg-learning-muted/30 hover:bg-learning-muted/50'
              }`}
              aria-label={`Перейти к рекомендации ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
