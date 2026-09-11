import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Persisted } from '../types';
import { EMPTY } from './helpers';
import { PrintView } from '../components/PrintView';

describe('PrintView', () => {
  test('shows an empty state when nothing is weak or noted', () => {
    render(<PrintView state={EMPTY} />);
    expect(screen.getByText(/nothing rated weak or noted yet/i)).toBeInTheDocument();
  });

  test('lists a weak question and a noted question, grouped by round', () => {
    const state: Persisted = {
      ...EMPTY,
      progress: { 'hr-001': { rating: 1, seen: 1, lastSeen: 1 } },
      notes: { 'coding-001': 'my real story here' },
    };
    render(<PrintView state={state} />);
    expect(screen.getByRole('heading', { name: 'HR screen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Live coding' })).toBeInTheDocument();
    expect(screen.getByText('my real story here')).toBeInTheDocument();
  });

  test('the Print button calls window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<PrintView state={{ ...EMPTY, notes: { 'hr-001': 'x' } }} />);
    await userEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });
});
