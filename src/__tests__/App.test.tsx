import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { STORAGE_KEY, emptyState } from '../lib/storage';
import App from '../App';

afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
  localStorage.clear();
});

describe('App', () => {
  test('renders Home with no save-failed banner when storage works', () => {
    render(<App />);
    // The live region is always mounted now (see "app-level announcements"); what a
    // working save means is that it has nothing to say.
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
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

describe('document title', () => {
  // The tab, the back-history entry and what a screen reader reads out on navigation
  // are all this string — every one of the thirteen routes used to say "Interview Prep".
  test('home keeps the plain app name', () => {
    render(<App />);
    expect(document.title).toBe('Interview Prep');
  });

  test('a round route names the round', () => {
    window.location.hash = '#coding';
    render(<App />);
    expect(document.title).toBe('Live coding · Interview Prep');
  });

  test('a non-round route names the view', () => {
    window.location.hash = '#weak';
    render(<App />);
    expect(document.title).toBe('Weak drill · Interview Prep');
  });

  test('navigating updates it', async () => {
    render(<App />);
    await act(async () => {
      window.location.hash = '#mock';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(document.title).toBe('Mock session · Interview Prep');
  });
});

describe('app-level announcements', () => {
  // A role="status" that is mounted with its text already inside is routinely missed
  // by screen readers — the region has to be there first and fill afterwards.
  test('the live region is mounted and empty before anything goes wrong', () => {
    render(<App />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  test('a stale-tab warning fills the already-mounted region', () => {
    render(<App />);
    const region = screen.getByRole('status');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{}' }));
    });
    // Same node as before the event: filled in place, not mounted with its text.
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent(/another tab changed your progress/i);
  });
});

describe('cross-tab overwrite warning', () => {
  // Each tab writes the whole blob on a debounce, so without this the last write
  // silently wipes the other tab's ratings, notes and stories.
  test('warns when another tab writes to the same storage key', () => {
    render(<App />);
    expect(screen.queryByText(/another tab changed your progress/i)).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{}' }));
    });
    // Twice on purpose: the visible banner, and the sr-only live region.
    expect(screen.getAllByText(/another tab changed your progress/i)).toHaveLength(2);
  });

  // Every tab re-writes the state it just loaded ~500ms after mount, and Chrome fires
  // `storage` even when the value written is byte-identical — so merely opening a
  // second tab told the first one its progress had been changed by someone else.
  test('an identical write from another tab is not a change', () => {
    render(<App />);
    const mine = localStorage.getItem(STORAGE_KEY) ?? JSON.stringify(emptyState());
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: mine }));
    });
    expect(screen.queryByText(/another tab changed your progress/i)).not.toBeInTheDocument();
  });

  test('ignores writes to unrelated storage keys', () => {
    render(<App />);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'interview-prep:theme', newValue: 'dark' }));
    });
    expect(screen.queryByText(/another tab changed your progress/i)).not.toBeInTheDocument();
  });
});

// jsdom does not evaluate `@media print`, so these assert the hook rather than the
// rendered result: the print variant has to be on the chrome and the banners and
// nowhere else. The old rule was `header { display: none }` in index.css, which also
// ate Home's own <header> — so the sheet printed with no heading at all.
describe('what the printed sheet drops', () => {
  test('the app chrome hides itself, and only itself', () => {
    const { container } = render(<App />);
    const [chrome, homeHeading] = Array.from(container.querySelectorAll('header'));
    expect(chrome).toHaveClass('print:hidden');
    expect(homeHeading).toBeDefined();
    expect(homeHeading).not.toHaveClass('print:hidden');
  });

  test('the stale-tab banner does not print', () => {
    render(<App />);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{}' }));
    });
    const banner = screen.getAllByText(/another tab changed your progress/i)
      .find((el) => !el.classList.contains('sr-only'));
    expect(banner).toHaveClass('print:hidden');
  });

  test('the save-failed banner does not print', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    vi.useFakeTimers();
    try {
      render(<App />);
      await act(() => vi.advanceTimersByTimeAsync(500));
      const banner = screen.getAllByText(/not being saved/i).find((el) => !el.classList.contains('sr-only'));
      expect(banner).toHaveClass('print:hidden');
    } finally {
      vi.useRealTimers();
    }
  });
});
