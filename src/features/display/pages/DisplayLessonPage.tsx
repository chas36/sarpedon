import { useOutletContext } from 'react-router-dom';

interface DisplayContext {
  selectedClass: string;
}

export function DisplayLessonPage() {
  const { selectedClass } = useOutletContext<DisplayContext>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-learning-text mb-2">
          Мониторинг урока - {selectedClass}
        </h1>
        <p className="text-learning-muted">
          Детальный мониторинг урока (в разработке)
        </p>
      </div>
    </div>
  );
}
