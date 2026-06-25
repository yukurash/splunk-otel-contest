import { describe, it, expect } from 'vitest';
import { calculateStreak } from './streak';

describe('calculateStreak', () => {
  describe('empty array', () => {
    it('returns 0 when no completed dates', () => {
      // Arrange
      const completedDates: string[] = [];
      const today = new Date('2025-01-15');

      // Act
      const result = calculateStreak(completedDates, today);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('single day streak', () => {
    it('returns 1 when only today is completed (requirement 2)', () => {
      // Arrange
      const completedDates = ['2025-01-15'];
      const today = new Date('2025-01-15');

      // Act
      const result = calculateStreak(completedDates, today);

      // Assert
      expect(result).toBe(1);
    });
  });

  describe('multi-day consecutive streak', () => {
    it('returns 2 when yesterday and today are completed (requirement 3)', () => {
      // Arrange
      const completedDates = ['2025-01-14', '2025-01-15'];
      const today = new Date('2025-01-15');

      // Act
      const result = calculateStreak(completedDates, today);

      // Assert
      expect(result).toBe(2);
    });

    it('returns 3 when three consecutive days ending today', () => {
      // Arrange
      const completedDates = ['2025-01-13', '2025-01-14', '2025-01-15'];
      const today = new Date('2025-01-15');

      // Act
      const result = calculateStreak(completedDates, today);

      // Assert
      expect(result).toBe(3);
    });
  });

  describe('streak broken by missing day', () => {
    it('returns 0 when today is not completed even if past dates exist', () => {
      // Arrange
      const completedDates = ['2025-01-14', '2025-01-13'];
      const today = new Date('2025-01-15');

      // Act
      const result = calculateStreak(completedDates, today);

      // Assert
      expect(result).toBe(0);
    });

    it('returns 1 when today is completed but yesterday is missing (gap breaks streak)', () => {
      // Arrange
      const completedDates = ['2025-01-15', '2025-01-13'];
      const today = new Date('2025-01-15');

      // Act
      const result = calculateStreak(completedDates, today);

      // Assert
      expect(result).toBe(1);
    });

    it('returns 1 when today and day-before-yesterday done, yesterday missing', () => {
      // Arrange
      const completedDates = ['2025-01-15', '2025-01-13'];
      const today = new Date('2025-01-15');

      // Act
      const result = calculateStreak(completedDates, today);

      // Assert
      expect(result).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('ignores future dates', () => {
      // Arrange
      const completedDates = ['2025-01-15', '2025-01-16'];
      const today = new Date('2025-01-15');

      // Act
      const result = calculateStreak(completedDates, today);

      // Assert
      expect(result).toBe(1);
    });

    it('counts from today backward only', () => {
      // Arrange
      const completedDates = ['2025-01-01', '2025-01-02', '2025-01-15'];
      const today = new Date('2025-01-15');

      // Act
      const result = calculateStreak(completedDates, today);

      // Assert
      expect(result).toBe(1);
    });
  });
});
