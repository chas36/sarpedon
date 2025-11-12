import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Spinner } from '@/shared/components/ui';
import { getAllStudentsWithProficiency, type StudentWithProficiency } from '../api/proficiencyApi';
import { getProficiencyBadgeColor, getProficiencyLabel } from '@/shared/types/proficiency.types';

interface StudentsNeedingHelpCardProps {
  className?: string;
  limit?: number;
}

export function StudentsNeedingHelpCard({ className, limit = 10 }: StudentsNeedingHelpCardProps) {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentWithProficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, [className]);

  async function loadStudents() {
    try {
      setLoading(true);
      setError(null);

      let allStudents = await getAllStudentsWithProficiency();

      // Filter by class if specified
      if (className && className !== 'all') {
        allStudents = allStudents.filter(s => s.class === className);
      }

      // Define "needs help" criteria:
      // 1. Beginner with score < 35
      // 2. Intermediate with score < 50
      // 3. Advanced with score < 65
      // 4. Not assessed recently (> 7 days or never)
      const needsHelp = allStudents.filter(student => {
        const score = student.proficiency_score || 0;
        const level = student.proficiency_level;

        // Score-based criteria
        if (level === 'beginner' && score < 35) return true;
        if (level === 'intermediate' && score < 50) return true;
        if (level === 'advanced' && score < 65) return true;

        // Not assessed criteria
        if (!student.proficiency_last_assessed) return true;

        const daysSinceAssessed = Math.floor(
          (Date.now() - new Date(student.proficiency_last_assessed).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceAssessed > 7 && score < 40) return true;

        return false;
      });

      // Sort by score (lowest first)
      needsHelp.sort((a, b) => (a.proficiency_score || 0) - (b.proficiency_score || 0));

      setStudents(needsHelp.slice(0, limit));
    } catch (err) {
      console.error('Failed to load students needing help:', err);
      setError('Не удалось загрузить студентов');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" text="Загрузка..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-4 text-admin-danger">
          {error}
        </div>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-admin-text">
            🎯 Студенты, нуждающиеся в помощи
          </h2>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-admin-muted">
              Отлично! Все студенты показывают хорошие результаты
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const getHelpReason = (student: StudentWithProficiency): string => {
    const score = student.proficiency_score || 0;
    const level = student.proficiency_level;

    if (!student.proficiency_last_assessed) {
      return 'Не проходил оценку';
    }

    const daysSinceAssessed = Math.floor(
      (Date.now() - new Date(student.proficiency_last_assessed).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceAssessed > 7 && score < 40) {
      return `Низкий балл и давно не практиковался (${daysSinceAssessed} дн.)`;
    }

    if (level === 'beginner' && score < 35) {
      return `Очень низкий балл для начинающего (${score}/100)`;
    }
    if (level === 'intermediate' && score < 50) {
      return `Низкий балл для среднего уровня (${score}/100)`;
    }
    if (level === 'advanced' && score < 65) {
      return `Низкий балл для продвинутого (${score}/100)`;
    }

    return 'Требуется внимание';
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-admin-text">
            🎯 Студенты, нуждающиеся в помощи
          </h2>
          <span className="px-3 py-1 bg-admin-danger/20 text-admin-danger text-sm font-medium rounded-full">
            {students.length} {students.length === 1 ? 'студент' : 'студентов'}
          </span>
        </div>

        <div className="space-y-2">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center gap-3 p-3 bg-admin-bg rounded-lg hover:bg-admin-surface transition-colors cursor-pointer border border-admin-danger/20"
              onClick={() => navigate(`/teacher/students/${student.id}`)}
            >
              {/* Priority indicator */}
              <div className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${
                  (student.proficiency_score || 0) < 30
                    ? 'bg-red-500'
                    : (student.proficiency_score || 0) < 50
                    ? 'bg-orange-500'
                    : 'bg-yellow-500'
                }`} />
              </div>

              {/* Student info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-admin-text">
                    {student.last_name} {student.first_name}
                  </span>
                  {student.class && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-admin-muted/20 text-admin-muted">
                      {student.class}
                    </span>
                  )}
                </div>
                <div className="text-xs text-admin-muted mt-0.5">
                  {getHelpReason(student)}
                </div>
              </div>

              {/* Proficiency badge */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getProficiencyBadgeColor(student.proficiency_level)}`}>
                  {getProficiencyLabel(student.proficiency_level)}
                </span>
                <span className="text-sm font-semibold text-admin-text">
                  {student.proficiency_score}/100
                </span>
              </div>

              {/* Action */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/teacher/students/${student.id}`);
                }}
              >
                Помочь →
              </Button>
            </div>
          ))}
        </div>

        {students.length >= limit && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/teacher/proficiency-analytics')}
            >
              Показать всех →
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
