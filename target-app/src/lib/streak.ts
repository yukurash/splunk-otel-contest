import { toDateKey } from './date';

/**
 * Counts how many consecutive days ending on `today` appear in `completedDates`.
 * Pure function: `today` is injected so tests can control the reference date.
 * Does NOT call `new Date()` internally.
 */
export function calculateStreak(completedDates: string[], today: Date): number {
  const dateSet = new Set(completedDates);
  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const key = toDateKey(cursor);
    if (!dateSet.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
