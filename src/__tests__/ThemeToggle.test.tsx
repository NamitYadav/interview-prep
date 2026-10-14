import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../components/ThemeToggle';
import { THEME_KEY } from '../hooks/useTheme';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(() => vi.unstubAllGlobals());

describe('ThemeToggle', () => {
  test('defaults to System, which resolves to gruvbox on a dark OS', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('gruvbox');
  });

  test('System resolves to gruvbox-light on a light OS', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('light'), addEventListener() {}, removeEventListener() {} }));
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe('gruvbox-light');
  });

  test('choosing System again clears the stored theme', async () => {
    localStorage.setItem(THEME_KEY, 'light');
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'System' }));
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  test('switching to gruvbox applies and persists it', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Gruvbox' }));
    expect(document.documentElement.dataset.theme).toBe('gruvbox');
    expect(localStorage.getItem(THEME_KEY)).toBe('gruvbox');
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('restores the persisted theme on mount', () => {
    localStorage.setItem(THEME_KEY, 'gruvbox');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Gruvbox' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('switching to gruvbox-light applies and persists it', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Gruvbox Light' }));
    expect(document.documentElement.dataset.theme).toBe('gruvbox-light');
    expect(localStorage.getItem(THEME_KEY)).toBe('gruvbox-light');
  });

  test('switching to light applies and persists it', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  test('ignores an unknown stored theme', () => {
    localStorage.setItem(THEME_KEY, 'solarized');
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe('gruvbox');
  });
});
