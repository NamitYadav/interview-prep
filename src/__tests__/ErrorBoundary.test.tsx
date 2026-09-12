import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { STORAGE_KEY } from '../lib/storage';

function Bomb(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  test('renders children when nothing throws', () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  test('renders a fallback instead of crashing when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(screen.getByRole('heading', { name: /something broke/i })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe('ErrorBoundary recovery', () => {
  let reload: ReturnType<typeof vi.fn>;
  const realLocation = window.location;
  // jsdom refuses a real navigation and won't let reload be spied on in place, so the
  // whole location is swapped for the test. What is under test is that the component
  // asks for the navigation at all — it used to ask for nothing.
  const setLocation = (value: unknown) =>
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    reload = vi.fn();
    setLocation({ hash: '#coding', reload });
    localStorage.setItem(STORAGE_KEY, '{"version":2,"progress":{},"notes":{},"stories":{}}');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setLocation(realLocation);
    localStorage.clear();
  });

  // The hash listener died with the unmounted tree and hasError never resets, so a
  // link to the home route did precisely nothing — while the copy told the user to go
  // to the home screen and export. Navigating has to take the reload with it.
  test('going back to all rounds actually navigates home and reloads', async () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    await userEvent.click(screen.getByRole('button', { name: /all rounds/i }));
    expect(window.location.hash).toBe('');
    expect(reload).toHaveBeenCalled();
  });

  // If the throw came from saved state, reloading re-throws forever: without this the
  // only escape was clearing storage from the browser's own settings.
  test('the destructive escape clears saved data and reloads, after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    await userEvent.click(screen.getByRole('button', { name: /delete all saved data/i }));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(reload).toHaveBeenCalled();
  });

  test('declining the confirm keeps the data', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    await userEvent.click(screen.getByRole('button', { name: /delete all saved data/i }));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  // Destructive, and never the thing you hit first: Reload stays the primary action.
  test('the destructive action is not the primary one', () => {
    render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons[0]).toMatch(/reload/i);
    expect(buttons.at(-1)).toMatch(/delete all saved data/i);
  });
});
