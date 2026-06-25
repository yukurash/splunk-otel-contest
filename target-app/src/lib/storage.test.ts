import { describe, it, expect, beforeEach } from 'vitest';
import { loadHabits, saveHabits } from './storage';
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

describe('storage: loadHabits & saveHabits', () => {
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

  describe('loadHabits', () => {
    it('returns empty array when localStorage is empty', () => {
      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual([]);
    });

    it('returns empty array when stored value is null', () => {
      // Arrange
      fakeStorage.removeItem('app:habits');

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual([]);
    });

    it('returns empty array on invalid JSON', () => {
      // Arrange
      fakeStorage.setItem('app:habits', 'not valid json {]');

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual([]);
    });

    it('returns empty array when stored value is not an array', () => {
      // Arrange
      fakeStorage.setItem('app:habits', JSON.stringify({ id: '1' }));

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual([]);
    });

    it('filters out invalid habit objects (missing id)', () => {
      // Arrange
      const invalid = [
        {
          name: 'Run',
          completedDates: [],
        },
      ];
      fakeStorage.setItem('app:habits', JSON.stringify(invalid));

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual([]);
    });

    it('filters out invalid habit objects (missing name)', () => {
      // Arrange
      const invalid = [
        {
          id: 'uuid-1',
          completedDates: [],
        },
      ];
      fakeStorage.setItem('app:habits', JSON.stringify(invalid));

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual([]);
    });

    it('filters out invalid habit objects (missing completedDates)', () => {
      // Arrange
      const invalid = [
        {
          id: 'uuid-1',
          name: 'Run',
        },
      ];
      fakeStorage.setItem('app:habits', JSON.stringify(invalid));

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual([]);
    });

    it('filters out completedDates with non-string elements', () => {
      // Arrange
      const mixed = [
        {
          id: 'uuid-1',
          name: 'Run',
          completedDates: ['2025-01-15', 123, true],
        },
      ];
      fakeStorage.setItem('app:habits', JSON.stringify(mixed));

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual([]);
    });

    it('loads valid habit objects', () => {
      // Arrange
      const valid: Habit[] = [
        {
          id: 'uuid-1',
          name: 'Morning Run',
          completedDates: ['2025-01-15', '2025-01-14'],
        },
      ];
      fakeStorage.setItem('app:habits', JSON.stringify(valid));

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual(valid);
    });

    it('loads multiple valid habits', () => {
      // Arrange
      const valid: Habit[] = [
        {
          id: 'uuid-1',
          name: 'Morning Run',
          completedDates: ['2025-01-15'],
        },
        {
          id: 'uuid-2',
          name: 'Meditation',
          completedDates: [],
        },
      ];
      fakeStorage.setItem('app:habits', JSON.stringify(valid));

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toEqual(valid);
    });

    it('filters out invalid items in mixed array', () => {
      // Arrange
      const mixed = [
        {
          id: 'uuid-1',
          name: 'Morning Run',
          completedDates: ['2025-01-15'],
        },
        { id: 'uuid-2' }, // Missing required fields
        {
          id: 'uuid-3',
          name: 'Meditation',
          completedDates: [],
        },
      ];
      fakeStorage.setItem('app:habits', JSON.stringify(mixed));

      // Act
      const result = loadHabits();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('uuid-1');
      expect(result[1].id).toBe('uuid-3');
    });
  });

  describe('saveHabits', () => {
    it('saves habits to localStorage as JSON', () => {
      // Arrange
      const habits: Habit[] = [
        {
          id: 'uuid-1',
          name: 'Morning Run',
          completedDates: ['2025-01-15'],
        },
      ];

      // Act
      saveHabits(habits);

      // Assert
      const stored = fakeStorage.getItem('app:habits');
      expect(stored).toBe(JSON.stringify(habits));
    });

    it('saves empty array', () => {
      // Arrange
      const habits: Habit[] = [];

      // Act
      saveHabits(habits);

      // Assert
      const stored = fakeStorage.getItem('app:habits');
      expect(stored).toBe(JSON.stringify([]));
    });

    it('overwrites previous value', () => {
      // Arrange
      const first: Habit[] = [
        {
          id: 'uuid-1',
          name: 'Old Habit',
          completedDates: [],
        },
      ];
      const second: Habit[] = [
        {
          id: 'uuid-2',
          name: 'New Habit',
          completedDates: [],
        },
      ];
      saveHabits(first);

      // Act
      saveHabits(second);

      // Assert
      const stored = fakeStorage.getItem('app:habits');
      expect(stored).toBe(JSON.stringify(second));
    });
  });

  describe('round-trip: save then load', () => {
    it('preserves habit data through save and load', () => {
      // Arrange
      const original: Habit[] = [
        {
          id: 'uuid-1',
          name: 'Morning Run',
          completedDates: ['2025-01-15', '2025-01-14'],
        },
        {
          id: 'uuid-2',
          name: 'Meditation',
          completedDates: [],
        },
      ];

      // Act
      saveHabits(original);
      const loaded = loadHabits();

      // Assert
      expect(loaded).toEqual(original);
    });

    it('round-trip with multiple habits including empty completedDates', () => {
      // Arrange
      const original: Habit[] = [
        {
          id: 'id-a',
          name: 'Habit A',
          completedDates: [],
        },
        {
          id: 'id-b',
          name: 'Habit B',
          completedDates: ['2025-01-15', '2025-01-16', '2025-01-17'],
        },
      ];

      // Act
      saveHabits(original);
      const loaded = loadHabits();

      // Assert
      expect(loaded).toEqual(original);
    });
  });
});
