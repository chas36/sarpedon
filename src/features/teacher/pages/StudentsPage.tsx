import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStudents, getAllClasses, toggleEditorFlag } from '@/features/teacher/api/studentsApi';
import { Button, Spinner } from '@/shared/components/ui';
import { AddStudentModal } from '../components/AddStudentModal';
import { BulkImportStudentsModal } from '../components/BulkImportStudentsModal';
import { ManageClassesModal } from '../components/ManageClassesModal';
import type { Profile } from '@/shared/types';

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

const needsHelp = (student: Profile): boolean => {
  const score = student.proficiency_score || 0;
  const level = student.proficiency_level;

  if (level === 'beginner' && score < 35) return true;
  if (level === 'intermediate' && score < 50) return true;
  if (level === 'advanced' && score < 65) return true;
  if (!student.proficiency_last_assessed) return true;

  return false;
};

type SortOption = 'name' | 'score-asc' | 'score-desc' | 'class';

export function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedProficiency, setSelectedProficiency] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [showNeedsHelpOnly, setShowNeedsHelpOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showManageClassesModal, setShowManageClassesModal] = useState(false);

  // Role toggle state
  const [togglingRole, setTogglingRole] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [studentsData, classesData] = await Promise.all([
        getAllStudents(),
        getAllClasses()
      ]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить студентов');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleEditorFlag(student: Profile) {
    const newIsEditor = !student.is_editor;
    const action = newIsEditor ? 'дать права редактора' : 'убрать права редактора';

    if (!confirm(`${action} для ${student.last_name} ${student.first_name}?`)) {
      return;
    }

    try {
      setTogglingRole(student.id);
      await toggleEditorFlag(student.id, newIsEditor);

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === student.id ? { ...s, is_editor: newIsEditor } : s
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка при изменении прав редактора');
    } finally {
      setTogglingRole(null);
    }
  }

  // Apply filters
  let filteredStudents = students;

  // Filter by class
  if (selectedClass !== 'all') {
    filteredStudents = filteredStudents.filter(s => s.class === selectedClass);
  }

  // Filter by proficiency level
  if (selectedProficiency !== 'all') {
    filteredStudents = filteredStudents.filter(s => s.proficiency_level === selectedProficiency);
  }

  // Filter by needs help
  if (showNeedsHelpOnly) {
    filteredStudents = filteredStudents.filter(needsHelp);
  }

  // Apply sorting
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
      case 'score-asc':
        return (a.proficiency_score || 0) - (b.proficiency_score || 0);
      case 'score-desc':
        return (b.proficiency_score || 0) - (a.proficiency_score || 0);
      case 'class':
        return (a.class || '').localeCompare(b.class || '');
      default:
        return 0;
    }
  });

  // Calculate stats
  const needsHelpCount = filteredStudents.filter(needsHelp).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" text="Загрузка студентов..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-admin-danger/10 border border-admin-danger rounded-lg p-4">
        <p className="text-admin-danger">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-text">Студенты</h1>
          <p className="text-admin-muted mt-1">Просмотр и управление учениками</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/teacher/proficiency-analytics')}
          >
            📊 Аналитика
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowManageClassesModal(true)}
          >
            Управление классами
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowBulkImportModal(true)}
          >
            Импорт списком
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            Добавить ученика
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-admin-surface rounded-lg border border-admin-muted/10 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Class Filter */}
          <div>
            <label className="text-xs font-medium text-admin-muted uppercase mb-1 block">Класс</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
            >
              <option value="all">Все классы</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Proficiency Filter */}
          <div>
            <label className="text-xs font-medium text-admin-muted uppercase mb-1 block">Уровень</label>
            <select
              value={selectedProficiency}
              onChange={(e) => setSelectedProficiency(e.target.value)}
              className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
            >
              <option value="all">Все уровни</option>
              <option value="beginner">Начинающий</option>
              <option value="intermediate">Средний</option>
              <option value="advanced">Продвинутый</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="text-xs font-medium text-admin-muted uppercase mb-1 block">Сортировка</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 bg-admin-bg border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
            >
              <option value="name">По имени</option>
              <option value="score-desc">По баллам (↓)</option>
              <option value="score-asc">По баллам (↑)</option>
              <option value="class">По классу</option>
            </select>
          </div>

          {/* Needs Help Filter */}
          <div>
            <label className="text-xs font-medium text-admin-muted uppercase mb-1 block">Фильтр</label>
            <button
              onClick={() => setShowNeedsHelpOnly(!showNeedsHelpOnly)}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showNeedsHelpOnly
                  ? 'bg-admin-danger text-white'
                  : 'bg-admin-bg border border-admin-muted/20 text-admin-text hover:bg-admin-surface'
              }`}
            >
              {showNeedsHelpOnly ? '⚠️ Нужна помощь' : 'Все студенты'}
            </button>
          </div>

          {/* Reset */}
          <div className="flex items-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedClass('all');
                setSelectedProficiency('all');
                setSortBy('name');
                setShowNeedsHelpOnly(false);
              }}
              className="w-full"
            >
              Сбросить
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">Всего студентов</div>
          <div className="text-2xl font-bold text-admin-text mt-1">{students.length}</div>
        </div>
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">После фильтрации</div>
          <div className="text-2xl font-bold text-admin-accent mt-1">{sortedStudents.length}</div>
        </div>
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">Классов</div>
          <div className="text-2xl font-bold text-admin-text mt-1">{classes.length}</div>
        </div>
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-danger/10">
          <div className="text-sm text-admin-muted">Нуждаются в помощи</div>
          <div className="text-2xl font-bold text-admin-danger mt-1">{needsHelpCount}</div>
        </div>
      </div>

      {/* Students List */}
      {sortedStudents.length === 0 ? (
        <div className="bg-admin-surface rounded-lg p-12 text-center border border-admin-muted/10">
          <p className="text-admin-muted">Студенты не найдены</p>
          {(selectedClass !== 'all' || selectedProficiency !== 'all' || showNeedsHelpOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedClass('all');
                setSelectedProficiency('all');
                setShowNeedsHelpOnly(false);
              }}
              className="mt-4"
            >
              Сбросить фильтры
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-muted/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-admin-bg border-b border-admin-muted/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Имя</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Класс</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Роль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Уровень владения</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Логин</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-admin-muted uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-muted/10">
              {sortedStudents.map((student) => {
                const studentNeedsHelp = needsHelp(student);
                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-admin-bg/50 transition-colors ${studentNeedsHelp ? 'bg-admin-danger/5' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {studentNeedsHelp ? (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-admin-danger text-white text-xs font-bold" title="Нуждается в помощи">
                          !
                        </span>
                      ) : (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-500 text-xs">
                          ✓
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-admin-text">
                        {student.last_name} {student.first_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-admin-accent/20 text-admin-accent">
                        {student.class || 'Не указан'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-500/20 text-blue-500">
                          👤 Студент
                        </span>
                        {student.is_editor && (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-purple-500/20 text-purple-500">
                            ✏️ Редактор
                          </span>
                        )}
                        <button
                          onClick={() => handleToggleEditorFlag(student)}
                          disabled={togglingRole === student.id}
                          className="text-xs text-admin-muted hover:text-admin-accent transition-colors disabled:opacity-50"
                          title={student.is_editor ? 'Убрать права редактора' : 'Дать права редактора'}
                        >
                          {togglingRole === student.id ? '...' : '🔄'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getProficiencyBadgeColor(student.proficiency_level)}`}>
                          {getProficiencyLabel(student.proficiency_level)}
                        </span>
                        {student.proficiency_score !== undefined && (
                          <span className={`text-xs font-semibold ${
                            studentNeedsHelp ? 'text-admin-danger' : 'text-admin-muted'
                          }`}>
                            {student.proficiency_score}/100
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-admin-muted">
                      {student.generated_login || student.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/teacher/students/${student.id}`)}
                      >
                        Подробнее
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          loadData();
        }}
      />

      <BulkImportStudentsModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          setShowBulkImportModal(false);
          loadData();
        }}
      />

      <ManageClassesModal
        isOpen={showManageClassesModal}
        onClose={() => setShowManageClassesModal(false)}
      />
    </div>
  );
}
