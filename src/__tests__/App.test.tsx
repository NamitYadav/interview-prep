import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

afterEach(() => {
  vi.restoreAllMocks();
  window.location.hash = '';
});

describe('App', () => {
  test('renders Home with no save-failed banner when storage works', () => {
    render(<App />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /interview prep/i })).toBeInTheDocument();
  });

  test('shows the save-failed banner when storage writes throw', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent(/not being saved/i);
  });
});
