import { useState, type FormEvent } from 'react';

type Props = {
  onAdd: (name: string) => void;
};

export function AddHabitForm({ onAdd }: Props) {
  const [value, setValue] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed === '') return;
    onAdd(trimmed);
    setValue('');
  }

  return (
    <form
      className="add-habit-form"
      onSubmit={handleSubmit}
      aria-label="習慣を追加するフォーム"
    >
      <label htmlFor="habit-name-input" className="add-habit-form__label">
        習慣の名前
      </label>
      <div className="add-habit-form__row">
        <input
          id="habit-name-input"
          type="text"
          className="add-habit-form__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="例: 毎朝ストレッチ"
          aria-required="true"
          autoComplete="off"
        />
        <button
          type="submit"
          className="add-habit-form__submit"
          disabled={value.trim() === ''}
          aria-label="習慣を追加"
        >
          追加
        </button>
      </div>
    </form>
  );
}
