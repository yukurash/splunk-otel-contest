import { useRef } from 'react';

type Props = {
  onAdd: (name: string) => void;
};

export function AddHabitForm({ onAdd }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;
    onAdd(name);
    input.value = '';
    input.focus();
  }

  return (
    <form
      className="add-habit-form"
      onSubmit={handleSubmit}
      aria-label="新しい習慣を追加"
    >
      <label className="add-habit-form__label" htmlFor="habit-name-input">
        習慣名
      </label>
      <div className="add-habit-form__row">
        <input
          ref={inputRef}
          id="habit-name-input"
          className="add-habit-form__input"
          type="text"
          placeholder="例: 毎日30分読書"
          autoComplete="off"
          maxLength={80}
          aria-required="true"
        />
        <button
          type="submit"
          className="btn btn--primary"
          aria-label="新しい習慣を追加"
        >
          追加
        </button>
      </div>
    </form>
  );
}
