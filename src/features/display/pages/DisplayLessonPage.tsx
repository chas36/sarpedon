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
          Детальный мониторинг активного урока
        </p>
      </div>

      <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🎓</div>
          <h3 className="text-xl font-semibold text-learning-text mb-2">
            Нет активного урока
          </h3>
          <p className="text-learning-muted">
            Когда учитель создаст урок для класса {selectedClass}, здесь будет отображаться
            детальная информация о прогрессе учеников, их попытках и статусах выполнения заданий
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6">
          <div className="text-2xl mb-2">👨‍💻</div>
          <div className="text-sm text-learning-muted mb-1">Активных учеников</div>
          <div className="text-3xl font-bold text-learning-text">0</div>
        </div>

        <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6">
          <div className="text-2xl mb-2">✅</div>
          <div className="text-sm text-learning-muted mb-1">Решено задач</div>
          <div className="text-3xl font-bold text-learning-text">0</div>
        </div>

        <div className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6">
          <div className="text-2xl mb-2">📝</div>
          <div className="text-sm text-learning-muted mb-1">Всего попыток</div>
          <div className="text-3xl font-bold text-learning-text">0</div>
        </div>
      </div>
    </div>
  );
}
