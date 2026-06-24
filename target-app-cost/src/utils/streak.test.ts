import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calcStreak } from './streak';
import type { Habit } from '../types';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

describe('calcStreak', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T09:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return 0 when completedDates is empty', () => {
    // Arrange
    const habit: Habit = {
      id: 'test-1',
      name: 'Exercise',
      completedDates: [],
    };

    // Act
    const streak = calcStreak(habit);

    // Assert
    expect(streak).toBe(0);
  });

  it('should return 1 when only today is completed', () => {
    // Arrange
    const today = daysAgo(0);
    const habit: Habit = {
      id: 'test-1',
      name: 'Exercise',
      completedDates: [today],
    };

    // Act
    const streak = calcStreak(habit);

    // Assert
    expect(streak).toBe(1);
  });

  it('should return 2 when today and yesterday are completed', () => {
    // Arrange
    const today = daysAgo(0);
    const yesterday = daysAgo(1);
    const habit: Habit = {
      id: 'test-1',
      name: 'Exercise',
      completedDates: [today, yesterday],
    };

    // Act
    const streak = calcStreak(habit);

    // Assert
    expect(streak).toBe(2);
  });

  it('should return 3 when today, yesterday, and day-before-yesterday are completed', () => {
    // Arrange
    const today = daysAgo(0);
    const yesterday = daysAgo(1);
    const dayBeforeYesterday = daysAgo(2);
    const habit: Habit = {
      id: 'test-1',
      name: 'Exercise',
      completedDates: [today, yesterday, dayBeforeYesterday],
    };

    // Act
    const streak = calcStreak(habit);

    // Assert
    expect(streak).toBe(3);
  });

  it('should maintain streak when only yesterday is completed (today is incomplete)', () => {
    // Arrange
    const yesterday = daysAgo(1);
    const habit: Habit = {
      id: 'test-1',
      name: 'Exercise',
      completedDates: [yesterday],
    };

    // Act
    const streak = calcStreak(habit);

    // Assert
    expect(streak).toBe(1);
  });

  it('should return 1 when today and day-before-yesterday are completed but yesterday is missing', () => {
    // Arrange
    const today = daysAgo(0);
    const dayBeforeYesterday = daysAgo(2);
    const habit: Habit = {
      id: 'test-1',
      name: 'Exercise',
      completedDates: [today, dayBeforeYesterday],
    };

    // Act
    const streak = calcStreak(habit);

    // Assert
    expect(streak).toBe(1);
  });

  it('should return 0 when only day-before-yesterday is completed (2+ days old)', () => {
    // Arrange
    const dayBeforeYesterday = daysAgo(2);
    const habit: Habit = {
      id: 'test-1',
      name: 'Exercise',
      completedDates: [dayBeforeYesterday],
    };

    // Act
    const streak = calcStreak(habit);

    // Assert
    expect(streak).toBe(0);
  });

  it('should return correct streak with longer continuous sequence', () => {
    // Arrange
    const dates = [
      daysAgo(0), // today
      daysAgo(1),
      daysAgo(2),
      daysAgo(3),
      daysAgo(4),
    ];
    const habit: Habit = {
      id: 'test-1',
      name: 'Exercise',
      completedDates: dates,
    };

    // Act
    const streak = calcStreak(habit);

    // Assert
    expect(streak).toBe(5);
  });

  it('should reset streak on a gap in dates', () => {
    // Arrange
    const dates = [
      daysAgo(0), // today
      daysAgo(1),
      // gap on daysAgo(2)
      daysAgo(3),
      daysAgo(4),
    ];
    const habit: Habit = {
      id: 'test-1',
      name: 'Exercise',
      completedDates: dates,
    };

    // Act
    const streak = calcStreak(habit);

    // Assert
    expect(streak).toBe(2);
  });
});
