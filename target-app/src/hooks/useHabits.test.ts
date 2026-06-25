import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHabits } from './useHabits';
import * as dateLib from '../lib/date';
import type { Habit } from '../types';

// Fake in-memory localStorage
const createFakeLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

describe('useHabits', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>;

  beforeEach(() => {
    fakeStorage = createFakeLocalStorage();
    // Replace global localStorage with fake
    Object.defineProperty(globalThis, 'localStorage', {
      value: fakeStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('loads habits from storage on mount', () => {
      // Arrange
      const initial: Habit[] = [
        {
          id: 'uuid-1',
          name: 'Morning Run',
          completedDates: [],
        },
      ];
      fakeStorage.setItem('app:habits', JSON.stringify(initial));

      // Act
      const { result } = renderHook(() => useHabits());

      // Assert
      expect(result.current.habits).toEqual(initial);
    });

    it('starts with empty array if storage is empty', () => {
      // Act
      const { result } = renderHook(() => useHabits());

      // Assert
      expect(result.current.habits).toEqual([]);
    });
  });

  describe('addHabit', () => {
    it('increases habit count when adding a habit', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());
      expect(result.current.habits).toHaveLength(0);

      // Act
      act(() => {
        result.current.addHabit('Morning Run');
      });

      // Assert
      expect(result.current.habits).toHaveLength(1);
    });

    it('adds habit with correct name', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());

      // Act
      act(() => {
        result.current.addHabit('Morning Run');
      });

      // Assert
      expect(result.current.habits[0].name).toBe('Morning Run');
    });

    it('trims whitespace from habit name', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());

      // Act
      act(() => {
        result.current.addHabit('  Morning Run  ');
      });

      // Assert
      expect(result.current.habits[0].name).toBe('Morning Run');
    });

    it('ignores empty string after trim', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());

      // Act
      act(() => {
        result.current.addHabit('   ');
      });

      // Assert
      expect(result.current.habits).toHaveLength(0);
    });

    it('adds habit with unique UUID', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());

      // Act
      act(() => {
        result.current.addHabit('Habit 1');
      });
      const id1 = result.current.habits[0].id;

      act(() => {
        result.current.addHabit('Habit 2');
      });
      const id2 = result.current.habits[1].id;

      // Assert
      expect(id1).not.toBe(id2);
    });

    it('adds habit with empty completedDates', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());

      // Act
      act(() => {
        result.current.addHabit('Morning Run');
      });

      // Assert
      expect(result.current.habits[0].completedDates).toEqual([]);
    });

    it('saves habits to storage after adding', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());

      // Act
      act(() => {
        result.current.addHabit('Morning Run');
      });

      // Assert
      const stored = fakeStorage.getItem('app:habits');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Morning Run');
    });

    it('adds multiple habits in sequence', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());

      // Act
      act(() => {
        result.current.addHabit('Morning Run');
      });
      expect(result.current.habits).toHaveLength(1);

      act(() => {
        result.current.addHabit('Meditation');
      });
      expect(result.current.habits).toHaveLength(2);

      act(() => {
        result.current.addHabit('Reading');
      });

      // Assert
      expect(result.current.habits).toHaveLength(3);
      expect(result.current.habits[0].name).toBe('Morning Run');
      expect(result.current.habits[1].name).toBe('Meditation');
      expect(result.current.habits[2].name).toBe('Reading');
    });
  });

  describe('removeHabit', () => {
    it('removes habit by id', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());
      act(() => {
        result.current.addHabit('Morning Run');
      });
      act(() => {
        result.current.addHabit('Meditation');
      });
      expect(result.current.habits).toHaveLength(2);
      const habitToRemove = result.current.habits[0];

      // Act
      act(() => {
        result.current.removeHabit(habitToRemove.id);
      });

      // Assert
      expect(result.current.habits).toHaveLength(1);
      expect(result.current.habits[0].name).toBe('Meditation');
    });

    it('saves habits to storage after removing', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());
      act(() => {
        result.current.addHabit('Morning Run');
      });
      act(() => {
        result.current.addHabit('Meditation');
      });
      const habitToRemove = result.current.habits[0];

      // Act
      act(() => {
        result.current.removeHabit(habitToRemove.id);
      });

      // Assert
      const stored = fakeStorage.getItem('app:habits');
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Meditation');
    });

    it('does nothing when removing non-existent habit', () => {
      // Arrange
      const { result } = renderHook(() => useHabits());
      act(() => {
        result.current.addHabit('Morning Run');
      });
      const count = result.current.habits.length;

      // Act
      act(() => {
        result.current.removeHabit('non-existent-id');
      });

      // Assert
      expect(result.current.habits).toHaveLength(count);
    });
  });

  describe('toggleToday', () => {
    it('adds today key to completedDates when toggling uncompleted habit', () => {
      // Arrange
      vi.spyOn(dateLib, 'toDateKey').mockReturnValue('2025-01-15');
      const { result } = renderHook(() => useHabits());
      act(() => {
        result.current.addHabit('Morning Run');
      });
      const habitId = result.current.habits[0].id;
      expect(result.current.habits[0].completedDates).toHaveLength(0);

      // Act
      act(() => {
        result.current.toggleToday(habitId);
      });

      // Assert
      expect(result.current.habits[0].completedDates).toContain('2025-01-15');
      expect(result.current.habits[0].completedDates).toHaveLength(1);
    });

    it('removes today key from completedDates when toggling completed habit', () => {
      // Arrange
      vi.spyOn(dateLib, 'toDateKey').mockReturnValue('2025-01-15');
      const { result } = renderHook(() => useHabits());
      act(() => {
        result.current.addHabit('Morning Run');
      });
      const habitId = result.current.habits[0].id;

      act(() => {
        result.current.toggleToday(habitId);
      });
      expect(result.current.habits[0].completedDates).toContain('2025-01-15');

      // Act
      act(() => {
        result.current.toggleToday(habitId);
      });

      // Assert
      expect(result.current.habits[0].completedDates).not.toContain('2025-01-15');
      expect(result.current.habits[0].completedDates).toHaveLength(0);
    });

    it('toggles today multiple times', () => {
      // Arrange
      vi.spyOn(dateLib, 'toDateKey').mockReturnValue('2025-01-15');
      const { result } = renderHook(() => useHabits());
      act(() => {
        result.current.addHabit('Morning Run');
      });
      const habitId = result.current.habits[0].id;

      // Act & Assert
      act(() => {
        result.current.toggleToday(habitId);
      });
      expect(result.current.habits[0].completedDates).toContain('2025-01-15');

      act(() => {
        result.current.toggleToday(habitId);
      });
      expect(result.current.habits[0].completedDates).not.toContain('2025-01-15');

      act(() => {
        result.current.toggleToday(habitId);
      });
      expect(result.current.habits[0].completedDates).toContain('2025-01-15');
    });

    it('only affects the toggled habit', () => {
      // Arrange
      vi.spyOn(dateLib, 'toDateKey').mockReturnValue('2025-01-15');
      const { result } = renderHook(() => useHabits());
      act(() => {
        result.current.addHabit('Habit 1');
      });
      act(() => {
        result.current.addHabit('Habit 2');
      });
      expect(result.current.habits).toHaveLength(2);
      const habit1Id = result.current.habits[0].id;

      // Act
      act(() => {
        result.current.toggleToday(habit1Id);
      });

      // Assert
      expect(result.current.habits[0].completedDates).toContain('2025-01-15');
      expect(result.current.habits[1].completedDates).not.toContain('2025-01-15');
    });

    it('saves habits to storage after toggling', () => {
      // Arrange
      vi.spyOn(dateLib, 'toDateKey').mockReturnValue('2025-01-15');
      const { result } = renderHook(() => useHabits());
      act(() => {
        result.current.addHabit('Morning Run');
      });
      const habitId = result.current.habits[0].id;

      // Act
      act(() => {
        result.current.toggleToday(habitId);
      });

      // Assert
      const stored = fakeStorage.getItem('app:habits');
      const parsed = JSON.parse(stored!);
      expect(parsed[0].completedDates).toContain('2025-01-15');
    });

    it('preserves other dates when toggling today', () => {
      // Arrange
      const habit: Habit = {
        id: 'uuid-1',
        name: 'Morning Run',
        completedDates: ['2025-01-10', '2025-01-11'],
      };
      fakeStorage.setItem('app:habits', JSON.stringify([habit]));
      vi.spyOn(dateLib, 'toDateKey').mockReturnValue('2025-01-15');
      const { result } = renderHook(() => useHabits());

      // Act
      act(() => {
        result.current.toggleToday(result.current.habits[0].id);
      });

      // Assert
      expect(result.current.habits[0].completedDates).toContain('2025-01-10');
      expect(result.current.habits[0].completedDates).toContain('2025-01-11');
      expect(result.current.habits[0].completedDates).toContain('2025-01-15');
    });
  });
});
