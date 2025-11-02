import { Line } from 'react-chartjs-2';
import { defaultChartOptions } from './chartConfig';

interface ProgressLineChartProps {
  data: Array<{ date: string; count: number }>;
  label?: string;
  color?: string;
}

export function ProgressLineChart({
  data,
  label = 'Прогресс',
  color = '#00d9ff',
}: ProgressLineChartProps) {
  const chartData = {
    labels: data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label,
        data: data.map(d => d.count),
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  return (
    <div className="h-64">
      <Line data={chartData} options={defaultChartOptions} />
    </div>
  );
}
