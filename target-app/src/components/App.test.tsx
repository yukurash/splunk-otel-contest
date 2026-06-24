import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('App.tsx - Component Smoke Tests', () => {
  beforeEach(() => {
    // クリアして各テストを分離
    localStorage.clear();
  });

  describe('Empty state', () => {
    it('習慣が0件の場合、空状態メッセージが表示される', () => {
      render(<App />);
      expect(
        screen.getByText('習慣がまだ登録されていません。上のフォームから最初の習慣を追加しましょう。')
      ).toBeInTheDocument();
    });
  });

  describe('Add habit flow', () => {
    it('フォームから習慣を追加するとリストに表示される', async () => {
      const user = userEvent.setup();
      render(<App />);

      // 空状態メッセージを確認
      expect(
        screen.getByText('習慣がまだ登録されていません。上のフォームから最初の習慣を追加しましょう。')
      ).toBeInTheDocument();

      // フォームに入力
      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ');
      await user.type(input, 'Yoga');

      // 追加ボタンをクリック
      const addButton = screen.getByRole('button', { name: '習慣を追加' });
      await user.click(addButton);

      // 習慣がリストに表示される
      expect(screen.getByText('Yoga')).toBeInTheDocument();

      // 空状態メッセージは表示されない
      expect(
        screen.queryByText('習慣がまだ登録されていません。上のフォームから最初の習慣を追加しましょう。')
      ).not.toBeInTheDocument();
    });

    it('複数の習慣を追加できる', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ');
      const addButton = screen.getByRole('button', { name: '習慣を追加' });

      // 1つ目の習慣を追加
      await user.type(input, 'Yoga');
      await user.click(addButton);

      // 2つ目の習慣を追加
      await user.type(input, 'Running');
      await user.click(addButton);

      expect(screen.getByText('Yoga')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('追加後、フォームの入力欄がクリアされる', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ') as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: '習慣を追加' });

      await user.type(input, 'Yoga');
      await user.click(addButton);

      expect(input.value).toBe('');
    });

    it('空白のみの入力では追加されない', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ');
      const addButton = screen.getByRole('button', { name: '習慣を追加' });

      await user.type(input, '   ');

      // 追加ボタンは無効になるはず
      expect(addButton).toBeDisabled();
    });
  });

  describe('Toggle completion', () => {
    it('習慣を追加後、トグルボタンで達成状態が変わる', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ');
      const addButton = screen.getByRole('button', { name: '習慣を追加' });

      await user.type(input, 'Yoga');
      await user.click(addButton);

      // 初期状態: 達成していない
      const toggleButton = screen.getByRole('button', { name: /を今日達成済みにする/ });
      expect(toggleButton).toHaveTextContent('達成する');

      // トグル: 達成済みに
      await user.click(toggleButton);
      expect(toggleButton).toHaveTextContent('達成済み');

      // トグル: 未達成に
      await user.click(toggleButton);
      expect(toggleButton).toHaveTextContent('達成する');
    });

    it('ストリークが正しく表示される(今日達成時は1)', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ');
      const addButton = screen.getByRole('button', { name: '習慣を追加' });

      await user.type(input, 'Yoga');
      await user.click(addButton);

      // トグル前: ストリークは0
      expect(screen.getByText(/^0$/)).toBeInTheDocument();

      // トグル: 達成済みに
      const toggleButton = screen.getByRole('button', { name: /を今日達成済みにする/ });
      await user.click(toggleButton);

      // トグル後: ストリークは1
      expect(screen.getByText(/^1$/)).toBeInTheDocument();
    });
  });

  describe('Remove habit', () => {
    it('削除ボタンで習慣が削除される', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ');
      const addButton = screen.getByRole('button', { name: '習慣を追加' });

      await user.type(input, 'Yoga');
      await user.click(addButton);

      expect(screen.getByText('Yoga')).toBeInTheDocument();

      // 削除ボタンをクリック
      const removeButton = screen.getByRole('button', { name: /を削除/ });
      await user.click(removeButton);

      expect(screen.queryByText('Yoga')).not.toBeInTheDocument();

      // 空状態メッセージが再度表示される
      expect(
        screen.getByText('習慣がまだ登録されていません。上のフォームから最初の習慣を追加しましょう。')
      ).toBeInTheDocument();
    });

    it('複数習慣がある場合、指定習慣のみ削除される', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ');
      const addButton = screen.getByRole('button', { name: '習慣を追加' });

      await user.type(input, 'Yoga');
      await user.click(addButton);

      await user.type(input, 'Running');
      await user.click(addButton);

      // Yoga を削除
      const removeButtons = screen.getAllByRole('button', { name: /を削除/ });
      await user.click(removeButtons[0]);

      expect(screen.queryByText('Yoga')).not.toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  describe('Persistence', () => {
    it('追加した習慣が localStorage に保存される', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ');
      const addButton = screen.getByRole('button', { name: '習慣を追加' });

      await user.type(input, 'Yoga');
      await user.click(addButton);

      const stored = localStorage.getItem('app:habits');
      expect(stored).not.toBeNull();
      const habits = JSON.parse(stored!);
      expect(habits).toHaveLength(1);
      expect(habits[0].name).toBe('Yoga');
    });

    it('toggle 後の状態が localStorage に保存される', async () => {
      const user = userEvent.setup();
      render(<App />);

      const input = screen.getByPlaceholderText('例: 毎朝ストレッチ');
      const addButton = screen.getByRole('button', { name: '習慣を追加' });

      await user.type(input, 'Yoga');
      await user.click(addButton);

      const toggleButton = screen.getByRole('button', { name: /を今日達成済みにする/ });
      await user.click(toggleButton);

      const stored = localStorage.getItem('app:habits');
      const habits = JSON.parse(stored!);
      // 今日の日付が含まれている (YYYY-MM-DD 形式)
      expect(habits[0].completedDates[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Header display', () => {
    it('今日の日付がヘッダーに表示される', () => {
      render(<App />);
      const dateDisplay = screen.getByText(/^今日:/, { selector: 'p' });
      expect(dateDisplay).toBeInTheDocument();
      // 日付フォーマット: YYYY-MM-DD
      expect(dateDisplay.textContent).toMatch(/今日: \d{4}-\d{2}-\d{2}/);
    });
  });
});
