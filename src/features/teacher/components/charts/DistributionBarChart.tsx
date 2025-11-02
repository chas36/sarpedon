import { Bar } from 'react-chartjs-2';
import { defaultChartOptions } from './chartConfig';

interface DistributionBarChartProps {
  data: Array<{ label: string; count: number; color?: string }>;
}

export function DistributionBarChart({ data }: DistributionBarChartProps) {
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        label: 'Количество учеников',
        data: data.map(d => d.count),
        backgroundColor: data.map(d => d.color || '#00d9ff'),
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}
