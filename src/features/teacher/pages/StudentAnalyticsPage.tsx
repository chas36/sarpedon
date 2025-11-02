import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentWithProgress, type StudentWithProgress } from '@/features/teacher/api/studentsApi';
import { Button, Spinner } from '@/shared/components/ui';

export function StudentAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadStudent(id);
    }
  }, [id]);

  async function loadStudent(studentId: string) {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentWithProgress(studentId);
      setStudent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные студента');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка..." />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/students')}>
          ← Назад к списку
        </Button>
        <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-4">
          <p className="text-admin-danger">{error || 'Студент не найден'}</p>
        </div>
      </div>
    );
  }

  const completionRate = student.total_levels && student.total_levels > 0
    ? Math.round(((student.completed_levels || 0) / student.total_levels) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/students')} className="mb-4">
          ← Назад к списку
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-admin-text">
              {student.first_name} {student.last_name}
            </h1>
            <p className="text-admin-muted mt-1">
              Класс: {student.class || 'Не указан'} • Логин: {student.generated_login || student.id.slice(0, 8)}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
          <div className="text-sm text-admin-muted mb-1">Завершено уровней</div>
          <div className="text-3xl font-bold text-learning-success">
            {student.completed_levels || 0}
          </div>
          <div className="text-xs text-admin-muted mt-1">
            из {student.total_levels || 0}
          </div>
        </div>

        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
          <div className="text-sm text-admin-muted mb-1">В процессе</div>
          <div className="text-3xl font-bold text-yellow-400">
            {student.in_progress_levels || 0}
          </div>
        </div>

        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
          <div className="text-sm text-admin-muted mb-1">Всего попыток</div>
          <div className="text-3xl font-bold text-admin-accent">
            {student.total_submissions || 0}
          </div>
        </div>

        <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
          <div className="text-sm text-admin-muted mb-1">Успешность</div>
          <div className="text-3xl font-bold text-admin-text">
            {student.success_rate || 0}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-admin-text">Общий прогресс</h2>
          <span className="text-sm text-admin-muted">{completionRate}%</span>
        </div>
        <div className="w-full bg-admin-bg rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-learning-accent rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-admin-muted">
          Завершено {student.completed_levels || 0} из {student.total_levels || 0} уровней
        </div>
      </div>

      {/* Achievements Section (Placeholder) */}
      <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
        <h2 className="text-lg font-semibold text-admin-text mb-4">Детальная статистика</h2>
        <div className="space-y-3 text-sm text-admin-muted">
          <div className="flex justify-between items-center py-2 border-b border-admin-muted/10">
            <span>Средняя попыток на уровень:</span>
            <span className="text-admin-text font-medium">
              {student.total_levels && student.total_levels > 0
                ? ((student.total_submissions || 0) / student.total_levels).toFixed(1)
                : '0'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-admin-muted/10">
            <span>Процент завершения:</span>
            <span className="text-admin-text font-medium">{completionRate}%</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span>Успешных решений:</span>
            <span className="text-admin-text font-medium">
              {Math.round(((student.total_submissions || 0) * (student.success_rate || 0)) / 100)}
            </span>
          </div>
        </div>
      </div>

      {/* Activity Timeline (Placeholder) */}
      <div className="bg-admin-surface rounded-lg p-6 border border-admin-muted/10">
        <h2 className="text-lg font-semibold text-admin-text mb-4">Последняя активность</h2>
        <p className="text-sm text-admin-muted">
          Детальная история активности будет доступна в следующей версии
        </p>
      </div>
    </div>
  );
}
