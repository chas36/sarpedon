import type { Profile } from '@/shared/types';

/**
 * Calculate completion rate percentage
 */
export function calculateCompletionRate(
  completed: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Calculate success rate percentage
 */
export function calculateSuccessRate(
  successfulSubmissions: number,
  totalSubmissions: number
): number {
  if (totalSubmissions === 0) return 0;
  return Math.round((successfulSubmissions / totalSubmissions) * 100);
}

/**
 * Group students by progress percentage
 */
export function groupStudentsByProgress(
  students: Array<{ completedLevels: number; totalLevels: number }>
): {
  '0-25': number;
  '25-50': number;
  '50-75': number;
  '75-100': number;
} {
  const groups = { '0-25': 0, '25-50': 0, '50-75': 0, '75-100': 0 };

  students.forEach(s => {
    const rate = calculateCompletionRate(s.completedLevels, s.totalLevels);
    if (rate < 25) groups['0-25']++;
    else if (rate < 50) groups['25-50']++;
    else if (rate < 75) groups['50-75']++;
    else groups['75-100']++;
  });

  return groups;
}

/**
 * Aggregate activity by day
 */
export function aggregateActivityByDay(
  submissions: Array<{ submitted_at: string }>
): Array<{ date: string; count: number }> {
  const activityMap = new Map<string, number>();

  submissions.forEach(s => {
    const date = new Date(s.submitted_at).toISOString().split('T')[0];
    activityMap.set(date, (activityMap.get(date) || 0) + 1);
  });

  return Array.from(activityMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Identify struggling students based on thresholds
 */
export function identifyStrugglingStudents(
  students: Array<Profile & {
    completedLevels?: number;
    successRate?: number;
    lastActivity?: string;
  }>,
  thresholds: {
    minSuccessRate: number;
    minCompletedLevels: number;
    inactiveDays: number;
  }
): Array<Profile & { issue: 'low_success' | 'low_activity' | 'inactive' }> {
  const now = new Date();

  return students
    .filter(s => {
      const successRate = s.successRate || 0;
      const completedLevels = s.completedLevels || 0;
      const lastActivity = s.lastActivity ? new Date(s.lastActivity) : null;
      const daysSinceActivity = lastActivity
        ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      return (
        successRate < thresholds.minSuccessRate ||
        completedLevels < thresholds.minCompletedLevels ||
        daysSinceActivity > thresholds.inactiveDays
      );
    })
    .map(s => {
      const successRate = s.successRate || 0;
      const completedLevels = s.completedLevels || 0;
      const lastActivity = s.lastActivity ? new Date(s.lastActivity) : null;
      const daysSinceActivity = lastActivity
        ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      let issue: 'low_success' | 'low_activity' | 'inactive' = 'low_activity';
      if (daysSinceActivity > thresholds.inactiveDays) issue = 'inactive';
      else if (successRate < thresholds.minSuccessRate) issue = 'low_success';

      return { ...s, issue };
    });
}

/**
 * Calculate average time from array of times
 */
export function calculateAverageTime(
  submissions: Array<{ execution_time_ms?: number }>
): number {
  const times = submissions
    .map(s => s.execution_time_ms)
    .filter((t): t is number => t !== undefined && t !== null);

  if (times.length === 0) return 0;
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
}
