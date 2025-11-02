import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentWithProgress, deleteStudent, resetPassword } from '@/features/teacher/api/studentsApi';
import type { StudentWithProgress } from '@/features/teacher/api/studentsApi';
import { Button, Spinner } from '@/shared/components/ui';

export function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (id) {
      loadStudent();
    }
  }, [id]);

  async function loadStudent() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getStudentWithProgress(id);
      setStudent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные ученика');
    } finally {
      setLoading(false);
    }
  }

  const handleResetPassword = async () => {
    if (!id || !student) return;

    const confirmed = window.confirm(
      `Сбросить пароль для ${student.first_name} ${student.last_name}? Пароль будет равен логину.`
    );

    if (!confirmed) return;

    try {
      await resetPassword(id);
      alert('Пароль успешно сброшен');
      loadStudent();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сброса пароля');
    }
  };

  const handleDelete = async () => {
    if (!id || !student) return;

    const confirmed = window.confirm(
      `Удалить ученика ${student.first_name} ${student.last_name}? Это действие нельзя отменить.`
    );

    if (!confirmed) return;

    try {
      await deleteStudent(id);
      navigate('/teacher/students');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления ученика');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Скопировано в буфер обмена');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка данных..." />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/teacher/students')}>
          ← Назад к списку
        </Button>
        <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-4">
          <p className="text-admin-danger">{error || 'Ученик не найден'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/teacher/students')}>
            ← Назад
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-admin-text">
              {student.first_name} {student.last_name}
            </h1>
            <p className="text-admin-muted mt-1">Класс: {student.class || 'Не указан'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleResetPassword}>
            Сбросить пароль
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            Удалить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Credentials Card */}
        <div className="lg:col-span-2 bg-admin-surface rounded-lg border border-admin-muted/10 p-6">
          <h2 className="text-xl font-semibold text-admin-text mb-4">Учетные данные</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-admin-muted mb-2">Логин:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={student.generated_login || 'Не установлен'}
                  readOnly
                  className="flex-1 px-4 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text font-mono"
                />
                {student.generated_login && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(student.generated_login!)}
                  >
                    Копировать
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-admin-muted mb-2">Пароль:</label>
              <div className="flex gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={student.generated_password || 'Не установлен'}
                  readOnly
                  className="flex-1 px-4 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text font-mono"
                />
                {student.generated_password && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? 'Скрыть' : 'Показать'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(student.generated_password!)}
                    >
                      Копировать
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-admin-muted/10">
              <p className="text-xs text-admin-muted">
                💡 При сбросе пароля он будет установлен равным логину
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6">
          <h2 className="text-xl font-semibold text-admin-text mb-4">Статистика</h2>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-admin-muted">Всего уровней</div>
              <div className="text-2xl font-bold text-admin-text mt-1">
                {student.total_levels || 0}
              </div>
            </div>

            <div>
              <div className="text-sm text-admin-muted">Завершено</div>
              <div className="text-2xl font-bold text-green-500 mt-1">
                {student.completed_levels || 0}
              </div>
            </div>

            <div>
              <div className="text-sm text-admin-muted">В процессе</div>
              <div className="text-2xl font-bold text-admin-accent mt-1">
                {student.in_progress_levels || 0}
              </div>
            </div>

            <div className="pt-4 border-t border-admin-muted/10">
              <div className="text-sm text-admin-muted">Всего попыток</div>
              <div className="text-lg font-semibold text-admin-text mt-1">
                {student.total_submissions || 0}
              </div>
            </div>

            <div>
              <div className="text-sm text-admin-muted">Процент успеха</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-lg font-semibold text-admin-text">
                  {student.success_rate || 0}%
                </div>
                <div className="flex-1 bg-admin-bg rounded-full h-2">
                  <div
                    className="bg-admin-accent rounded-full h-2 transition-all"
                    style={{ width: `${student.success_rate || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6">
        <h2 className="text-xl font-semibold text-admin-text mb-4">Информация о профиле</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-admin-muted">ID:</span>{' '}
            <span className="text-admin-text font-mono">{student.id}</span>
          </div>
          <div>
            <span className="text-admin-muted">Роль:</span>{' '}
            <span className="text-admin-text">{student.role}</span>
          </div>
          <div>
            <span className="text-admin-muted">Создан:</span>{' '}
            <span className="text-admin-text">
              {new Date(student.created_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
          <div>
            <span className="text-admin-muted">Обновлен:</span>{' '}
            <span className="text-admin-text">
              {new Date(student.updated_at).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
