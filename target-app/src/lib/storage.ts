import type { Habit } from '../types';

const STORAGE_KEY = 'app:habits';

function isHabit(value: unknown): value is Habit {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj['id'] !== 'string') return false;
  if (typeof obj['name'] !== 'string') return false;
  if (!Array.isArray(obj['completedDates'])) return false;
  if (!obj['completedDates'].every((d: unknown) => typeof d === 'string')) return false;
  return true;
}

export function loadHabits(): Habit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHabit);
  } catch {
    return [];
  }
}

export function saveHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (err) {
    console.warn('[storage] saveHabits failed:', err);
  }
}
