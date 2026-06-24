import type { Habit } from '../types';
import { calcStreak } from '../utils/streak';

const today = new Date().toISOString().split('T')[0];

interface HabitItemProps {
  habit: Habit;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function HabitItem({ habit, onToggle, onDelete }: HabitItemProps) {
  const isCompleted = habit.completedDates.includes(today);
  const streak = calcStreak(habit);

  return (
    <li className={`habit-item${isCompleted ? ' habit-item--completed' : ''}`}>
      <button
        className="habit-item__toggle"
        type="button"
        role="checkbox"
        aria-checked={isCompleted}
        aria-label={`${habit.name} を${isCompleted ? '未達成に戻す' : '達成にする'}`}
        onClick={() => onToggle(habit.id)}
      >
        <span className="habit-item__check" aria-hidden="true">
          {isCompleted ? '✓' : ''}
        </span>
      </button>

      <span className="habit-item__name">{habit.name}</span>

      <span
        className="habit-item__streak"
        aria-label={`連続達成日数 ${streak} 日`}
        title="連続達成日数"
      >
        <span className="habit-item__streak-icon" aria-hidden="true">🔥</span>
        <span className="habit-item__streak-count">{streak}</span>
        <span className="habit-item__streak-label">日</span>
      </span>

      <button
        className="habit-item__delete"
        type="button"
        aria-label={`${habit.name} を削除`}
        onClick={() => onDelete(habit.id)}
      >
        削除
      </button>
    </li>
  );
}
