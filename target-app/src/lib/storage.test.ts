import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadHabits, saveHabits } from './storage';
import type { Habit } from './habits';

describe('storage.ts', () => {
  beforeEach(() => {
    // クリアして各テストを分離
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveHabits', () => {
    it('習慣配列を localStorage に JSON で保存する', () => {
      const habits: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: ['2025-01-15'] },
      ];
      saveHabits(habits);

      const stored = localStorage.getItem('app:habits');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(habits);
    });

    it('空配列を保存できる', () => {
      saveHabits([]);
      const stored = localStorage.getItem('app:habits');
      expect(JSON.parse(stored!)).toEqual([]);
    });

    it('複数習慣を保存できる', () => {
      const habits: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: ['2025-01-15'] },
        { id: 'id-2', name: 'Running', completedDates: [] },
      ];
      saveHabits(habits);

      const stored = localStorage.getItem('app:habits');
      expect(JSON.parse(stored!)).toHaveLength(2);
    });
  });

  describe('loadHabits', () => {
    it('保存されていない場合は空配列を返す', () => {
      const result = loadHabits();
      expect(result).toEqual([]);
    });

    it('保存された習慣を読み込む', () => {
      const habits: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: ['2025-01-15'] },
      ];
      saveHabits(habits);

      const loaded = loadHabits();
      expect(loaded).toEqual(habits);
    });

    it('複数習慣を読み込む', () => {
      const habits: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: ['2025-01-15'] },
        { id: 'id-2', name: 'Running', completedDates: [] },
      ];
      saveHabits(habits);

      const loaded = loadHabits();
      expect(loaded).toHaveLength(2);
    });

    it('不正な JSON の場合は空配列を返す', () => {
      localStorage.setItem('app:habits', 'invalid json {');
      const result = loadHabits();
      expect(result).toEqual([]);
    });

    it('配列ではない JSON の場合は空配列を返す', () => {
      localStorage.setItem('app:habits', '{"foo": "bar"}');
      const result = loadHabits();
      expect(result).toEqual([]);
    });

    it('不正な要素を含む配列から不正な要素を除外する', () => {
      // id が数字、name が存在しない不正な要素を混ぜる
      const stored = JSON.stringify([
        { id: 'id-1', name: 'Yoga', completedDates: ['2025-01-15'] },
        { id: 123, name: 'Invalid', completedDates: [] }, // id は文字列でなければならない
        { id: 'id-2', name: 'Running', completedDates: [] },
      ]);
      localStorage.setItem('app:habits', stored);

      const loaded = loadHabits();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('Yoga');
      expect(loaded[1].name).toBe('Running');
    });

    it('completedDates が非文字列を含む場合、その要素は除外される', () => {
      const stored = JSON.stringify([
        {
          id: 'id-1',
          name: 'Yoga',
          completedDates: ['2025-01-15', 123, '2025-01-16'], // 123 は不正
        },
      ]);
      localStorage.setItem('app:habits', stored);

      const loaded = loadHabits();
      // 配列全体が除外される(completedDates の検証が失敗)
      expect(loaded).toHaveLength(0);
    });

    it('name が文字列でない場合は除外される', () => {
      const stored = JSON.stringify([
        { id: 'id-1', name: 'Yoga', completedDates: [] },
        { id: 'id-2', name: 123, completedDates: [] }, // name は文字列でなければならない
      ]);
      localStorage.setItem('app:habits', stored);

      const loaded = loadHabits();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Yoga');
    });

    it('completedDates が配列でない場合は除外される', () => {
      const stored = JSON.stringify([
        { id: 'id-1', name: 'Yoga', completedDates: [] },
        { id: 'id-2', name: 'Running', completedDates: 'not-array' },
      ]);
      localStorage.setItem('app:habits', stored);

      const loaded = loadHabits();
      expect(loaded).toHaveLength(1);
    });
  });

  describe('roundtrip: save → load', () => {
    it('保存と読み込みで一貫性を保つ', () => {
      const original: Habit[] = [
        { id: 'id-1', name: 'Yoga', completedDates: ['2025-01-14', '2025-01-15'] },
        { id: 'id-2', name: 'Running', completedDates: [] },
      ];
      saveHabits(original);
      const loaded = loadHabits();

      expect(loaded).toEqual(original);
    });

    it('空配列のラウンドトリップ', () => {
      const original: Habit[] = [];
      saveHabits(original);
      const loaded = loadHabits();

      expect(loaded).toEqual(original);
    });

    it('複雑な completedDates のラウンドトリップ', () => {
      const original: Habit[] = [
        {
          id: 'id-1',
          name: 'Meditation',
          completedDates: [
            '2024-12-25',
            '2024-12-26',
            '2025-01-01',
            '2025-01-15',
          ],
        },
      ];
      saveHabits(original);
      const loaded = loadHabits();

      expect(loaded).toEqual(original);
    });
  });
});
