import { useEffect, useState } from 'react';
import { getActiveLesson, getLessonActivity } from '../../api/displayApi';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Spinner } from '@/shared/components/ui';

interface LessonMonitorWidgetProps {
  className: string;
}

export function LessonMonitorWidget({ className }: LessonMonitorWidgetProps) {
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadLesson = async () => {
    try {
      setLoading(true);
      const lesson = await getActiveLesson(className);
      setActiveLesson(lesson);
    } catch (error) {
      console.error('Failed to load active lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLesson();
  }, [className]);

  // Auto-refresh every 10 seconds
  useAutoRefresh(loadLesson, { interval: 10000 });

  if (loading) {
    return (
      <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
        <h3 className="text-lg font-semibold text-learning-text mb-4">
          🎓 Мониторинг урока
        </h3>
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
      <h3 className="text-lg font-semibold text-learning-text mb-4">
        🎓 Мониторинг урока
      </h3>

      {!activeLesson ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📝</div>
          <p className="text-learning-muted">
            Нет активного урока для класса {className}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-learning-bg p-4 rounded-lg">
            <div className="text-sm text-learning-muted mb-1">Активный урок:</div>
            <div className="font-semibold text-learning-text">
              {activeLesson.level_title || 'Урок'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-learning-bg p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">
                {activeLesson.active_students || 0}
              </div>
              <div className="text-xs text-learning-muted mt-1">
                Активных учеников
              </div>
            </div>
            <div className="bg-learning-bg p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">
                {activeLesson.total_submissions || 0}
              </div>
              <div className="text-xs text-learning-muted mt-1">
                Отправлено решений
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
