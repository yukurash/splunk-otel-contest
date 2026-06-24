import { useState, useCallback, useMemo } from 'react';
import type { Habit } from '../lib/habits';
import {
  addHabit,
  removeHabit,
  toggleCompletion,
  formatDate,
} from '../lib/habits';
import { loadHabits, saveHabits } from '../lib/storage';

function generateId(): string {
  return `habit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type UseHabitsReturn = {
  habits: Habit[];
  todayStr: string;
  addHabitByName: (name: string) => void;
  removeHabitById: (id: string) => void;
  toggleHabitCompletion: (id: string) => void;
};

export function useHabits(): UseHabitsReturn {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabits());
  // useMemo で安定化: アプリ起動中に日付が変わるケースは稀だが、
  // 少なくともレンダーごとの再生成を防ぎ useCallback のメモ化を有効にする。
  const todayStr = useMemo(() => formatDate(new Date()), []);

  const addHabitByName = useCallback((name: string) => {
    setHabits((prev) => {
      const next = addHabit(prev, name, generateId());
      saveHabits(next);
      return next;
    });
  }, []);

  const removeHabitById = useCallback((id: string) => {
    setHabits((prev) => {
      const next = removeHabit(prev, id);
      saveHabits(next);
      return next;
    });
  }, []);

  const toggleHabitCompletion = useCallback(
    (id: string) => {
      setHabits((prev) => {
        const next = prev.map((h) =>
          h.id === id ? toggleCompletion(h, todayStr) : h,
        );
        saveHabits(next);
        return next;
      });
    },
    [todayStr],
  );

  return {
    habits,
    todayStr,
    addHabitByName,
    removeHabitById,
    toggleHabitCompletion,
  };
}
