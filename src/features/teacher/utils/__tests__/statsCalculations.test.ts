import { describe, it, expect } from 'vitest';
import {
  calculateCompletionRate,
  calculateSuccessRate,
  groupStudentsByProgress,
  aggregateActivityByDay,
  identifyStrugglingStudents
} from '../statsCalculations';

describe('statsCalculations', () => {
  describe('calculateCompletionRate', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateCompletionRate(7, 10)).toBe(70);
      expect(calculateCompletionRate(0, 10)).toBe(0);
      expect(calculateCompletionRate(10, 10)).toBe(100);
    });

    it('should handle zero total', () => {
      expect(calculateCompletionRate(5, 0)).toBe(0);
    });
  });

  describe('calculateSuccessRate', () => {
    it('should calculate success percentage', () => {
      expect(calculateSuccessRate(8, 10)).toBe(80);
    });
  });

  describe('groupStudentsByProgress', () => {
    it('should group students into progress ranges', () => {
      const students = [
        { completedLevels: 2, totalLevels: 10 },  // 20% -> 0-25
        { completedLevels: 4, totalLevels: 10 },  // 40% -> 25-50
        { completedLevels: 6, totalLevels: 10 },  // 60% -> 50-75
        { completedLevels: 9, totalLevels: 10 },  // 90% -> 75-100
      ];

      const groups = groupStudentsByProgress(students);

      expect(groups['0-25']).toBe(1);
      expect(groups['25-50']).toBe(1);
      expect(groups['50-75']).toBe(1);
      expect(groups['75-100']).toBe(1);
    });
  });

  describe('aggregateActivityByDay', () => {
    it('should group submissions by date', () => {
      const submissions = [
        { submitted_at: '2025-11-01T10:00:00Z' },
        { submitted_at: '2025-11-01T14:00:00Z' },
        { submitted_at: '2025-11-02T09:00:00Z' },
      ];

      const activity = aggregateActivityByDay(submissions);

      expect(activity).toHaveLength(2);
      expect(activity[0]).toEqual({ date: '2025-11-01', count: 2 });
      expect(activity[1]).toEqual({ date: '2025-11-02', count: 1 });
    });
  });
});
