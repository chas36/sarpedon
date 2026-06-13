import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '@/shared/components/ui';
import { getLevels } from '../api/levelsApi';
import { getSubmissionsByUser } from '../api/submissionsApi';
import { getStudentProficiencyLevel, getRecommendedLevels } from '../api/recommendationsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Level, Submission, ProficiencyLevel } from '@/shared/types';
import { getDifficultyLabel, getDifficultyBadgeClass } from '@/features/teacher/utils/difficultyUtils';
import { EntranceTestPrompt } from '@/features/entrance-test/components/EntranceTestPrompt';
import { RecommendedLevelsCard } from '../components/RecommendedLevelsCard';
import { AdaptiveLevelsFilter, type FilterState } from '../components/AdaptiveLevelsFilter';

// Extended level with progress info and recommendation
interface LevelWithProgress extends Level {
  status: 'not_started' | 'in_progress' | 'completed';
  lastSubmission?: Submission;
  bestScore?: number;
  isRecommended?: boolean;
}

export function LevelsListPage() {
  const { user } = useAuthStore();
  const [allLevels, setAllLevels] = useState<LevelWithProgress[]>([]);
  const [filteredLevels, setFilteredLevels] = useState<LevelWithProgress[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<Set<string>>(new Set());
  const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    showCompleted: true,
    useAdaptiveFilter: true,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [allLevels, filters, recommendedIds]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load everything in parallel
      const [levelsData, submissions, profLevel, recommended] = await Promise.all([
        getLevels(),
        getSubmissionsByUser(user.id),
        getStudentProficiencyLevel(user.id),
        getRecommendedLevels(user.id, 10),
      ]);

      // Filter to only show approved levels in the main student view
      // Editors' draft/rejected/pending levels should only appear in /student/editor/my-levels
      const approvedLevels = levelsData.filter(level => level.moderation_status === 'approved');

      setProficiencyLevel(profLevel);

      // Create set of recommended level IDs
      const recIds = new Set(recommended.map(r => r.level_id));
      setRecommendedIds(recIds);

      // Create a map of level_id -> submissions for that level
      const submissionsByLevel = submissions.reduce((acc, sub) => {
        if (!acc[sub.level_id]) {
          acc[sub.level_id] = [];
        }
        acc[sub.level_id].push(sub);
        return acc;
      }, {} as Record<string, Submission[]>);

      // Enrich levels with progress information and recommendation status
      const levelsWithProgress: LevelWithProgress[] = approvedLevels.map(level => {
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
          bestScore: bestScore > 0 ? bestScore : undefined,
          isRecommended: recIds.has(level.id),
        };
      });

      setAllLevels(levelsWithProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки уровней');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allLevels];

    // Filter by completion status
    if (!filters.showCompleted) {
      filtered = filtered.filter(l => l.status !== 'completed');
    }

    // Filter by difficulty based on proficiency level
    if (filters.useAdaptiveFilter && filters.minDifficulty && filters.maxDifficulty) {
      filtered = filtered.filter(
        l => l.difficulty >= filters.minDifficulty! && l.difficulty <= filters.maxDifficulty!
      );
    }

    // Sort: recommended first, then by difficulty
    filtered.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.difficulty - b.difficulty;
    });

    setFilteredLevels(filtered);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
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

  const getCardBorderClass = (level: LevelWithProgress) => {
    if (level.isRecommended) {
      return 'border-learning-accent/50 hover:border-learning-accent shadow-lg shadow-learning-accent/10';
    }
    switch (level.status) {
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
  const totalLevels = allLevels.length;
  const completedLevels = allLevels.filter(l => l.status === 'completed').length;
  const inProgressLevels = allLevels.filter(l => l.status === 'in_progress').length;
  const progressPercentage = totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0;

  // Group filtered levels by topic
  const levelsByTopic = filteredLevels.reduce((acc, level) => {
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
            onClick={loadData}
            className="px-4 py-2 bg-learning-accent text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (allLevels.length === 0) {
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
    <div className="space-y-6">
      {/* Entrance Test Prompt */}
      <EntranceTestPrompt />

      {/* Recommended Levels Card */}
      {user && <RecommendedLevelsCard studentId={user.id} />}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-learning-text">Все задания</h1>
        <p className="text-learning-muted mt-1">
          Выбери задачу и прокачай свои навыки программирования
        </p>
      </div>

      {/* Progress Overview - Compact Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/5 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-400">{completedLevels}</div>
              <div className="text-xs text-learning-muted mt-0.5">Выполнено</div>
            </div>
            <div className="text-2xl opacity-60">✅</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-400">{inProgressLevels}</div>
              <div className="text-xs text-learning-muted mt-0.5">В процессе</div>
            </div>
            <div className="text-2xl opacity-60">🔄</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-400">{totalLevels - completedLevels - inProgressLevels}</div>
              <div className="text-xs text-learning-muted mt-0.5">Не начато</div>
            </div>
            <div className="text-2xl opacity-60">⭕</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/5 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-400">{progressPercentage}%</div>
              <div className="text-xs text-learning-muted mt-0.5">Прогресс</div>
            </div>
            <div className="text-2xl opacity-60">📊</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-learning-surface rounded-full overflow-hidden border border-learning-muted/10">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Adaptive Filter */}
      <AdaptiveLevelsFilter
        proficiencyLevel={proficiencyLevel}
        onFilterChange={handleFilterChange}
      />

      {/* Levels Grid */}
      {filteredLevels.length === 0 ? (
        <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-8 text-center">
          <p className="text-learning-muted">
            Нет заданий, соответствующих выбранным фильтрам
          </p>
          <button
            onClick={() => setFilters({ showCompleted: true, useAdaptiveFilter: false })}
            className="mt-4 text-sm text-learning-accent hover:text-blue-400 transition-colors"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        Object.entries(levelsByTopic).map(([topic, topicLevels]) => (
          <div key={topic} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-learning-text">
                {topic}
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-learning-muted/20 to-transparent" />
              <span className="text-sm text-learning-muted">{topicLevels.length} заданий</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {topicLevels.map((level) => (
                <Link
                  key={level.id}
                  to={`/student/levels/${level.id}/solve`}
                  className={`bg-learning-surface border rounded-lg p-5 transition-all cursor-pointer group block relative overflow-hidden hover:scale-[1.02] ${getCardBorderClass(level)}`}
                >
                  {/* Top gradient bar */}
                  <div className={`absolute top-0 left-0 w-full h-1 ${
                    level.isRecommended
                      ? 'bg-gradient-to-r from-learning-accent via-blue-400 to-learning-accent'
                      : level.status === 'completed'
                      ? 'bg-gradient-to-r from-green-500/50 to-green-600/50'
                      : level.status === 'in_progress'
                      ? 'bg-gradient-to-r from-yellow-500/50 to-yellow-600/50'
                      : 'bg-gradient-to-r from-learning-muted/20 to-transparent'
                  }`} />

                  <div className="space-y-3">
                    {/* Header with title and badges */}
                    <div className="flex items-start gap-2">
                      <h3 className="text-base font-semibold text-learning-text group-hover:text-learning-accent transition-colors flex-1 leading-snug">
                        {level.title}
                      </h3>
                      <div className="flex flex-col gap-1 items-end flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyBadgeClass(level.difficulty)}`}>
                          {level.difficulty}/10
                        </span>
                        {level.isRecommended && (
                          <span className="text-xs px-2 py-0.5 bg-learning-accent text-white rounded-full font-medium flex items-center gap-1">
                            🎯
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status and Score */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium flex items-center gap-1 ${getStatusColor(level.status)}`}>
                        <span className="text-sm">{getStatusIcon(level.status)}</span>
                        <span className="hidden sm:inline">{getStatusText(level.status)}</span>
                      </span>
                      {level.bestScore !== undefined && level.bestScore > 0 && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          level.bestScore >= 75 ? 'text-green-400 bg-green-500/10 border border-green-500/20' :
                          level.bestScore >= 50 ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' :
                          'text-red-400 bg-red-500/10 border border-red-500/20'
                        }`}>
                          ⭐ {level.bestScore}%
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-learning-muted line-clamp-2 leading-relaxed">
                      {level.description}
                    </p>

                    {/* Skills */}
                    {level.target_skills && level.target_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {level.target_skills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 bg-learning-accent/10 text-learning-accent rounded border border-learning-accent/20"
                          >
                            {skill}
                          </span>
                        ))}
                        {level.target_skills.length > 3 && (
                          <span className="text-xs px-2 py-0.5 bg-learning-muted/10 text-learning-muted rounded border border-learning-muted/20">
                            +{level.target_skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Last attempt */}
                    {level.lastSubmission && (
                      <div className="text-xs text-learning-muted flex items-center gap-1.5 pt-2 border-t border-learning-muted/10">
                        <span>🕒</span>
                        <span>{new Date(level.lastSubmission.submitted_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
