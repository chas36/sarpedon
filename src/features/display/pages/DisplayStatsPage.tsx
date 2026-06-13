import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getClassStats } from '../api/displayApi';
import type { ClassStats } from '../types/display.types';
import { Spinner } from '@/shared/components/ui';

interface DisplayContext {
  selectedClass: string;
}

export function DisplayStatsPage() {
  const { selectedClass } = useOutletContext<DisplayContext>();
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [selectedClass]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getClassStats(selectedClass);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-learning-muted py-12">
        Нет данных для отображения
      </div>
    );
  }

  const statCards = [
    {
      label: 'Всего учеников',
      value: stats.totalStudents,
      icon: '👥',
      color: 'text-blue-500'
    },
    {
      label: 'Средний балл',
      value: stats.averageScore,
      icon: '📊',
      color: 'text-green-500'
    },
    {
      label: 'Прогресс',
      value: `${stats.progressPercentage}%`,
      icon: '📈',
      color: 'text-purple-500'
    },
    {
      label: 'Завершено',
      value: `${stats.completionRate}%`,
      icon: '✅',
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-learning-text mb-2">
          Статистика - {selectedClass}
        </h1>
        <p className="text-learning-muted">
          Детальная статистика класса
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-learning-surface rounded-lg border border-learning-muted/10 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`text-4xl ${card.color}`}>{card.icon}</span>
            </div>
            <div className="text-3xl font-bold text-learning-text mb-1">
              {card.value}
            </div>
            <div className="text-sm text-learning-muted">
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
