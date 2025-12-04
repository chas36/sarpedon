import { useEffect, useState } from 'react';
import { getAvailableClasses } from '../api/displayApi';

interface ClassSelectorProps {
  selectedClass: string | null;
  onClassChange: (className: string) => void;
}

export function ClassSelector({ selectedClass, onClassChange }: ClassSelectorProps) {
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await getAvailableClasses();
      setClasses(data);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <select
        value={selectedClass || ''}
        onChange={(e) => onClassChange(e.target.value)}
        disabled={loading}
        className="px-4 py-2 bg-learning-surface text-learning-text rounded-lg border border-learning-muted/20 focus:outline-none focus:border-learning-accent transition-colors min-w-[150px]"
      >
        <option value="">Выберите класс</option>
        {classes.map((className) => (
          <option key={className} value={className}>
            {className}
          </option>
        ))}
      </select>
    </div>
  );
}
