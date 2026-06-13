import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { defaultChartOptions } from './chartConfig';
import { getProficiencyTrend, type ProficiencyTrendPoint } from '../../api/proficiencyTrendsApi';
import { Spinner } from '@/shared/components/ui';
import type { ProficiencyLevel } from '@/shared/types';

interface ProficiencyTrendChartProps {
  studentId: string;
  daysBack?: number;
  height?: number;
}

export function ProficiencyTrendChart({
  studentId,
  daysBack = 30,
  height = 256
}: ProficiencyTrendChartProps) {
  const [data, setData] = useState<ProficiencyTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [studentId, daysBack]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const trendData = await getProficiencyTrend(studentId, daysBack);
      setData(trendData);
    } catch (err) {
      console.error('Error loading proficiency trend:', err);
      setError('Не удалось загрузить график прогресса');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Spinner size="md" text="Загрузка графика..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center text-admin-danger" style={{ height }}>
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-admin-muted" style={{ height }}>
        <div className="text-4xl mb-2">📊</div>
        <p>Недостаточно данных для отображения графика</p>
        <p className="text-sm mt-1">График появится после решения нескольких заданий</p>
      </div>
    );
  }

  // Helper to get color for proficiency level
  const getLevelColor = (level: ProficiencyLevel): string => {
    switch (level) {
      case 'advanced': return '#10b981'; // green
      case 'intermediate': return '#3b82f6'; // blue
      case 'beginner': return '#f59e0b'; // yellow
      default: return '#8892a6'; // muted
    }
  };

  // Create point background colors based on level
  const pointBackgroundColors = data.map(point => getLevelColor(point.level));
  const pointBorderColors = pointBackgroundColors;

  const chartData = {
    labels: data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('ru-RU', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }),
    datasets: [
      {
        label: 'Балл профессионализма',
        data: data.map(d => d.score),
        borderColor: '#00d9ff',
        backgroundColor: 'rgba(0, 217, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: pointBackgroundColors,
        pointBorderColor: pointBorderColors,
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      tooltip: {
        ...defaultChartOptions.plugins?.tooltip,
        callbacks: {
          afterLabel: (context: any) => {
            const point = data[context.dataIndex];
            const levelLabel =
              point.level === 'advanced' ? 'Продвинутый' :
              point.level === 'intermediate' ? 'Средний' :
              'Начинающий';

            const reasonLabel =
              point.reason === 'auto_calculation' ? 'Автоматический расчет' :
              point.reason === 'manual_override' ? 'Установлено учителем' :
              point.reason === 'entrance_test' ? 'Вступительный тест' :
              'Начальная оценка';

            return [
              `Уровень: ${levelLabel}`,
              `Причина: ${reasonLabel}`
            ];
          }
        }
      },
      legend: {
        ...defaultChartOptions.plugins?.legend,
        display: true
      }
    },
    scales: {
      ...defaultChartOptions.scales,
      y: {
        ...defaultChartOptions.scales?.y,
        min: 0,
        max: 100,
        ticks: {
          ...defaultChartOptions.scales?.y?.ticks,
          callback: (value: any) => `${value}%`
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />

      {/* Legend for level colors */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-xs text-admin-muted">Начинающий</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-admin-muted">Средний</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-admin-muted">Продвинутый</span>
        </div>
      </div>
    </div>
  );
}
