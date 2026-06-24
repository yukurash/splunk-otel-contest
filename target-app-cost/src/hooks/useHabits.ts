import { useState, useCallback } from 'react';
import type { Habit } from '../types';

const STORAGE_KEY = 'app:habits';

function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Habit[];
  } catch (error) {
    console.error('Failed to load habits:', error);
    return [];
  }
}

function saveHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Failed to save habits:', error);
  }
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>(loadHabits);

  const updateAndSave = useCallback((updater: (prev: Habit[]) => Habit[]) => {
    setHabits((prev) => {
      const next = updater(prev);
      saveHabits(next);
      return next;
    });
  }, []);

  const addHabit = useCallback(
    (name: string) => {
      const habit: Habit = {
        id: crypto.randomUUID(),
        name: name.trim(),
        completedDates: [],
      };
      updateAndSave((prev) => [...prev, habit]);
    },
    [updateAndSave],
  );

  const deleteHabit = useCallback(
    (id: string) => {
      updateAndSave((prev) => prev.filter((h) => h.id !== id));
    },
    [updateAndSave],
  );

  const toggleToday = useCallback(
    (id: string) => {
      const today = new Date().toISOString().split('T')[0];
      updateAndSave((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const has = h.completedDates.includes(today);
          return {
            ...h,
            completedDates: has
              ? h.completedDates.filter((d) => d !== today)
              : [...h.completedDates, today],
          };
        }),
      );
    },
    [updateAndSave],
  );

  return { habits, addHabit, deleteHabit, toggleToday };
}
