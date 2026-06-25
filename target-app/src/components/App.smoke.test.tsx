import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Fake in-memory localStorage
const createFakeLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

describe('App (smoke tests)', () => {
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>;

  beforeEach(() => {
    fakeStorage = createFakeLocalStorage();
    // Replace global localStorage with fake
    Object.defineProperty(globalThis, 'localStorage', {
      value: fakeStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('empty state (requirement 1)', () => {
    it('displays empty state message when no habits', () => {
      // Arrange & Act
      render(<App />);

      // Assert
      expect(screen.getByText('まだ習慣がありません')).toBeInTheDocument();
    });

    it('displays hint when no habits', () => {
      // Arrange & Act
      render(<App />);

      // Assert
      expect(screen.getByText('上のフォームから習慣を追加しましょう')).toBeInTheDocument();
    });
  });

  describe('app structure', () => {
    it('renders main application title', () => {
      // Arrange & Act
      render(<App />);

      // Assert
      expect(screen.getByText('習慣トラッカー')).toBeInTheDocument();
    });

    it('renders subtitle', () => {
      // Arrange & Act
      render(<App />);

      // Assert
      expect(screen.getByText('毎日の習慣を記録して連続達成を目指そう')).toBeInTheDocument();
    });
  });
});
