import { memo, useMemo } from 'react';
import { calculateStreak } from '../lib/streak';
import { toDateKey } from '../lib/date';
import type { Habit } from '../types';

type Props = {
  habit: Habit;
  onToggleToday: (id: string) => void;
  onRemove: (id: string) => void;
};

export const HabitCard = memo(function HabitCard({
  habit,
  onToggleToday,
  onRemove,
}: Props) {
  const todayKey = toDateKey(new Date());
  const isDoneToday = habit.completedDates.includes(todayKey);

  const streak = useMemo(() => {
    const today = new Date();
    return calculateStreak(habit.completedDates, today);
  }, [habit.completedDates]);

  return (
    <li className={`habit-card${isDoneToday ? ' habit-card--done' : ''}`}>
      <div className="habit-card__info">
        <span className="habit-card__name">{habit.name}</span>
        <span
          className="habit-card__streak"
          aria-label={`連続達成日数 ${streak} 日`}
        >
          <span className="habit-card__streak-icon" aria-hidden="true">
            🔥
          </span>
          {streak}
          <span className="habit-card__streak-unit"> 日</span>
        </span>
      </div>
      <div className="habit-card__actions">
        <button
          type="button"
          className={`btn btn--toggle${isDoneToday ? ' btn--toggle-active' : ''}`}
          aria-label={
            isDoneToday
              ? `${habit.name} の今日の達成を取り消す`
              : `${habit.name} を今日達成にする`
          }
          aria-pressed={isDoneToday}
          onClick={() => onToggleToday(habit.id)}
        >
          {isDoneToday ? '達成済み' : '今日達成'}
        </button>
        <button
          type="button"
          className="btn btn--remove"
          aria-label={`${habit.name} を削除する`}
          onClick={() => onRemove(habit.id)}
        >
          削除
        </button>
      </div>
    </li>
  );
});
