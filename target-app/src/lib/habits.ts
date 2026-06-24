export type Habit = {
  id: string;
  name: string;
  completedDates: string[]; // YYYY-MM-DD
};

/** YYYY-MM-DD 形式に変換 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 前日の日付文字列を返す (タイムゾーン非依存: 文字列を年月日に分解してローカル日付として扱う) */
function previousDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return formatDate(date);
}

/** 新しい習慣を追加した配列を返す(純粋関数) */
export function addHabit(habits: Habit[], name: string, id: string): Habit[] {
  const trimmed = name.trim();
  if (trimmed === '') return habits;
  const newHabit: Habit = { id, name: trimmed, completedDates: [] };
  return [...habits, newHabit];
}

/** 指定 id の習慣を削除した配列を返す(純粋関数) */
export function removeHabit(habits: Habit[], id: string): Habit[] {
  return habits.filter((h) => h.id !== id);
}

/**
 * 指定日の達成状態をトグルした習慣を返す(純粋関数)
 * 達成済みなら取り消し、未達成なら追加する。
 */
export function toggleCompletion(habit: Habit, dateStr: string): Habit {
  const alreadyDone = habit.completedDates.includes(dateStr);
  const completedDates = alreadyDone
    ? habit.completedDates.filter((d) => d !== dateStr)
    : [...habit.completedDates, dateStr];
  return { ...habit, completedDates };
}

/**
 * 今日を起点とした連続達成日数を計算する(純粋関数)
 * todayStr から過去へ遡り、途切れるまでカウントする。
 */
export function calculateStreak(habit: Habit, todayStr: string): number {
  const doneSet = new Set(habit.completedDates);
  if (!doneSet.has(todayStr)) return 0;

  let streak = 1;
  let current = todayStr;
  while (true) {
    const prev = previousDay(current);
    if (doneSet.has(prev)) {
      streak++;
      current = prev;
    } else {
      break;
    }
  }
  return streak;
}
