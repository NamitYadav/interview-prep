import { afterEach, describe, expect, test } from 'vitest';

afterEach(() => localStorage.clear());
import { render, screen, within, fireEvent } from '@testing-library/react';
import { useReducer, useState } from 'react';
import type { Persisted, Progress, RoleId } from '../types';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { forRole, questions } from '../data';
// Staff sees every question in these rounds (every tag includes Staff), so this is the whole bank's view.
const questionsByRound = forRole('staff').byRound;
import { LAST_EXPORT_KEY } from '../components/ExportImport';
import { LOOP_DATE_KEY } from '../hooks/useLoopDate';
import { Home } from '../components/Home';

function Harness({ initial }: { initial: Persisted }) {
  const [state] = useReducer(reducer, initial);
  const [role, setRole] = useState<RoleId>('staff');
  return <Home state={state} role={role} setRole={setRole} />;
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

  test('a loop date in the past stops counting and drops the urgency sort', () => {
    const progress: Progress = {};
    for (const q of questions) progress[q.id] = { rating: 3, seen: 1, lastSeen: 1 };
    const [firstHoe] = questionsByRound('hoe');
    progress[firstHoe!.id] = { rating: 1, seen: 1, lastSeen: 1 };
    render(<Harness initial={{ ...EMPTY, progress }} />);
    fireEvent.change(screen.getByLabelText(/loop date/i), { target: { value: '2020-01-01' } });
    expect(screen.getByText('Loop date has passed')).toBeInTheDocument();
    expect(screen.queryByText(/-\d+ days/)).not.toBeInTheDocument();
    expect(screen.queryByText(/days left/i)).not.toBeInTheDocument();
    // Data order again, with the Round N labels back.
    expect(roundOrder()[0]).toBe('HR screen');
    expect(screen.getByText('Round 1')).toBeInTheDocument();
  });

  test('a loop date of today reads as today, and one day out is singular', () => {
    render(<Harness initial={EMPTY} />);
    const local = (offsetDays: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    fireEvent.change(screen.getByLabelText(/loop date/i), { target: { value: local(0) } });
    expect(screen.getByText('Loop day is today')).toBeInTheDocument();
    expect(screen.getAllByText(/unseen · today/i).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/loop date/i), { target: { value: local(1) } });
    expect(screen.getByText('1 day left')).toBeInTheDocument();
  });

  test('rated-today and last-7-days counts come from lastSeen, once per question', () => {
    const now = Date.now();
    const [a, b, c, d] = questionsByRound('hr');
    const progress: Progress = {
      [a!.id]: { rating: 3, seen: 2, lastSeen: now - 1000 },
      [b!.id]: { rating: 1, seen: 1, lastSeen: now - 1000 },
      [c!.id]: { rating: 2, seen: 1, lastSeen: now - 3 * 86_400_000 },
      [d!.id]: { rating: 2, seen: 1, lastSeen: now - 30 * 86_400_000 },
    };
    render(<Harness initial={{ ...EMPTY, progress }} />);
    expect(screen.getByText('2 questions rated today · 3 in the last 7 days')).toBeInTheDocument();
  });

  test('the drilled-today line is hidden with no progress at all', () => {
    render(<Harness initial={EMPTY} />);
    expect(screen.queryByText(/rated today/i)).not.toBeInTheDocument();
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

  // Round 2 and 3's blurbs clipped mid-word on a laptop under line-clamp-2; the grid
  // row already stretches to its tallest card, so the clamp bought nothing.
  test('round blurbs are not clamped', () => {
    render(<Harness initial={EMPTY} />);
    const blurb = screen.getByText(/staff-scope/);
    expect(blurb.className).not.toMatch(/line-clamp/);
  });

  // Seven cards in two columns left the last one alone on its row.
  test('the last round card spans the full row', () => {
    render(<Harness initial={EMPTY} />);
    const cards = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(cards.length % 2).toBe(1);
    expect(cards[cards.length - 1]).toHaveClass('sm:last:col-span-2');
  });

  // Sorted by urgency the wide card should be the most urgent round, not the least.
  test('with a loop date the first round card spans the full row instead', () => {
    localStorage.setItem(LOOP_DATE_KEY, '2030-01-01');
    render(<Harness initial={EMPTY} />);
    const cards = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(cards[0]).toHaveClass('sm:first:col-span-2');
    expect(cards[cards.length - 1]).not.toHaveClass('sm:last:col-span-2');
  });

  test('switching roles changes the visible round cards and readiness counts', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    render(<Harness initial={EMPTY} />);
    expect(screen.getByText('HR screen')).toBeInTheDocument();
    expect(screen.getByText('Head of engineering')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'Senior frontend');
    expect(screen.queryByText('Head of engineering')).not.toBeInTheDocument();
  });
});
