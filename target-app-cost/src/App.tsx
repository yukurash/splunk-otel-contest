import './App.css';
import { HabitForm } from './components/HabitForm';
import { HabitItem } from './components/HabitItem';
import { EmptyState } from './components/EmptyState';
import { useHabits } from './hooks/useHabits';

function App() {
  const { habits, addHabit, deleteHabit, toggleToday } = useHabits();

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">習慣トラッカー</h1>
        <p className="app__subtitle">毎日の習慣を記録して、連続達成を目指そう</p>
      </header>

      <main className="app__main">
        <section className="app__form-section" aria-label="習慣追加">
          <HabitForm onAdd={addHabit} />
        </section>

        <section className="app__list-section" aria-label="習慣一覧">
          {habits.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="habit-list" aria-label="習慣リスト">
              {habits.map((habit) => (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  onToggle={toggleToday}
                  onDelete={deleteHabit}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
