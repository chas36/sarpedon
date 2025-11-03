import { Link } from 'react-router-dom';
import type { Profile } from '@/shared/types';

interface TopStudentsListProps {
  students: Array<{
    student: Profile;
    completedLevels: number;
    successRate: number;
    rank: number;
  }>;
}

export function TopStudentsList({ students }: TopStudentsListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center text-admin-muted py-8">
        Нет данных для отображения
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {students.map((item) => (
        <Link
          key={item.student.id}
          to={`/teacher/students/${item.student.id}`}
          className="flex items-center gap-4 p-3 bg-admin-bg rounded-lg hover:bg-admin-surface transition-colors"
        >
          <div
            className={`text-2xl font-bold ${
              item.rank === 1
                ? 'text-yellow-400'
                : item.rank === 2
                ? 'text-gray-400'
                : item.rank === 3
                ? 'text-orange-400'
                : 'text-admin-muted'
            }`}
          >
            #{item.rank}
          </div>

          <div className="flex-1">
            <div className="font-medium text-admin-text">
              {item.student.first_name} {item.student.last_name}
            </div>
            <div className="text-xs text-admin-muted">
              {item.student.class}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium text-admin-text">
              {item.completedLevels} задач
            </div>
            <div className="text-xs text-admin-muted">
              {item.successRate}% успешность
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
