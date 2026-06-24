import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should display empty state message when no habits exist', () => {
    // Arrange & Act
    render(<App />);

    // Assert
    expect(
      screen.getByText(/習慣がまだありません/i)
    ).toBeInTheDocument();
  });

  it('should add a habit when form is submitted with Enterkey', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole('textbox', { name: /習慣名/i });
    const habitName = 'Reading';

    // Act
    await user.type(input, habitName);
    await user.keyboard('{Enter}');

    // Assert
    expect(screen.getByText(habitName)).toBeInTheDocument();
    expect(input).toHaveValue(''); // Input should be cleared
  });

  it('should add a habit when add button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole('textbox', { name: /習慣名/i });
    const button = screen.getByRole('button', { name: /追加/i });
    const habitName = 'Exercise';

    // Act
    await user.type(input, habitName);
    await user.click(button);

    // Assert
    expect(screen.getByText(habitName)).toBeInTheDocument();
  });

  it('should not add habit with empty name', async () => {
    // Arrange
    render(<App />);

    const button = screen.getByRole('button', { name: /追加/i });

    // Act & Assert
    expect(button).toBeDisabled();
  });

  it('should remove empty state when first habit is added', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole('textbox', { name: /習慣名/i });
    const button = screen.getByRole('button', { name: /追加/i });

    // Assert: empty state exists initially
    expect(
      screen.getByText(/習慣がまだありません/i)
    ).toBeInTheDocument();

    // Act
    await user.type(input, 'Reading');
    await user.click(button);

    // Assert: empty state is gone
    expect(
      screen.queryByText(/習慣がまだありません/i)
    ).not.toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('should display streak as 0 for newly added habit', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole('textbox', { name: /習慣名/i });
    const button = screen.getByRole('button', { name: /追加/i });

    // Act
    await user.type(input, 'Exercise');
    await user.click(button);

    // Assert
    const streakLabel = screen.getByLabelText(/連続達成日数 0 日/i);
    expect(streakLabel).toBeInTheDocument();
  });

  it('should delete a habit when delete button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole('textbox', { name: /習慣名/i });
    const addButton = screen.getByRole('button', { name: /追加/i });
    const habitName = 'Reading';

    await user.type(input, habitName);
    await user.click(addButton);

    // Verify habit is added
    expect(screen.getByText(habitName)).toBeInTheDocument();

    // Act
    const deleteButton = screen.getByRole('button', {
      name: new RegExp(`${habitName}.*削除`, 'i'),
    });
    await user.click(deleteButton);

    // Assert
    expect(screen.queryByText(habitName)).not.toBeInTheDocument();
    expect(
      screen.getByText(/習慣がまだありません/i)
    ).toBeInTheDocument();
  });

  it('should toggle habit completion when checkbox is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole('textbox', { name: /習慣名/i });
    const addButton = screen.getByRole('button', { name: /追加/i });
    const habitName = 'Exercise';

    await user.type(input, habitName);
    await user.click(addButton);

    const toggleButton = screen.getByRole('checkbox', {
      name: new RegExp(`${habitName}.*達成にする`, 'i'),
    });

    // Assert: initially not checked
    expect(toggleButton).toHaveAttribute('aria-checked', 'false');

    // Act: toggle to completed
    await user.click(toggleButton);

    // Assert: now checked
    expect(toggleButton).toHaveAttribute('aria-checked', 'true');
    expect(toggleButton.getAttribute('aria-label')).toMatch(/未達成に戻す/i);

    // Act: toggle back to incomplete
    await user.click(toggleButton);

    // Assert: unchecked again
    expect(toggleButton).toHaveAttribute('aria-checked', 'false');
  });

  it('should persist habits to localStorage', async () => {
    // Arrange
    const user = userEvent.setup();
    const { rerender } = render(<App />);

    const input = screen.getByRole('textbox', { name: /習慣名/i });
    const addButton = screen.getByRole('button', { name: /追加/i });
    const habitName = 'Reading';

    // Act: add habit
    await user.type(input, habitName);
    await user.click(addButton);

    // Assert: habit is displayed
    expect(screen.getByText(habitName)).toBeInTheDocument();

    // Simulate app reload by re-rendering
    rerender(<App />);

    // Assert: habit persists after reload
    expect(screen.getByText(habitName)).toBeInTheDocument();
  });

  it('should handle multiple habits correctly', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole('textbox', { name: /習慣名/i });
    const addButton = screen.getByRole('button', { name: /追加/i });

    // Act: add multiple habits
    await user.type(input, 'Exercise');
    await user.click(addButton);

    await user.type(input, 'Reading');
    await user.click(addButton);

    await user.type(input, 'Meditation');
    await user.click(addButton);

    // Assert: all habits are displayed
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
    expect(screen.getByText('Meditation')).toBeInTheDocument();

    // Act: delete middle habit
    const deleteButton = screen.getByRole('button', {
      name: /Reading.*削除/i,
    });
    await user.click(deleteButton);

    // Assert: only Reading is removed
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.queryByText('Reading')).not.toBeInTheDocument();
    expect(screen.getByText('Meditation')).toBeInTheDocument();
  });

  it('should trim whitespace from habit names', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByRole('textbox', { name: /習慣名/i });
    const addButton = screen.getByRole('button', { name: /追加/i });

    // Act: add habit with leading/trailing spaces
    await user.type(input, '  Reading  ');
    await user.click(addButton);

    // Assert: spaces are trimmed
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });
});
