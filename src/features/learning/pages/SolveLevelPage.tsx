import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spinner, CodeEditor } from '@/shared/components/ui';
import { getLevelById } from '../api/levelsApi';
import { createSubmission, getLatestSubmission } from '../api/submissionsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Level } from '@/shared/types';

export function SolveLevelPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const { user } = useAuthStore();
  const [level, setLevel] = useState<Level | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (levelId && user) {
      loadLevel(levelId);
      loadLastSubmission(levelId, user.id);
    }
  }, [levelId, user]);

  const loadLevel = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLevelById(id);
      setLevel(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки';
      if (errorMessage.includes('not found')) {
        setError('Уровень не найден');
      } else {
        setError('Ошибка загрузки уровня');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadLastSubmission = async (lid: string, uid: string) => {
    try {
      const lastSubmission = await getLatestSubmission(uid, lid);
      if (lastSubmission) {
        setCode(lastSubmission.code);
      }
    } catch (err) {
      // Ignore error - just means no previous submission
      console.log('No previous submission found');
    }
  };

  const handleSaveCode = async () => {
    if (!levelId || !code.trim()) return;

    try {
      setSaving(true);
      setSaveStatus('idle');
      await createSubmission({
        level_id: levelId,
        code: code.trim(),
        status: 'pending'
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
      console.error('Failed to save submission:', err);
    } finally {
      setSaving(false);
    }
  };

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
            {error}
          </h2>
          <div className="space-y-4 mt-4">
            <button
              onClick={() => levelId && loadLevel(levelId)}
              className="px-4 py-2 bg-learning-accent text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Попробовать снова
            </button>
            <div>
              <Link
                to="/student/levels"
                className="text-learning-accent hover:underline"
              >
                Назад к уровням
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!level) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-learning-text">
              {level.title}
            </h1>
            <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(level.difficulty)}`}>
              {getDifficultyLabel(level.difficulty)}
            </span>
          </div>
          {level.topic && (
            <p className="text-sm text-learning-muted">
              {level.topic}
            </p>
          )}
        </div>
        <Link
          to="/student/levels"
          className="text-sm text-learning-accent hover:underline"
        >
          Назад к уровням
        </Link>
      </div>

      {/* Description */}
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-learning-text mb-3">
          Описание задачи
        </h2>
        <p className="text-learning-text whitespace-pre-wrap">
          {level.description}
        </p>

        {/* Target Skills */}
        {level.target_skills && level.target_skills.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-learning-muted mb-2">
              Навыки:
            </h3>
            <div className="flex flex-wrap gap-2">
              {level.target_skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 bg-learning-accent/10 text-learning-accent rounded"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Code Editor */}
      <div className="bg-learning-surface border border-learning-muted/10 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-learning-text mb-3">
          Ваше решение
        </h2>
        <CodeEditor
          value={code}
          onChange={setCode}
          language={level.language}
          height="500px"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            disabled={!code.trim()}
            className="px-6 py-3 bg-learning-accent text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Запустить код
          </button>
          <button
            onClick={handleSaveCode}
            disabled={saving || !code.trim()}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
        {saveStatus === 'saved' && (
          <div className="text-sm text-green-400">
            ✓ Код сохранен
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="text-sm text-red-400">
            ✗ Ошибка сохранения
          </div>
        )}
      </div>
    </div>
  );
}
