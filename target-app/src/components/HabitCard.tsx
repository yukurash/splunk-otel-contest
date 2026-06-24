import { calculateStreak } from '../lib/habits';
import type { Habit } from '../lib/habits';

type Props = {
  habit: Habit;
  todayStr: string;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export function HabitCard({ habit, todayStr, onToggle, onRemove }: Props) {
  const isDone = habit.completedDates.includes(todayStr);
  const streak = calculateStreak(habit, todayStr);

  return (
    <article className={`habit-card${isDone ? ' habit-card--done' : ''}`} aria-label={`習慣: ${habit.name}`}>
      <div className="habit-card__info">
        <h3 className="habit-card__name">{habit.name}</h3>
        <p className="habit-card__streak" aria-label={`ストリーク ${streak} 日`}>
          <span className="habit-card__streak-count" aria-hidden="true">
            {streak}
          </span>
          <span className="habit-card__streak-label" aria-hidden="true">
            日連続
          </span>
        </p>
      </div>
      <div className="habit-card__actions">
        <button
          type="button"
          className={`habit-card__toggle${isDone ? ' habit-card__toggle--done' : ''}`}
          aria-pressed={isDone}
          aria-label={isDone ? `${habit.name} の今日の達成を取り消す` : `${habit.name} を今日達成済みにする`}
          onClick={() => onToggle(habit.id)}
        >
          {isDone ? '達成済み' : '達成する'}
        </button>
        <button
          type="button"
          className="habit-card__remove"
          aria-label={`${habit.name} を削除`}
          onClick={() => onRemove(habit.id)}
        >
          削除
        </button>
      </div>
    </article>
  );
}
