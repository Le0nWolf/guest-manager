/**
 * Date Utils Unit Tests
 */

import {
  getToday,
  formatDate,
  parseDate,
  isValidDateFormat,
  isDateRangeActive,
  isValidDateRange,
  getDateRangeStatus,
  formatDateForDisplay
} from '../../../src/utils/dateUtils.js';

describe('dateUtils', () => {
  describe('getToday', () => {
    it('should return today\'s date in YYYY-MM-DD format', () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's actually today
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(today).toBe(expected);
    });
  });

  describe('formatDate', () => {
    it('should format a Date object to YYYY-MM-DD', () => {
      const date = new Date(2025, 10, 27); // November 27, 2025
      expect(formatDate(date)).toBe('2025-11-27');
    });

    it('should pad single digit months and days', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(formatDate(date)).toBe('2025-01-05');
    });
  });

  describe('parseDate', () => {
    it('should parse YYYY-MM-DD string to Date object', () => {
      const date = parseDate('2025-11-27');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(10); // 0-indexed
      expect(date.getDate()).toBe(27);
    });
  });

  describe('isValidDateFormat', () => {
    it('should return true for valid YYYY-MM-DD format', () => {
      expect(isValidDateFormat('2025-11-27')).toBe(true);
      expect(isValidDateFormat('2025-01-01')).toBe(true);
      expect(isValidDateFormat('2025-12-31')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(isValidDateFormat('27-11-2025')).toBe(false);
      expect(isValidDateFormat('2025/11/27')).toBe(false);
      expect(isValidDateFormat('27.11.2025')).toBe(false);
      expect(isValidDateFormat('2025-1-27')).toBe(false);
      expect(isValidDateFormat('invalid')).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(isValidDateFormat('2025-13-01')).toBe(false); // Invalid month
      expect(isValidDateFormat('2025-02-30')).toBe(false); // Invalid day
      expect(isValidDateFormat('2025-00-15')).toBe(false); // Invalid month
    });

    it('should return false for null/undefined/non-string', () => {
      expect(isValidDateFormat(null)).toBe(false);
      expect(isValidDateFormat(undefined)).toBe(false);
      expect(isValidDateFormat(123)).toBe(false);
      expect(isValidDateFormat({})).toBe(false);
    });
  });

  describe('isDateRangeActive', () => {
    it('should return true when today is within the range', () => {
      const today = getToday();
      const yesterday = formatDate(new Date(Date.now() - 86400000));
      const tomorrow = formatDate(new Date(Date.now() + 86400000));

      expect(isDateRangeActive(yesterday, tomorrow)).toBe(true);
      expect(isDateRangeActive(today, tomorrow)).toBe(true);
      expect(isDateRangeActive(yesterday, today)).toBe(true);
      expect(isDateRangeActive(today, today)).toBe(true);
    });

    it('should return false when today is outside the range', () => {
      const tomorrow = formatDate(new Date(Date.now() + 86400000));
      const dayAfter = formatDate(new Date(Date.now() + 2 * 86400000));
      const yesterday = formatDate(new Date(Date.now() - 86400000));
      const dayBefore = formatDate(new Date(Date.now() - 2 * 86400000));

      expect(isDateRangeActive(tomorrow, dayAfter)).toBe(false); // Future
      expect(isDateRangeActive(dayBefore, yesterday)).toBe(false); // Past
    });
  });

  describe('isValidDateRange', () => {
    it('should return true when departure is on or after arrival', () => {
      expect(isValidDateRange('2025-11-27', '2025-12-01')).toBe(true);
      expect(isValidDateRange('2025-11-27', '2025-11-27')).toBe(true);
    });

    it('should return false when departure is before arrival', () => {
      expect(isValidDateRange('2025-12-01', '2025-11-27')).toBe(false);
    });
  });

  describe('getDateRangeStatus', () => {
    it('should return "active" when today is within range', () => {
      const today = getToday();
      const yesterday = formatDate(new Date(Date.now() - 86400000));
      const tomorrow = formatDate(new Date(Date.now() + 86400000));

      expect(getDateRangeStatus(yesterday, tomorrow)).toBe('active');
      expect(getDateRangeStatus(today, today)).toBe('active');
    });

    it('should return "past" when range has ended', () => {
      const dayBefore = formatDate(new Date(Date.now() - 2 * 86400000));
      const yesterday = formatDate(new Date(Date.now() - 86400000));

      expect(getDateRangeStatus(dayBefore, yesterday)).toBe('past');
    });

    it('should return "future" when range hasn\'t started', () => {
      const tomorrow = formatDate(new Date(Date.now() + 86400000));
      const dayAfter = formatDate(new Date(Date.now() + 2 * 86400000));

      expect(getDateRangeStatus(tomorrow, dayAfter)).toBe('future');
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format YYYY-MM-DD to DD.MM.YYYY', () => {
      expect(formatDateForDisplay('2025-11-27')).toBe('27.11.2025');
      expect(formatDateForDisplay('2025-01-05')).toBe('05.01.2025');
    });
  });
});
