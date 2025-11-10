import { useEffect, useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { defaultChartOptions } from './chartConfig';
import { getSkillsSnapshot } from '../../api/proficiencyTrendsApi';
import { Spinner } from '@/shared/components/ui';

interface SkillsRadarChartProps {
  studentId: string;
  height?: number;
}

const skillLabels: Record<string, string> = {
  syntax: 'Синтаксис',
  variables: 'Переменные',
  operators: 'Операторы',
  conditionals: 'Условия',
  loops: 'Циклы',
  functions: 'Функции',
  arrays: 'Массивы',
  objects: 'Объекты',
  io: 'Ввод/Вывод',
  debugging: 'Отладка',
  algorithms: 'Алгоритмы',
  testing: 'Тестирование'
};

export function SkillsRadarChart({ studentId, height = 400 }: SkillsRadarChartProps) {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [studentId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await getSkillsSnapshot(studentId);
      setData(snapshot);
    } catch (err) {
      console.error('Error loading skills snapshot:', err);
      setError('Не удалось загрузить навыки');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Spinner size="md" text="Загрузка навыков..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center text-admin-danger" style={{ height }}>
        {error || 'Нет данных'}
      </div>
    );
  }

  const skillNames = Object.keys(skillLabels);
  const labels = skillNames.map(name => skillLabels[name]);
  const values = skillNames.map(name => data[name] || 0);

  // Find min and max for color coding
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Уровень навыка',
        data: values,
        borderColor: '#00d9ff',
        backgroundColor: 'rgba(0, 217, 255, 0.2)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#00d9ff',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
      },
    ],
  };

  const options = {
    ...defaultChartOptions,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          color: '#8892a6',
          backdropColor: 'transparent',
          font: { size: 10 }
        },
        grid: {
          color: 'rgba(136, 146, 166, 0.15)',
        },
        pointLabels: {
          color: '#e4e7eb',
          font: { size: 11, weight: '500' }
        },
        angleLines: {
          color: 'rgba(136, 146, 166, 0.1)',
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        ...defaultChartOptions.plugins?.tooltip,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.r;
            let level = '';
            if (value >= 70) level = ' (Отлично)';
            else if (value >= 40) level = ' (Хорошо)';
            else if (value > 0) level = ' (Требует практики)';
            else level = ' (Не практиковался)';

            return `${context.label}: ${value}%${level}`;
          }
        }
      }
    }
  };

  // Find weakest skills (lowest 3)
  const skillsWithValues = skillNames.map((name, index) => ({
    name: skillLabels[name],
    value: values[index]
  }));
  skillsWithValues.sort((a, b) => a.value - b.value);
  const weakestSkills = skillsWithValues.slice(0, 3);

  return (
    <div>
      <div style={{ height }}>
        <Radar data={chartData} options={options} />
      </div>

      {/* Weakest skills indicator */}
      <div className="mt-6 p-4 bg-admin-surface rounded-lg border border-admin-muted/10">
        <div className="text-sm font-medium text-admin-text mb-3">
          🎯 Навыки, требующие практики:
        </div>
        <div className="grid grid-cols-3 gap-3">
          {weakestSkills.map(skill => (
            <div key={skill.name} className="text-center">
              <div className="text-xs text-admin-muted mb-1">{skill.name}</div>
              <div className={`text-lg font-bold ${
                skill.value < 30 ? 'text-red-500' :
                skill.value < 50 ? 'text-orange-500' :
                'text-yellow-500'
              }`}>
                {skill.value}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-admin-muted">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>70-100% Отлично</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>40-69% Хорошо</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>0-39% Требует практики</span>
        </div>
      </div>
    </div>
  );
}
