import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Persisted } from '../types';
import { EMPTY } from './helpers';
import { questions } from '../data';
import { PrintView } from '../components/PrintView';

const withSnippet = questions.find((q) => q.code && !q.scratch)!;
const withStarter = questions.find((q) => q.code && q.scratch)!;

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

  // "What is wrong with this component?" is unanswerable on paper without the component.
  test('prints the code snippet a question is about', () => {
    const state: Persisted = { ...EMPTY, progress: { [withSnippet.id]: { rating: 1, seen: 1, lastSeen: 1 } } };
    const { container } = render(<PrintView state={state} />);
    const pre = container.querySelector('pre');
    expect(pre?.textContent).toBe(withSnippet.code);
    // Wraps rather than running off the right edge of the page.
    expect(pre).toHaveClass('whitespace-pre-wrap');
    // Print drops background colors, so the border is what separates it from prose.
    expect(pre).toHaveClass('border');
  });

  test('omits the starter text of a scratch question', () => {
    const state: Persisted = { ...EMPTY, progress: { [withStarter.id]: { rating: 1, seen: 1, lastSeen: 1 } } };
    const { container } = render(<PrintView state={state} />);
    expect(container.querySelector('pre')).toBeNull();
  });

  test('the Print button calls window.print', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<PrintView state={{ ...EMPTY, notes: { 'hr-001': 'x' } }} />);
    await userEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(printSpy).toHaveBeenCalledOnce();
    printSpy.mockRestore();
  });
});
