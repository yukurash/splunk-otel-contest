import './App.css';
import { AddHabitForm } from './components/AddHabitForm';
import { EmptyState } from './components/EmptyState';
import { HabitCard } from './components/HabitCard';
import { useHabits } from './hooks/useHabits';

function App() {
  const { habits, todayStr, addHabitByName, removeHabitById, toggleHabitCompletion } =
    useHabits();

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">習慣トラッカー</h1>
        <p className="app__date">今日: {todayStr}</p>
      </header>

      <main className="app__main">
        <AddHabitForm onAdd={addHabitByName} />

        <section className="habit-list" aria-label="習慣リスト">
          {habits.length === 0 ? (
            <EmptyState />
          ) : (
            habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                todayStr={todayStr}
                onToggle={toggleHabitCompletion}
                onRemove={removeHabitById}
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
