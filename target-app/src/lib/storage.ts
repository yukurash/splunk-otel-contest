import type { Habit } from './habits';

const STORAGE_KEY = 'app:habits';

/** 値が Habit 型の形状を満たすか検証する */
function isHabit(value: unknown): value is Habit {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['name'] === 'string' &&
    Array.isArray(v['completedDates']) &&
    (v['completedDates'] as unknown[]).every((d) => typeof d === 'string')
  );
}

/** localStorage から習慣リストを読み込む。パース失敗や不正要素は除外しフォールバック。 */
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

/** 習慣リストを localStorage に保存する。 */
export function saveHabits(habits: Habit[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}
