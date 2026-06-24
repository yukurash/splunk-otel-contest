import { describe, it, expect } from 'vitest';
import {
  formatDate,
  addHabit,
  removeHabit,
  toggleCompletion,
  calculateStreak,
  type Habit,
} from './habits';

describe('habits.ts', () => {
  // ===== formatDate =====
  describe('formatDate', () => {
    it('正しい日付を YYYY-MM-DD 形式に変換する', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      expect(formatDate(date)).toBe('2025-01-15');
    });

    it('月日にゼロパディングを適用する', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(formatDate(date)).toBe('2025-01-05');
    });

    it('12月を正しく処理する', () => {
      const date = new Date(2025, 11, 31); // December 31, 2025
      expect(formatDate(date)).toBe('2025-12-31');
    });
  });

  // ===== addHabit =====
  describe('addHabit', () => {
    it('空配列から習慣を追加する', () => {
      const result = addHabit([], 'Exercise', 'id-1');
      expect(result).toEqual([
        { id: 'id-1', name: 'Exercise', completedDates: [] },
      ]);
    });

    it('既存習慣がある場合に新習慣を追加する', () => {
      const habits: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: [] },
      ];
      const result = addHabit(habits, 'Running', 'id-2');
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        id: 'id-2',
        name: 'Running',
        completedDates: [],
      });
    });

    it('空文字列は追加されない', () => {
      const habits: Habit[] = [];
      const result = addHabit(habits, '', 'id-1');
      expect(result).toEqual([]);
    });

    it('空白のみの文字列は追加されない', () => {
      const habits: Habit[] = [];
      const result = addHabit(habits, '   ', 'id-1');
      expect(result).toEqual([]);
    });

    it('前後の空白をトリムして名前を保存する', () => {
      const result = addHabit([], '  Meditation  ', 'id-1');
      expect(result[0].name).toBe('Meditation');
    });

    it('純粋関数: 元の配列を変更しない', () => {
      const original: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: [] },
      ];
      const original2 = JSON.stringify(original);
      addHabit(original, 'Running', 'id-2');
      expect(JSON.stringify(original)).toBe(original2);
    });
  });

  // ===== removeHabit =====
  describe('removeHabit', () => {
    it('指定IDの習慣を削除する', () => {
      const habits: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: [] },
        { id: 'id-2', name: 'Running', completedDates: [] },
      ];
      const result = removeHabit(habits, 'id-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('id-2');
    });

    it('存在しないIDの場合は何も削除されない', () => {
      const habits: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: [] },
      ];
      const result = removeHabit(habits, 'id-nonexistent');
      expect(result).toHaveLength(1);
    });

    it('純粋関数: 元の配列を変更しない', () => {
      const original: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: [] },
      ];
      const original2 = JSON.stringify(original);
      removeHabit(original, 'id-1');
      expect(JSON.stringify(original)).toBe(original2);
    });
  });

  // ===== toggleCompletion =====
  describe('toggleCompletion', () => {
    it('未達成の日付を達成にする', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: [],
      };
      const result = toggleCompletion(habit, '2025-01-15');
      expect(result.completedDates).toContain('2025-01-15');
    });

    it('達成済みの日付を未達成にする', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: ['2025-01-15'],
      };
      const result = toggleCompletion(habit, '2025-01-15');
      expect(result.completedDates).not.toContain('2025-01-15');
    });

    it('複数達成日を持つ場合、指定日のみトグルする', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: ['2025-01-14', '2025-01-15'],
      };
      const result = toggleCompletion(habit, '2025-01-15');
      expect(result.completedDates).toEqual(['2025-01-14']);
    });

    it('純粋関数: 元の習慣を変更しない', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: [],
      };
      const original = JSON.stringify(habit);
      toggleCompletion(habit, '2025-01-15');
      expect(JSON.stringify(habit)).toBe(original);
    });
  });

  // ===== calculateStreak =====
  describe('calculateStreak', () => {
    it('習慣追加直後(達成なし)は0を返す', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: [],
      };
      const streak = calculateStreak(habit, '2025-01-15');
      expect(streak).toBe(0);
    });

    it('今日のみ達成で1を返す', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: ['2025-01-15'],
      };
      const streak = calculateStreak(habit, '2025-01-15');
      expect(streak).toBe(1);
    });

    it('昨日と今日達成で2を返す', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: ['2025-01-14', '2025-01-15'],
      };
      const streak = calculateStreak(habit, '2025-01-15');
      expect(streak).toBe(2);
    });

    it('昨日未達成・今日達成で0を返す(今日起点)', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: ['2025-01-15'],
      };
      const streak = calculateStreak(habit, '2025-01-15');
      expect(streak).toBe(1);
    });

    it('一昨日達成・昨日未達成・今日達成で1を返す(連続が途切れる)', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: ['2025-01-13', '2025-01-15'],
      };
      const streak = calculateStreak(habit, '2025-01-15');
      expect(streak).toBe(1);
    });

    it('3日連続達成で3を返す', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: ['2025-01-13', '2025-01-14', '2025-01-15'],
      };
      const streak = calculateStreak(habit, '2025-01-15');
      expect(streak).toBe(3);
    });

    it('今日の達成がない場合は0を返す', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: ['2025-01-14'],
      };
      const streak = calculateStreak(habit, '2025-01-15');
      expect(streak).toBe(0);
    });

    it('月をまたがる連続達成をカウントする', () => {
      const habit: Habit = {
        id: 'id-1',
        name: 'Yoga',
        completedDates: ['2024-12-30', '2024-12-31', '2025-01-01'],
      };
      const streak = calculateStreak(habit, '2025-01-01');
      expect(streak).toBe(3);
    });
  });
});
