import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getClassStudents } from '../../api/displayApi';
import type { StudentListItem } from '../../types/display.types';
import { Spinner } from '@/shared/components/ui';

interface StudentsListWidgetProps {
  className: string;
}

export function StudentsListWidget({ className }: StudentsListWidgetProps) {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, [className]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await getClassStudents(className);
      setStudents(data.slice(0, 10)); // Show first 10
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
        <h3 className="text-lg font-semibold text-learning-text mb-4">
          👥 Список учеников
        </h3>
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-learning-surface rounded-lg p-6 border border-learning-muted/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-learning-text">
          👥 Список учеников
        </h3>
        <Link
          to="/display/students"
          className="text-sm text-learning-accent hover:underline"
        >
          Все →
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="text-learning-muted text-center py-8">
          Нет учеников в классе {className}
        </p>
      ) : (
        <div className="space-y-2">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 bg-learning-bg rounded-lg"
            >
              <div>
                <div className="font-medium text-learning-text">
                  {student.fullName || `${student.firstName} ${student.lastName}`}
                </div>
                <div className="text-sm text-learning-muted">
                  Логин: {student.login}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
