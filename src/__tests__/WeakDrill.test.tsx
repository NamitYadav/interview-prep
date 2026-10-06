import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Persisted } from '../types';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { WeakDrill } from '../components/WeakDrill';

// Ties in the practice queue are broken at random (lib/queue); a constant draw keeps the
// stable sort's data order so these assertions can name specific questions.
beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0); });
beforeEach(() => localStorage.clear());

const weakOn = (...ids: string[]): Persisted => ({
  ...EMPTY,
  progress: Object.fromEntries(ids.map((id) => [id, { rating: 1 as const, seen: 1, lastSeen: 1 }])),
});

function Harness({ initial }: { initial: Persisted }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <WeakDrill state={state} dispatch={dispatch} strictMode={false} role="staff" />;
}

describe('WeakDrill', () => {
  test('shows an empty state when nothing is rated weak', () => {
    render(<Harness initial={EMPTY} />);
    expect(screen.getByText(/nothing rated weak yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument();
  });

  test('collects weak questions from every round and counts them', () => {
    render(<Harness initial={weakOn('hr-001', 'coding-001')} />);
    expect(screen.getByText(/2 of 2 still weak/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
    // The drill mixes rounds by rating recency, not round order — it must not show
    // the ordered-mode-only "Round k of n" banner, which would flicker meaninglessly.
    expect(screen.queryByText(/round \d+ of \d+/i)).not.toBeInTheDocument();
  });

  test('the drill set stays put when the current question is rated up', async () => {
    render(<Harness initial={weakOn('hr-001')} />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /^solid/i }));

    // Frozen set: the question must not vanish and strand Practice with nothing to show.
    expect(screen.getByText(/0 of 1 still weak/i)).toBeInTheDocument();
    expect(screen.queryByText(/no questions match/i)).not.toBeInTheDocument();
  });

  // Keyed on contents, the lap was lost on reload: the drill rebuilt smaller (whatever you
  // had rated up was gone), so the key changed and the saved lap was orphaned.
  test('a reload resumes the lap even though the drill set shrank', async () => {
    const rate = async (name: RegExp) => {
      await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
      await userEvent.click(screen.getByRole('radio', { name }));
    };
    const { unmount } = render(<Harness initial={weakOn('hr-001', 'hr-002', 'hr-003')} />);
    await rate(/^weak/i); // hr-001 stays weak
    await rate(/^solid/i); // hr-002 leaves the set
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
    unmount();

    render(<Harness initial={weakOn('hr-001', 'hr-003')} />);
    // Resumed on hr-003 with hr-001 behind it; a fresh lap would read "1 of 2".
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
  });
});
