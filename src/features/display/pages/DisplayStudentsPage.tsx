import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getClassStudents } from '../api/displayApi';
import type { StudentListItem } from '../types/display.types';
import { Spinner } from '@/shared/components/ui';

interface DisplayContext {
  selectedClass: string;
}

export function DisplayStudentsPage() {
  const { selectedClass } = useOutletContext<DisplayContext>();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, [selectedClass]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await getClassStudents(selectedClass);
      setStudents(data);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-learning-text mb-2">
          Список учеников - {selectedClass}
        </h1>
        <p className="text-learning-muted">
          Всего учеников: {students.length}
        </p>
      </div>

      <div className="bg-learning-surface rounded-lg border border-learning-muted/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-learning-bg">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-learning-text">
                Логин
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-learning-text">
                Пароль
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-learning-text">
                Имя
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-learning-text">
                Класс
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-learning-muted/10">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-learning-bg/50 transition-colors">
                <td className="px-6 py-4 text-learning-text font-mono">
                  {student.login}
                </td>
                <td className="px-6 py-4 text-learning-text font-mono">
                  {student.password}
                </td>
                <td className="px-6 py-4 text-learning-text">
                  {student.fullName || `${student.firstName} ${student.lastName}`}
                </td>
                <td className="px-6 py-4 text-learning-muted">
                  {student.class}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
