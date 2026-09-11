import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Persisted } from '../types';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { WeakDrill } from '../components/WeakDrill';

const weakOn = (...ids: string[]): Persisted => ({
  ...EMPTY,
  progress: Object.fromEntries(ids.map((id) => [id, { rating: 1 as const, seen: 1, lastSeen: 1 }])),
});

function Harness({ initial }: { initial: Persisted }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <WeakDrill state={state} dispatch={dispatch} strictMode={false} />;
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
  });

  test('the drill set stays put when the current question is rated up', async () => {
    render(<Harness initial={weakOn('hr-001')} />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /^solid/i }));

    // Frozen set: the question must not vanish and strand Practice with nothing to show.
    expect(screen.getByText(/0 of 1 still weak/i)).toBeInTheDocument();
    expect(screen.queryByText(/no questions match/i)).not.toBeInTheDocument();
  });
});
