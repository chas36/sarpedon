import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { ProficiencyOverviewCard } from '../components/ProficiencyOverviewCard';
import { StudentsNeedingHelpCard } from '../components/StudentsNeedingHelpCard';
import { getAllClasses } from '../api/studentsApi';

export function ProficiencyDashboardPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  async function loadClasses() {
    try {
      setLoading(true);
      const classesData = await getAllClasses();
      setClasses(classesData);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-admin-text">
            Аналитика уровней владения
          </h1>
          <p className="text-admin-muted mt-1">
            Мониторинг прогресса и профессионализма студентов
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/teacher/students')}
          >
            К списку студентов
          </Button>
        </div>
      </div>

      {/* Class Filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-admin-text">Класс:</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-3 py-2 bg-admin-surface border border-admin-muted/20 rounded-lg text-admin-text focus:outline-none focus:ring-2 focus:ring-admin-accent"
          disabled={loading}
        >
          <option value="all">Все классы</option>
          {classes.map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      </div>

      {/* Overview Card */}
      <ProficiencyOverviewCard className={selectedClass === 'all' ? undefined : selectedClass} />

      {/* Students Needing Help */}
      <StudentsNeedingHelpCard className={selectedClass === 'all' ? undefined : selectedClass} limit={10} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/teacher/students')}
          className="bg-admin-surface border border-admin-muted/10 rounded-lg p-6 text-left hover:border-admin-accent transition-colors group"
        >
          <div className="text-3xl mb-3">👥</div>
          <div className="text-lg font-semibold text-admin-text mb-1 group-hover:text-admin-accent transition-colors">
            Все студенты
          </div>
          <div className="text-sm text-admin-muted">
            Просмотр полного списка с фильтрами и сортировкой
          </div>
        </button>

        <button
          onClick={() => navigate('/teacher/statistics')}
          className="bg-admin-surface border border-admin-muted/10 rounded-lg p-6 text-left hover:border-admin-accent transition-colors group"
        >
          <div className="text-3xl mb-3">📊</div>
          <div className="text-lg font-semibold text-admin-text mb-1 group-hover:text-admin-accent transition-colors">
            Общая статистика
          </div>
          <div className="text-sm text-admin-muted">
            Детальная аналитика успеваемости и активности
          </div>
        </button>

        <button
          onClick={() => navigate('/teacher/levels')}
          className="bg-admin-surface border border-admin-muted/10 rounded-lg p-6 text-left hover:border-admin-accent transition-colors group"
        >
          <div className="text-3xl mb-3">📝</div>
          <div className="text-lg font-semibold text-admin-text mb-1 group-hover:text-admin-accent transition-colors">
            Управление заданиями
          </div>
          <div className="text-sm text-admin-muted">
            Создание и редактирование заданий для студентов
          </div>
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-semibold text-blue-500 mb-2">
                Как помочь студентам?
              </h3>
              <ul className="text-sm text-admin-text space-y-1">
                <li>• Назначьте персонализированные задания на основе weak_areas</li>
                <li>• Используйте ручную коррекцию уровня для точной оценки</li>
                <li>• Отслеживайте прогресс через историю изменений</li>
                <li>• Регулярно проверяйте список нуждающихся в помощи</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📈</div>
            <div>
              <h3 className="font-semibold text-green-500 mb-2">
                Критерии уровней
              </h3>
              <ul className="text-sm text-admin-text space-y-1">
                <li>• <strong>Начинающий:</strong> 0-40 баллов (сложность 1-4)</li>
                <li>• <strong>Средний:</strong> 41-70 баллов (сложность 4-7)</li>
                <li>• <strong>Продвинутый:</strong> 71-100 баллов (сложность 7-10)</li>
                <li>• Автоматический пересчет при каждом решении задачи</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
