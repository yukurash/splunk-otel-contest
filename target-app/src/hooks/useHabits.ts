import { useState, useCallback } from 'react';
import type { Habit } from '../types';
import { loadHabits, saveHabits } from '../lib/storage';
import { toDateKey } from '../lib/date';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());

  const persist = useCallback((next: Habit[]) => {
    setHabits(next);
    saveHabits(next);
  }, []);

  const addHabit = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const next: Habit = {
        id: crypto.randomUUID(),
        name: trimmed,
        completedDates: [],
      };
      persist([...habits, next]);
    },
    [habits, persist],
  );

  const removeHabit = useCallback(
    (id: string) => {
      persist(habits.filter((h) => h.id !== id));
    },
    [habits, persist],
  );

  const toggleToday = useCallback(
    (id: string) => {
      const todayKey = toDateKey(new Date());
      persist(
        habits.map((h) => {
          if (h.id !== id) return h;
          const alreadyDone = h.completedDates.includes(todayKey);
          return {
            ...h,
            completedDates: alreadyDone
              ? h.completedDates.filter((d) => d !== todayKey)
              : [...h.completedDates, todayKey],
          };
        }),
      );
    },
    [habits, persist],
  );

  return { habits, addHabit, removeHabit, toggleToday };
}
