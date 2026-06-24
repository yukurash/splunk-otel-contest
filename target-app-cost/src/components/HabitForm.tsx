import { useState, type FormEvent } from 'react';

interface HabitFormProps {
  onAdd: (name: string) => void;
}

export function HabitForm({ onAdd }: HabitFormProps) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  }

  return (
    <form className="habit-form" onSubmit={handleSubmit} aria-label="習慣追加フォーム">
      <input
        className="habit-form__input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="新しい習慣を入力..."
        aria-label="習慣名"
        maxLength={100}
      />
      <button
        className="habit-form__button"
        type="submit"
        disabled={!value.trim()}
        aria-label="習慣を追加"
      >
        追加
      </button>
    </form>
  );
}
