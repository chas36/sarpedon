import { useOutletContext } from 'react-router-dom';
import { StudentsListWidget } from '../components/widgets/StudentsListWidget';
import { ClassStatsWidget } from '../components/widgets/ClassStatsWidget';
import { LessonMonitorWidget } from '../components/widgets/LessonMonitorWidget';
import { TopAuthorsWidget } from '../components/widgets/TopAuthorsWidget';

interface DisplayContext {
  selectedClass: string;
  onRefresh: () => void;
}

export function DisplayDashboard() {
  const { selectedClass } = useOutletContext<DisplayContext>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-learning-text mb-2">
          Класс {selectedClass}
        </h1>
        <p className="text-learning-muted">
          Обзор активности и статистики класса
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <StudentsListWidget className={selectedClass} />
          <LessonMonitorWidget className={selectedClass} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ClassStatsWidget className={selectedClass} />
          <TopAuthorsWidget />
        </div>
      </div>
    </div>
  );
}
