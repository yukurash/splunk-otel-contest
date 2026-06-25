import './App.css';
import { useHabits } from './hooks/useHabits';
import { AddHabitForm } from './components/AddHabitForm';
import { HabitCard } from './components/HabitCard';
import { EmptyState } from './components/EmptyState';

function App() {
  const { habits, addHabit, removeHabit, toggleToday } = useHabits();

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-header__title">習慣トラッカー</h1>
        <p className="app-header__subtitle">毎日の習慣を記録して連続達成を目指そう</p>
      </header>

      <main className="app-main">
        <section className="add-section" aria-label="習慣を追加">
          <AddHabitForm onAdd={addHabit} />
        </section>

        <section className="habits-section" aria-label="習慣一覧">
          {habits.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="habit-list" aria-label="登録された習慣">
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggleToday={toggleToday}
                  onRemove={removeHabit}
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
