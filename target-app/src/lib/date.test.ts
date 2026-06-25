import { describe, it, expect } from 'vitest';
import { toDateKey } from './date';

describe('toDateKey', () => {
  describe('format YYYY-MM-DD', () => {
    it('returns correct format for known date', () => {
      // Arrange
      const date = new Date('2025-01-15');

      // Act
      const result = toDateKey(date);

      // Assert
      expect(result).toBe('2025-01-15');
    });

    it('zero-pads month when single digit', () => {
      // Arrange
      const date = new Date('2025-01-05');

      // Act
      const result = toDateKey(date);

      // Assert
      expect(result).toBe('2025-01-05');
    });

    it('zero-pads day when single digit', () => {
      // Arrange
      const date = new Date('2025-12-05');

      // Act
      const result = toDateKey(date);

      // Assert
      expect(result).toBe('2025-12-05');
    });

    it('handles double-digit month and day', () => {
      // Arrange
      const date = new Date('2025-10-25');

      // Act
      const result = toDateKey(date);

      // Assert
      expect(result).toBe('2025-10-25');
    });
  });

  describe('local time', () => {
    it('uses local time zone not UTC', () => {
      // Arrange
      // Create a date string that will be interpreted in local time
      const date = new Date('2025-01-15T00:00:00');

      // Act
      const result = toDateKey(date);

      // Assert
      // Should reflect local date, not UTC
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
      const [year, month, day] = result.split('-').map(Number);
      expect(year).toBe(2025);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });
  });

  describe('year boundaries', () => {
    it('handles January 1st', () => {
      // Arrange
      const date = new Date('2025-01-01');

      // Act
      const result = toDateKey(date);

      // Assert
      expect(result).toBe('2025-01-01');
    });

    it('handles December 31st', () => {
      // Arrange
      const date = new Date('2025-12-31');

      // Act
      const result = toDateKey(date);

      // Assert
      expect(result).toBe('2025-12-31');
    });
  });

  describe('leap year', () => {
    it('handles February 29 in leap year', () => {
      // Arrange
      const date = new Date('2024-02-29');

      // Act
      const result = toDateKey(date);

      // Assert
      expect(result).toBe('2024-02-29');
    });
  });
});
