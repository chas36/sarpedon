import { useEffect, useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button, Spinner } from '@/shared/components/ui';
import { supabase } from '@/shared/lib/supabase';
import {
  createLessonSession,
  getActiveLessonForClass,
  getLessonActivity,
  completeLessonSession,
  upsertGrade,
  getAvailableClasses,
  type LessonSession,
  type StudentActivity
} from '../api/lessonsApi';

export function LessonMonitorPage() {
  const { user, profile } = useAuthStore();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [activeLesson, setActiveLesson] = useState<LessonSession | null>(null);
  const [students, setStudents] = useState<StudentActivity[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // ВРЕМЕННАЯ ДИАГНОСТИКА - удалить после исправления
  useEffect(() => {
    const debugAuth = async () => {
      console.group('🔍 LESSON MONITOR DEBUG');

      // Информация о пользователе из store
      console.log('User from store:', user);
      console.log('Profile from store:', profile);

      // Получаем текущую сессию и JWT токен
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('JWT token:', session?.access_token);

      if (session?.access_token) {
        // Декодируем JWT токен (base64)
        try {
          const [, payload] = session.access_token.split('.');
          const decoded = JSON.parse(atob(payload));
          console.log('Decoded JWT payload:', decoded);
          console.log('Role from user_metadata:', decoded.user_metadata?.role);
          console.log('Role from app_metadata:', decoded.app_metadata?.role);
        } catch (e) {
          console.error('Failed to decode JWT:', e);
        }
      }

      console.groupEnd();
    };

    debugAuth();
  }, [user, profile]);

  useEffect(() => {
    loadAvailableClasses();

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  const loadAvailableClasses = async () => {
    try {
      setLoadingClasses(true);
      const classes = await getAvailableClasses();
      setAvailableClasses(classes);
    } catch (err) {
      console.error('Ошибка загрузки списка классов:', err);
      setError('Не удалось загрузить список классов');
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      checkActiveLesson();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (activeLesson) {
      loadActivity();
      // Auto-refresh every 10 seconds
      const interval = setInterval(loadActivity, 10000);
      setRefreshInterval(interval);

      return () => clearInterval(interval);
    }
  }, [activeLesson]);

  const checkActiveLesson = async () => {
    if (!selectedClass) return;

    try {
      setLoading(true);
      const lesson = await getActiveLessonForClass(selectedClass);
      setActiveLesson(lesson);

      if (lesson) {
        await loadActivity();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки урока');
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    if (!activeLesson) return;

    try {
      const activity = await getLessonActivity(activeLesson.id);
      setStudents(activity);
    } catch (err) {
      console.error('Ошибка загрузки активности:', err);
    }
  };

  const handleStartLesson = async () => {
    if (!selectedClass || !user) return;

    try {
      setLoading(true);
      setError(null);

      const lesson = await createLessonSession({
        class: selectedClass,
        topic: 'Урок программирования'
      });

      setActiveLesson(lesson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания урока');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!activeLesson) return;

    const confirm = window.confirm(
      'Вы уверены, что хотите завершить урок? После завершения урока, новые решения студентов не будут привязаны к этому уроку.'
    );

    if (!confirm) return;

    try {
      setLoading(true);
      await completeLessonSession(activeLesson.id);
      setActiveLesson(null);
      setStudents([]);
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка завершения урока');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGrade = async (studentId: string, grade: number) => {
    if (!activeLesson) return;

    try {
      await upsertGrade({
        lesson_session_id: activeLesson.id,
        student_id: studentId,
        grade
      });

      // Refresh activity to show updated grade
      await loadActivity();
    } catch (err) {
      console.error('Ошибка выставления оценки:', err);
      alert('Не удалось выставить оценку');
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGradeColor = (grade: number) => {
    if (grade === 5) return 'text-green-600 bg-green-50';
    if (grade === 4) return 'text-blue-600 bg-blue-50';
    if (grade === 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-admin-text mb-2">
          Мониторинг урока
        </h1>
        <p className="text-admin-muted">
          Отслеживайте активность учеников в реальном времени и выставляйте оценки
        </p>
      </div>

      {/* Class Selection */}
      {!activeLesson && (
        <div className="bg-admin-surface rounded-lg border border-admin-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-admin-text mb-4">
            Выберите класс для начала урока
          </h2>

          {loadingClasses ? (
            <div className="flex justify-center items-center py-8">
              <Spinner size="lg" />
              <span className="ml-3 text-admin-muted">Загрузка классов...</span>
            </div>
          ) : availableClasses.length === 0 ? (
            <div className="text-center py-8 text-admin-muted">
              <p className="mb-2">Классы не найдены</p>
              <p className="text-sm">В системе нет учеников или у них не указаны классы</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
                {availableClasses.map(cls => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`
                      px-4 py-3 rounded-lg font-medium transition-colors
                      ${selectedClass === cls
                        ? 'bg-admin-accent text-white'
                        : 'bg-admin-bg text-admin-text hover:bg-admin-accent/10 border border-admin-border'
                      }
                    `}
                  >
                    {cls}
                  </button>
                ))}
              </div>

              {selectedClass && (
                <Button
                  onClick={handleStartLesson}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Создание урока...' : `Начать урок для класса ${selectedClass}`}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Active Lesson */}
      {activeLesson && (
        <>
          <div className="bg-gradient-to-r from-admin-accent/10 to-admin-accent/5 border border-admin-accent/20 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  <h2 className="text-2xl font-bold text-admin-text">
                    Урок в классе {activeLesson.class}
                  </h2>
                </div>
                <p className="text-admin-muted">
                  Начало: {formatTime(activeLesson.start_time)}
                </p>
                {activeLesson.topic && (
                  <p className="text-admin-text mt-1">
                    Тема: {activeLesson.topic}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={loadActivity}
                  variant="outline"
                  disabled={loading}
                >
                  🔄 Обновить
                </Button>
                <Button
                  onClick={handleCompleteLesson}
                  variant="danger"
                  disabled={loading}
                >
                  Завершить урок
                </Button>
              </div>
            </div>
          </div>

          {/* Student Activity Table */}
          <div className="bg-admin-surface rounded-lg border border-admin-border overflow-hidden">
            <div className="px-6 py-4 bg-admin-bg border-b border-admin-border">
              <h3 className="text-lg font-semibold text-admin-text">
                Активность учеников ({students.length})
              </h3>
            </div>

            {loading && students.length === 0 ? (
              <div className="flex justify-center items-center py-12">
                <Spinner size="lg" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-admin-muted">
                Нет активных учеников. Данные обновляются автоматически каждые 10 секунд.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-admin-bg border-b border-admin-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase tracking-wider">
                        Ученик
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase tracking-wider">
                        Попыток
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase tracking-wider">
                        Решено
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase tracking-wider">
                        Уровней
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase tracking-wider">
                        % успеха
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase tracking-wider">
                        Последняя активность
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-admin-muted uppercase tracking-wider">
                        Оценка
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-admin-surface divide-y divide-admin-border">
                    {students.map(student => (
                      <tr key={student.student_id} className="hover:bg-admin-bg/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-admin-text">
                            {student.student_last_name} {student.student_first_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-admin-text">
                          {student.total_submissions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-medium text-green-600">
                            {student.passed_submissions}
                          </span>
                          {student.failed_submissions > 0 && (
                            <span className="text-sm text-admin-muted ml-1">
                              / {student.failed_submissions}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-admin-text">
                          {student.unique_levels_passed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`text-sm font-medium ${
                            student.success_rate >= 70 ? 'text-green-600' :
                            student.success_rate >= 50 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {student.success_rate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-admin-muted">
                          {student.last_activity
                            ? formatTime(student.last_activity)
                            : '—'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {student.current_grade ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className={`
                                inline-flex items-center justify-center
                                w-8 h-8 rounded-full font-bold text-sm
                                ${getGradeColor(student.current_grade)}
                              `}>
                                {student.current_grade}
                              </span>
                              <button
                                onClick={() => handleSetGrade(student.student_id, student.current_grade!)}
                                className="text-xs text-admin-muted hover:text-admin-text"
                                title="Изменить оценку"
                              >
                                ✏️
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {student.suggested_grade && (
                                <span className="text-xs text-admin-muted mr-2">
                                  → {student.suggested_grade}
                                </span>
                              )}
                              {[5, 4, 3, 2].map(grade => (
                                <button
                                  key={grade}
                                  onClick={() => handleSetGrade(student.student_id, grade)}
                                  className={`
                                    w-7 h-7 rounded text-sm font-medium transition-colors
                                    ${grade === student.suggested_grade
                                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                      : 'bg-admin-bg text-admin-text hover:bg-admin-accent/10 border border-admin-border'
                                    }
                                  `}
                                  title={grade === student.suggested_grade ? 'Рекомендуемая оценка' : ''}
                                >
                                  {grade}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-sm text-admin-muted">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>Урок активен</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-blue-100 border border-blue-300 text-center text-xs leading-6">5</span>
              <span>Рекомендуемая оценка (на основе активности)</span>
            </div>
            <div>
              <span className="font-medium">Автообновление:</span> каждые 10 секунд
            </div>
          </div>
        </>
      )}
    </div>
  );
}
