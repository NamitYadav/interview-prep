import { beforeEach, describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../components/ThemeToggle';
import { THEME_KEY } from '../hooks/useTheme';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemeToggle', () => {
  test('defaults to dark and applies it to the document', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('switching to gruvbox applies and persists it', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Gruvbox' }));
    expect(document.documentElement.dataset.theme).toBe('gruvbox');
    expect(localStorage.getItem(THEME_KEY)).toBe('gruvbox');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('restores the persisted theme on mount', () => {
    localStorage.setItem(THEME_KEY, 'gruvbox');
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: 'Gruvbox' })).toHaveAttribute('aria-pressed', 'true');
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
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
