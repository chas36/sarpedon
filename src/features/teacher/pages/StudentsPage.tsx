import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllStudents, getAllClasses } from '@/features/teacher/api/studentsApi';
import { Button, Spinner } from '@/shared/components/ui';
import type { Profile } from '@/shared/types';

export function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const filteredStudents = selectedClass === 'all'
    ? students
    : students.filter(s => s.class === selectedClass);

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
      </div>

      {/* Class Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-admin-text">Класс:</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
        >
          <option value="all">Все классы</option>
          {classes.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">Всего студентов</div>
          <div className="text-2xl font-bold text-admin-text mt-1">{students.length}</div>
        </div>
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">В выбранном классе</div>
          <div className="text-2xl font-bold text-admin-accent mt-1">{filteredStudents.length}</div>
        </div>
        <div className="bg-admin-surface rounded-lg p-4 border border-admin-muted/10">
          <div className="text-sm text-admin-muted">Классов</div>
          <div className="text-2xl font-bold text-admin-text mt-1">{classes.length}</div>
        </div>
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-admin-surface rounded-lg p-12 text-center border border-admin-muted/10">
          <p className="text-admin-muted">Студенты не найдены</p>
        </div>
      ) : (
        <div className="bg-admin-surface rounded-lg border border-admin-muted/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-admin-bg border-b border-admin-muted/10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Имя</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Класс</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">Логин</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-admin-muted uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-muted/10">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-admin-bg/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-admin-text">
                      {student.first_name} {student.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-admin-accent/20 text-admin-accent">
                      {student.class || 'Не указан'}
                    </span>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
