import { describe, it, expect } from 'vitest';
import { generateDateRange, fillMissingDays, formatDate } from '../dateUtils';

describe('dateUtils', () => {
  describe('generateDateRange', () => {
    it('should generate array of dates for last N days', () => {
      const dates = generateDateRange(7);

      expect(dates).toHaveLength(7);
      expect(dates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dates[6]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('fillMissingDays', () => {
    it('should fill missing days with zero count', () => {
      // Generate dates dynamically based on current date
      const dates = generateDateRange(3);
      const data = [
        { date: dates[0], count: 5 },
        { date: dates[2], count: 10 }
      ];

      const filled = fillMissingDays(data, 3);

      expect(filled).toHaveLength(3);
      expect(filled[1]).toEqual({ date: dates[1], count: 0 });
    });
  });

  describe('formatDate', () => {
    it('should format date as "Сегодня" for today', () => {
      const today = new Date().toISOString();
      expect(formatDate(today)).toBe('Сегодня');
    });

    it('should format date as "Вчера" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatDate(yesterday.toISOString())).toBe('Вчера');
    });
  });
});
