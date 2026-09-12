import { describe, expect, test } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { useReducer } from 'react';
import type { Persisted, Progress } from '../types';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { questions, questionsByRound } from '../data';
import { LAST_EXPORT_KEY } from '../components/ExportImport';
import { Home } from '../components/Home';

function Harness({ initial }: { initial: Persisted }) {
  const [state] = useReducer(reducer, initial);
  return <Home state={state} />;
}

const roundOrder = () => within(screen.getByRole('list')).getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

describe('Home', () => {
  test('with no loop date set: no days-left text, and rounds stay in data order', () => {
    render(<Harness initial={EMPTY} />);
    expect(screen.queryByText(/days left/i)).not.toBeInTheDocument();
    expect(screen.getByText('Round 1')).toBeInTheDocument();
    const order = roundOrder();
    expect(order[0]).toBe('HR screen');
  });

  test('setting a loop date shows days left and a per-round readiness line', () => {
    render(<Harness initial={EMPTY} />);
    const input = screen.getByLabelText(/loop date/i);
    const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    fireEvent.change(input, { target: { value: inThreeDays } });
    expect(screen.getByText(/3 days left/i)).toBeInTheDocument();
    expect(screen.getAllByText(/unseen · 3 days/i).length).toBeGreaterThan(0);
  });

  test('with a loop date, cards reorder by urgency and drop the Round N label', () => {
    // Every question in every round rated solid (urgency 0 everywhere) except two
    // hoe questions left weak — hoe (naturally last, Round 7) is now the only round
    // with nonzero urgency, so it must bubble to the very top of the sorted list.
    const progress: Progress = {};
    for (const q of questions) progress[q.id] = { rating: 3, seen: 1, lastSeen: 1 };
    const [firstHoe, secondHoe] = questionsByRound('hoe');
    progress[firstHoe!.id] = { rating: 1, seen: 1, lastSeen: 1 };
    progress[secondHoe!.id] = { rating: 1, seen: 1, lastSeen: 1 };
    const seeded: Persisted = { ...EMPTY, progress };

    render(<Harness initial={seeded} />);
    fireEvent.change(screen.getByLabelText(/loop date/i), { target: { value: '2026-12-31' } });

    const order = roundOrder();
    expect(order[0]).toBe('Head of engineering');
    // Every other round ties at zero urgency, so the stable sort keeps hr — first
    // in data order among the ties — right behind hoe, not at the very end.
    expect(order[1]).toBe('HR screen');

    // Sorted by urgency, "Round 7" on the first card would contradict its position.
    expect(screen.queryByText(/^Round \d$/)).not.toBeInTheDocument();
  });

  test('export nudge is hidden with no progress', () => {
    localStorage.removeItem(LAST_EXPORT_KEY);
    render(<Harness initial={EMPTY} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('export nudge shows once progress exists with no export on record', () => {
    localStorage.removeItem(LAST_EXPORT_KEY);
    const seeded: Persisted = { ...EMPTY, progress: { 'hr-001': { rating: 2, seen: 1, lastSeen: 1 } } };
    render(<Harness initial={seeded} />);
    expect(screen.getByRole('status')).toHaveTextContent(/back up your progress/i);
  });

  test('export nudge is hidden when the last export was recent', () => {
    localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
    const seeded: Persisted = { ...EMPTY, progress: { 'hr-001': { rating: 2, seen: 1, lastSeen: 1 } } };
    render(<Harness initial={seeded} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    localStorage.removeItem(LAST_EXPORT_KEY);
  });

  test('export nudge reappears when the last export is over a week old', () => {
    localStorage.setItem(LAST_EXPORT_KEY, String(Date.now() - 8 * 86_400_000));
    const seeded: Persisted = { ...EMPTY, progress: { 'hr-001': { rating: 2, seen: 1, lastSeen: 1 } } };
    render(<Harness initial={seeded} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    localStorage.removeItem(LAST_EXPORT_KEY);
  });
});
