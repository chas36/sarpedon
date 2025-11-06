import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '@/shared/components/ui';
import { getLevels } from '../api/levelsApi';
import { getSubmissionsByUser } from '../api/submissionsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Level, Submission } from '@/shared/types';
import { getDifficultyLabel, getDifficultyBadgeClass } from '@/features/teacher/utils/difficultyUtils';
import { EntranceTestPrompt } from '@/features/entrance-test/components/EntranceTestPrompt';

// Extended level with progress info
interface LevelWithProgress extends Level {
  status: 'not_started' | 'in_progress' | 'completed';
  lastSubmission?: Submission;
  bestScore?: number;
}

export function LevelsListPage() {
  const { user } = useAuthStore();
  const [levels, setLevels] = useState<LevelWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadLevels();
    }
  }, [user]);

  const loadLevels = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load levels and submissions in parallel
      const [levelsData, submissions] = await Promise.all([
        getLevels(),
        getSubmissionsByUser(user.id)
      ]);

      // Create a map of level_id -> submissions for that level
      const submissionsByLevel = submissions.reduce((acc, sub) => {
        if (!acc[sub.level_id]) {
          acc[sub.level_id] = [];
        }
        acc[sub.level_id].push(sub);
        return acc;
      }, {} as Record<string, Submission[]>);

      // Enrich levels with progress information
      const levelsWithProgress: LevelWithProgress[] = levelsData.map(level => {
        const levelSubmissions = submissionsByLevel[level.id] || [];
        const hasPassedSubmission = levelSubmissions.some(s => s.status === 'passed');
        const hasAnySubmission = levelSubmissions.length > 0;

        // Find best score from all submissions
        const bestScore = levelSubmissions
          .filter(s => s.quality_metrics?.overall_score)
          .reduce((max, s) => Math.max(max, s.quality_metrics!.overall_score), 0);

        // Sort by submitted_at to get latest
        const sortedSubmissions = [...levelSubmissions].sort(
          (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        );

        return {
          ...level,
          status: hasPassedSubmission ? 'completed' : hasAnySubmission ? 'in_progress' : 'not_started',
          lastSubmission: sortedSubmissions[0],
          bestScore: bestScore > 0 ? bestScore : undefined
        };
      });

      setLevels(levelsWithProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки уровней');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for status display
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '🔄';
      case 'not_started':
      default:
        return '⭕';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Выполнено';
      case 'in_progress':
        return 'В процессе';
      case 'not_started':
      default:
        return 'Не начато';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'in_progress':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'not_started':
      default:
        return 'text-learning-muted bg-learning-muted/10 border-learning-muted/20';
    }
  };

  const getCardBorderClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-500/30 hover:border-green-500/50';
      case 'in_progress':
        return 'border-yellow-500/30 hover:border-yellow-500/50';
      case 'not_started':
      default:
        return 'border-learning-muted/10 hover:border-learning-accent/50';
    }
  };

  // Calculate progress statistics
  const totalLevels = levels.length;
  const completedLevels = levels.filter(l => l.status === 'completed').length;
  const inProgressLevels = levels.filter(l => l.status === 'in_progress').length;
  const progressPercentage = totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0;

  // Group levels by topic
  const levelsByTopic = levels.reduce((acc, level) => {
    const topic = level.topic || 'Без категории';
    if (!acc[topic]) {
      acc[topic] = [];
    }
    acc[topic].push(level);
    return acc;
  }, {} as Record<string, LevelWithProgress[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">
            Ошибка загрузки
          </h2>
          <p className="text-learning-muted mb-4">{error}</p>
          <button
            onClick={loadLevels}
            className="px-4 py-2 bg-learning-accent text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (levels.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-learning-text mb-2">
            Нет доступных уровней
          </h2>
          <p className="text-learning-muted">
            Скоро здесь появятся новые задания
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Entrance Test Prompt */}
      <EntranceTestPrompt />

      {/* Header with Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-learning-text">Мои задания</h1>
          <div className="text-sm text-learning-muted">
            {completedLevels} / {totalLevels} выполнено
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="text-sm font-medium text-green-400">{completedLevels} выполнено</div>
                  <div className="text-xs text-learning-muted">Пройдено успешно</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔄</span>
                <div>
                  <div className="text-sm font-medium text-yellow-400">{inProgressLevels} в процессе</div>
                  <div className="text-xs text-learning-muted">Есть попытки</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭕</span>
                <div>
                  <div className="text-sm font-medium text-learning-muted">{totalLevels - completedLevels - inProgressLevels} не начато</div>
                  <div className="text-xs text-learning-muted">Ждут тебя</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-learning-accent">{progressPercentage}%</div>
              <div className="text-xs text-learning-muted">прогресс</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-3 bg-learning-bg rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-learning-accent transition-all duration-500 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {Object.entries(levelsByTopic).map(([topic, topicLevels]) => (
        <div key={topic} className="space-y-4">
          <h2 className="text-xl font-semibold text-learning-text border-b border-learning-muted/10 pb-2">
            {topic}
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topicLevels.map((level) => (
              <Link
                key={level.id}
                to={`/student/levels/${level.id}/solve`}
                className={`bg-learning-surface border rounded-lg p-6 transition-all cursor-pointer group block relative overflow-hidden ${getCardBorderClass(level.status)}`}
              >
                {/* Status indicator in top-left corner */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-learning-accent/20 to-transparent" />

                <div className="space-y-4">
                  {/* Header with title and difficulty */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-learning-text group-hover:text-learning-accent transition-colors flex-1">
                      {level.title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${getDifficultyBadgeClass(level.difficulty)}`}>
                      {level.difficulty}/10
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium flex items-center gap-1.5 ${getStatusColor(level.status)}`}>
                      <span>{getStatusIcon(level.status)}</span>
                      {getStatusText(level.status)}
                    </span>
                    {level.bestScore !== undefined && level.bestScore > 0 && (
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        level.bestScore >= 75 ? 'text-green-400 bg-green-500/10' :
                        level.bestScore >= 50 ? 'text-yellow-400 bg-yellow-500/10' :
                        'text-red-400 bg-red-500/10'
                      }`}>
                        ⭐ {level.bestScore}%
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-learning-muted line-clamp-2">
                    {level.description}
                  </p>

                  {/* Skills */}
                  {level.target_skills && level.target_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {level.target_skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-learning-accent/10 text-learning-accent rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {level.target_skills.length > 3 && (
                        <span className="text-xs px-2 py-1 text-learning-muted">
                          +{level.target_skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Attempts indicator */}
                  {level.lastSubmission && (
                    <div className="text-xs text-learning-muted flex items-center gap-1 pt-2 border-t border-learning-muted/10">
                      <span>🕒</span>
                      Последняя попытка: {new Date(level.lastSubmission.submitted_at).toLocaleDateString('ru-RU')}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
