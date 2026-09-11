import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { STORAGE_KEY } from '../lib/storage';
import App from '../App';

afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
  localStorage.clear();
});

describe('App', () => {
  test('renders Home with no save-failed banner when storage works', () => {
    render(<App />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /interview prep/i })).toBeInTheDocument();
  });

  test('shows the save-failed banner when storage writes throw', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    vi.useFakeTimers();
    try {
      render(<App />);
      await vi.advanceTimersByTimeAsync(500);
      expect(screen.getByRole('status')).toHaveTextContent(/not being saved/i);
    } finally {
      vi.useRealTimers();
    }
  });

  test('golden path: reveal, rate, advance, and the rating persists to storage', async () => {
    vi.useFakeTimers();
    try {
      window.location.hash = '#hr';
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /reveal/i }));
      fireEvent.click(screen.getByRole('radio', { name: /solid/i }));
      // Advancing to the next question is synchronous (no fake-timer advance needed);
      // the debounced save is what we wait for below.
      await act(() => vi.advanceTimersByTimeAsync(500));
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(Object.values(saved.progress).some((e) => (e as { rating: number }).rating === 3)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
