import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '@/shared/components/ui';
import { getLevels } from '../api/levelsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Level } from '@/shared/types';

export function LevelsListPage() {
  const { profile } = useAuthStore();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      setLoading(true);
      setError(null);
      // Pass student's class to filter levels
      const data = await getLevels(profile?.class);
      setLevels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки уровней');
    } finally {
      setLoading(false);
    }
  };

  // Group levels by topic
  const levelsByTopic = levels.reduce((acc, level) => {
    const topic = level.topic || 'Без категории';
    if (!acc[topic]) {
      acc[topic] = [];
    }
    acc[topic].push(level);
    return acc;
  }, {} as Record<string, Level[]>);

  const getDifficultyLabel = (difficulty: string) => {
    const labels = {
      easy: 'Легко',
      medium: 'Средне',
      hard: 'Сложно'
    };
    return labels[difficulty as keyof typeof labels] || difficulty;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-500/10 text-green-400 border-green-500/20',
      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      hard: 'bg-red-500/10 text-red-400 border-red-500/20'
    };
    return colors[difficulty as keyof typeof colors] || 'bg-learning-surface text-learning-text';
  };

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-learning-text">Уровни</h1>
        <div className="text-sm text-learning-muted">
          Всего уровней: {levels.length}
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
                className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6 hover:border-learning-accent/50 transition-all cursor-pointer group block"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-learning-text group-hover:text-learning-accent transition-colors">
                    {level.title}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(level.difficulty)}`}>
                    {getDifficultyLabel(level.difficulty)}
                  </span>
                </div>

                <p className="text-sm text-learning-muted mb-4 line-clamp-2">
                  {level.description}
                </p>

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
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
