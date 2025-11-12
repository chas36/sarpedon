import { Link } from 'react-router-dom';
import type { Profile } from '@/shared/types';
import { formatDate } from '../utils/dateUtils';

interface StrugglingStudentsListProps {
  students: Array<{
    student: Profile;
    completedLevels: number;
    successRate: number;
    lastActivityDate: string | null;
    issue: 'low_success' | 'low_activity' | 'inactive';
  }>;
}

export function StrugglingStudentsList({ students }: StrugglingStudentsListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center text-admin-muted py-8">
        Все ученики на хорошем уровне! 🎉
      </div>
    );
  }

  const getIssueBadge = (issue: string) => {
    switch (issue) {
      case 'low_success':
        return (
          <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400">
            Низкая успешность
          </span>
        );
      case 'low_activity':
        return (
          <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400">
            Мало задач
          </span>
        );
      case 'inactive':
        return (
          <span className="px-2 py-1 text-xs rounded bg-gray-500/20 text-gray-400">
            Неактивен
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {students.map((item) => (
        <Link
          key={item.student.id}
          to={`/teacher/students/${item.student.id}`}
          className="flex items-center gap-4 p-3 bg-admin-bg rounded-lg hover:bg-admin-surface transition-colors"
        >
          <div className="flex-1">
            <div className="font-medium text-admin-text">
              {item.student.last_name} {item.student.first_name}
            </div>
            <div className="text-xs text-admin-muted mt-1">
              {item.completedLevels} задач • {item.successRate}% успешность
              {item.lastActivityDate && (
                <> • {formatDate(item.lastActivityDate)}</>
              )}
            </div>
          </div>

          <div>{getIssueBadge(item.issue)}</div>
        </Link>
      ))}
    </div>
  );
}
