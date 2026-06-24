import type { Habit } from '../types';

/**
 * 習慣の連続達成日数(ストリーク)を計算する。
 *
 * ロジック:
 * - 今日から遡って連続している日数を返す
 * - 今日が達成済みなら1からスタート
 * - 昨日が達成済み（今日未達成）でも連続カウントを維持
 * - 途切れたら0
 */
export function calcStreak(habit: Habit): number {
  const today = new Date().toISOString().split('T')[0];
  const completedSet = new Set(habit.completedDates);

  // 今日も昨日も未達成なら即0
  const yesterday = getPrevDate(today);
  if (!completedSet.has(today) && !completedSet.has(yesterday)) {
    return 0;
  }

  // 今日が達成済みなら今日から、未達成なら昨日からカウント開始
  let cursor = completedSet.has(today) ? today : yesterday;
  let streak = 0;

  while (completedSet.has(cursor)) {
    streak++;
    cursor = getPrevDate(cursor);
  }

  return streak;
}

function getPrevDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}
