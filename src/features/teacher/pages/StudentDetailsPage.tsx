import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStudentWithProgress, deleteStudent, resetPassword, updateStudent } from '@/features/teacher/api/studentsApi';
import type { StudentWithProgress } from '@/features/teacher/api/studentsApi';
import {
  getStudentProficiencyOverview,
  getStudentProficiencyHistory,
  getStudentSkillProfile,
  recalculateStudentProficiency
} from '@/features/teacher/api/proficiencyApi';
import type {
  StudentProficiencyOverview,
  ProficiencyHistoryRecord,
  SkillProfile
} from '@/features/teacher/api/proficiencyApi';
import { Button, Spinner } from '@/shared/components/ui';
import { SetProficiencyModal } from '../components/SetProficiencyModal';
import { ProficiencyTrendChart } from '../components/charts/ProficiencyTrendChart';
import { SkillsRadarChart } from '../components/charts/SkillsRadarChart';
import { PeriodComparisonCard } from '../components/PeriodComparisonCard';
import { SkillChangesCard } from '../components/SkillChangesCard';

const getProficiencyBadgeColor = (level?: string) => {
  switch (level) {
    case 'advanced':
      return 'bg-green-500/20 text-green-500';
    case 'intermediate':
      return 'bg-blue-500/20 text-blue-500';
    case 'beginner':
      return 'bg-yellow-500/20 text-yellow-500';
    default:
      return 'bg-admin-muted/20 text-admin-muted';
  }
};

const getProficiencyLabel = (level?: string) => {
  switch (level) {
    case 'advanced':
      return 'Продвинутый';
    case 'intermediate':
      return 'Средний';
    case 'beginner':
      return 'Начинающий';
    default:
      return 'Не определен';
  }
};

export function StudentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    className: '',
  });

  // Proficiency data
  const [proficiencyOverview, setProficiencyOverview] = useState<StudentProficiencyOverview | null>(null);
  const [proficiencyHistory, setProficiencyHistory] = useState<ProficiencyHistoryRecord[]>([]);
  const [skillProfile, setSkillProfile] = useState<SkillProfile[]>([]);
  const [loadingProficiency, setLoadingProficiency] = useState(false);
  const [showProficiencyHistory, setShowProficiencyHistory] = useState(false);
  const [showSetProficiencyModal, setShowSetProficiencyModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadStudent();
      loadProficiencyData();
    }
  }, [id]);

  async function loadStudent() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getStudentWithProgress(id);
      setStudent(data);
      setEditForm({
        firstName: data.first_name,
        lastName: data.last_name,
        className: data.class || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные ученика');
    } finally {
      setLoading(false);
    }
  }

  async function loadProficiencyData() {
    if (!id) return;

    try {
      setLoadingProficiency(true);
      const [overview, skills] = await Promise.all([
        getStudentProficiencyOverview(id),
        getStudentSkillProfile(id)
      ]);
      setProficiencyOverview(overview);
      setSkillProfile(skills);
    } catch (err) {
      console.error('Failed to load proficiency data:', err);
    } finally {
      setLoadingProficiency(false);
    }
  }

  async function loadProficiencyHistory() {
    if (!id) return;

    try {
      const history = await getStudentProficiencyHistory(id);
      setProficiencyHistory(history);
      setShowProficiencyHistory(true);
    } catch (err) {
      alert('Не удалось загрузить историю');
    }
  }

  async function handleRecalculateProficiency() {
    if (!id) return;

    const confirmed = window.confirm(
      'Пересчитать уровень владения на основе текущей статистики?'
    );

    if (!confirmed) return;

    try {
      setLoadingProficiency(true);
      await recalculateStudentProficiency(id);
      await Promise.all([loadStudent(), loadProficiencyData()]);
      alert('Уровень владения успешно пересчитан');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка пересчета');
    } finally {
      setLoadingProficiency(false);
    }
  }

  const handleStartEdit = () => {
    if (!student) return;
    setEditForm({
      firstName: student.first_name,
      lastName: student.last_name,
      className: student.class || '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!id) return;

    try {
      await updateStudent(id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        className: editForm.className,
      });
      setIsEditing(false);
      loadStudent();
      alert('Данные успешно обновлены');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка обновления данных');
    }
  };

  const handleResetPassword = async () => {
    if (!id || !student) return;

    const confirmed = window.confirm(
      `Сбросить пароль для ${student.last_name} ${student.first_name}? Пароль будет равен логину.`
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
      `Удалить ученика ${student.last_name} ${student.first_name}? Это действие нельзя отменить.`
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
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    placeholder="Имя"
                    className="px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text"
                  />
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    placeholder="Фамилия"
                    className="px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text"
                  />
                </div>
                <input
                  type="text"
                  value={editForm.className}
                  onChange={(e) => setEditForm({ ...editForm, className: e.target.value })}
                  placeholder="Класс"
                  className="px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text"
                />
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold text-admin-text">
                  {student.last_name} {student.first_name}
                </h1>
                <p className="text-admin-muted mt-1">Класс: {student.class || 'Не указан'}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                Сохранить
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Отмена
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={handleStartEdit}>
                Редактировать
              </Button>
              <Button variant="secondary" size="sm" onClick={handleResetPassword}>
                Сбросить пароль
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                Удалить
              </Button>
            </>
          )}
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

      {/* Proficiency Section */}
      <div className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-admin-text">Уровень владения</h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadProficiencyHistory}
              disabled={loadingProficiency}
            >
              История
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSetProficiencyModal(true)}
              disabled={loadingProficiency}
            >
              Установить вручную
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRecalculateProficiency}
              disabled={loadingProficiency}
            >
              Пересчитать
            </Button>
          </div>
        </div>

        {loadingProficiency ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" text="Загрузка..." />
          </div>
        ) : proficiencyOverview ? (
          <div className="space-y-6">
            {/* Current Level */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-admin-muted mb-2">Уровень</div>
                <span className={`inline-block px-3 py-1.5 text-sm font-medium rounded ${getProficiencyBadgeColor(proficiencyOverview.proficiency_level)}`}>
                  {getProficiencyLabel(proficiencyOverview.proficiency_level)}
                </span>
              </div>
              <div>
                <div className="text-sm text-admin-muted mb-2">Оценка</div>
                <div className="text-2xl font-bold text-admin-text">
                  {proficiencyOverview.proficiency_score}/100
                </div>
              </div>
              <div>
                <div className="text-sm text-admin-muted mb-2">Последняя оценка</div>
                <div className="text-sm text-admin-text">
                  {proficiencyOverview.proficiency_last_assessed
                    ? new Date(proficiencyOverview.proficiency_last_assessed).toLocaleDateString('ru-RU')
                    : 'Не оценивался'}
                </div>
              </div>
            </div>

            {/* Weak Areas */}
            {proficiencyOverview.weak_areas.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-admin-text mb-3">Слабые места</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {proficiencyOverview.weak_areas.map((wa, idx) => (
                    <div key={idx} className="bg-admin-bg rounded-lg p-3 border border-admin-muted/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-admin-text capitalize">
                          {wa.skill_name}
                        </span>
                        <span className="text-xs text-admin-muted">
                          {wa.proficiency}/100
                        </span>
                      </div>
                      <div className="w-full bg-admin-surface rounded-full h-1.5">
                        <div
                          className="bg-red-500 rounded-full h-1.5 transition-all"
                          style={{ width: `${wa.proficiency}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-admin-muted">
                        Ошибок: {wa.mistake_count} | Попыток: {wa.practice_count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Skills */}
            {skillProfile.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-admin-text mb-3">Все навыки</h3>
                <div className="space-y-2">
                  {skillProfile.map((skill) => (
                    <div key={skill.id} className="flex items-center gap-3">
                      <span className="text-sm text-admin-text capitalize w-32">
                        {skill.skill_name}
                      </span>
                      <div className="flex-1 bg-admin-bg rounded-full h-2">
                        <div
                          className={`rounded-full h-2 transition-all ${
                            skill.proficiency >= 70
                              ? 'bg-green-500'
                              : skill.proficiency >= 40
                              ? 'bg-blue-500'
                              : 'bg-yellow-500'
                          }`}
                          style={{ width: `${skill.proficiency}%` }}
                        />
                      </div>
                      <span className="text-xs text-admin-muted w-16 text-right">
                        {skill.proficiency}/100
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Override Badge */}
            {proficiencyOverview.proficiency_manual_override && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <p className="text-sm text-yellow-600">
                  ⚠️ Уровень установлен вручную. Автоматический пересчет отключен.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-admin-muted text-center py-8">
            Данные о уровне владения не найдены
          </p>
        )}

        {/* Proficiency History Modal/Section */}
        {showProficiencyHistory && proficiencyHistory.length > 0 && (
          <div className="mt-6 pt-6 border-t border-admin-muted/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-admin-text">История изменений</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProficiencyHistory(false)}
              >
                Скрыть
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {proficiencyHistory.map((record) => (
                <div key={record.id} className="bg-admin-bg rounded-lg p-3 border border-admin-muted/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getProficiencyBadgeColor(record.old_level)}`}>
                          {getProficiencyLabel(record.old_level)}
                        </span>
                        <span className="text-admin-muted">→</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getProficiencyBadgeColor(record.new_level)}`}>
                          {getProficiencyLabel(record.new_level)}
                        </span>
                        <span className="text-xs text-admin-muted">
                          ({record.old_score} → {record.new_score})
                        </span>
                      </div>
                      <div className="text-xs text-admin-muted">
                        {new Date(record.changed_at).toLocaleString('ru-RU')} •{' '}
                        {record.change_reason === 'manual' ? 'Ручное изменение' :
                         record.change_reason === 'entrance_test' ? 'Входное тестирование' :
                         'Автоматический расчет'}
                      </div>
                      {record.notes && (
                        <div className="text-xs text-admin-text mt-1">
                          Примечание: {record.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Statistics & Charts */}
      {id && proficiencyOverview && (
        <>
          {/* Period Comparison & Skill Changes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PeriodComparisonCard studentId={id} currentPeriodDays={7} previousPeriodDays={7} />
            <SkillChangesCard studentId={id} daysBack={7} />
          </div>

          {/* Proficiency Trend Chart */}
          <div className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6">
            <h2 className="text-xl font-semibold text-admin-text mb-4">
              📈 История изменения профессионализма
            </h2>
            <p className="text-sm text-admin-muted mb-6">
              График показывает динамику изменения баллов и уровня за последние 30 дней
            </p>
            <ProficiencyTrendChart studentId={id} daysBack={30} height={300} />
          </div>

          {/* Skills Radar Chart */}
          <div className="bg-admin-surface rounded-lg border border-admin-muted/10 p-6">
            <h2 className="text-xl font-semibold text-admin-text mb-4">
              🎯 Профиль навыков (Radar Chart)
            </h2>
            <p className="text-sm text-admin-muted mb-6">
              Визуализация уровня владения всеми 12 навыками программирования
            </p>
            <SkillsRadarChart studentId={id} height={400} />
          </div>
        </>
      )}

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

      {/* Set Proficiency Modal */}
      {student && (
        <SetProficiencyModal
          isOpen={showSetProficiencyModal}
          onClose={() => setShowSetProficiencyModal(false)}
          onSuccess={() => {
            setShowSetProficiencyModal(false);
            loadStudent();
            loadProficiencyData();
          }}
          studentId={student.id}
          studentName={`${student.last_name} ${student.first_name}`}
          currentLevel={proficiencyOverview?.proficiency_level}
          currentScore={proficiencyOverview?.proficiency_score}
        />
      )}
    </div>
  );
}
