import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Default chart options with dark theme
export const defaultChartOptions: ChartOptions<any> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#e4e7eb', // admin-text
        font: {
          family: 'system-ui',
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: '#131824', // admin-surface
      titleColor: '#e4e7eb',
      bodyColor: '#8892a6',
      borderColor: '#2a3142',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#8892a6', // admin-muted
        font: { size: 11 },
      },
      grid: {
        color: 'rgba(136, 146, 166, 0.1)',
        drawBorder: false,
      },
    },
    y: {
      ticks: {
        color: '#8892a6',
        font: { size: 11 },
      },
      grid: {
        color: 'rgba(136, 146, 166, 0.1)',
        drawBorder: false,
      },
    },
  },
};
