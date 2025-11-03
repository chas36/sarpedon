import { Link } from 'react-router-dom';
import type { Submission, Profile, Level } from '@/shared/types';
import { formatDate, formatTime } from '../utils/dateUtils';

interface SubmissionsTableProps {
  submissions: Array<
    Submission & {
      student?: Profile;
      level?: Level;
    }
  >;
  showStudent?: boolean;
  showLevel?: boolean;
  showCode?: boolean;
  limit?: number;
}

export function SubmissionsTable({
  submissions,
  showStudent = true,
  showLevel = true,
  showCode = false,
  limit,
}: SubmissionsTableProps) {
  const displaySubmissions = limit ? submissions.slice(0, limit) : submissions;

  if (displaySubmissions.length === 0) {
    return (
      <div className="text-center text-admin-muted py-8">
        Нет попыток для отображения
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-admin-bg border-b border-admin-muted/10">
          <tr>
            {showStudent && (
              <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                Студент
              </th>
            )}
            {showLevel && (
              <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
                Уровень
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
              Результат
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
              Время
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-admin-muted uppercase">
              Дата
            </th>
            {showCode && (
              <th className="px-6 py-3 text-right text-xs font-medium text-admin-muted uppercase">
                Код
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-muted/10">
          {displaySubmissions.map((submission) => (
            <tr key={submission.id} className="hover:bg-admin-bg/50">
              {showStudent && submission.student && (
                <td className="px-6 py-4">
                  <Link
                    to={`/teacher/students/${submission.student.id}`}
                    className="hover:text-admin-accent"
                  >
                    <div className="font-medium text-admin-text">
                      {submission.student.first_name} {submission.student.last_name}
                    </div>
                    <div className="text-xs text-admin-muted">
                      {submission.student.class}
                    </div>
                  </Link>
                </td>
              )}
              {showLevel && submission.level && (
                <td className="px-6 py-4">
                  <Link
                    to={`/teacher/levels/${submission.level.id}/analytics`}
                    className="hover:text-admin-accent"
                  >
                    <div className="font-medium text-admin-text">
                      {submission.level.title}
                    </div>
                    <div className="text-xs text-admin-muted">
                      {submission.level.difficulty}
                    </div>
                  </Link>
                </td>
              )}
              <td className="px-6 py-4">
                {submission.is_correct ? (
                  <span className="px-2 py-1 text-xs rounded bg-learning-success/20 text-learning-success">
                    ✓ Верно
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs rounded bg-learning-error/20 text-learning-error">
                    ✗ Ошибка
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-admin-muted">
                {submission.execution_time_ms
                  ? formatTime(submission.execution_time_ms)
                  : '—'}
              </td>
              <td className="px-6 py-4 text-sm text-admin-muted">
                {formatDate(submission.submitted_at)}
              </td>
              {showCode && (
                <td className="px-6 py-4 text-right">
                  <button
                    className="text-xs text-admin-accent hover:underline"
                    onClick={() => {
                      // Modal or expand code view
                      console.log('View code:', submission.code);
                    }}
                  >
                    Просмотр
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
