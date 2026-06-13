/**
 * Generate array of date strings for last N days
 */
export function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Fill missing days in data array with zero count
 */
export function fillMissingDays(
  data: Array<{ date: string; count: number }>,
  days: number
): Array<{ date: string; count: number }> {
  const dateRange = generateDateRange(days);
  const dataMap = new Map(data.map(d => [d.date, d.count]));

  return dateRange.map(date => ({
    date,
    count: dataMap.get(date) || 0
  }));
}

/**
 * Format date for display (relative or absolute)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  if (diffDays < 7) return `${diffDays} дней назад`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} недель назад`;

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format time in milliseconds to human readable
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
