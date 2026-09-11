import { describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { questionsByRound } from '../data';
import { DesignSession } from '../components/DesignSession';

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <DesignSession state={state} dispatch={dispatch} />;
}

describe('DesignSession', () => {
  test('renders a design prompt with the phase checklist and a countdown', () => {
    vi.useFakeTimers();
    try {
      render(<Harness />);
      const [first] = questionsByRound('design');
      expect(screen.getByText(first!.question)).toBeInTheDocument();
      expect(screen.getByText('Requirements')).toBeInTheDocument();
      expect(screen.getByText('Rollout')).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(250));
      expect(screen.getByRole('timer')).toHaveTextContent(/time left: 45:00/i);
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test('Finish reveals the model answer and key points, and rate dispatches a rating', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));

    const [first] = questionsByRound('design');
    expect(screen.getByText(first!.answer[0]!)).toBeInTheDocument();
    expect(screen.getByText(first!.keyPoints[0]!)).toBeInTheDocument();

    const solid = screen.getByRole('radio', { name: /solid/i });
    expect(solid).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(solid);
    expect(solid).toHaveAttribute('aria-checked', 'true');
  });

  test('another prompt restarts with a fresh checklist and scratch pad', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('checkbox', { name: /requirements/i }));
    await userEvent.type(screen.getByLabelText(/scratch/i), 'my notes');
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));
    await userEvent.click(screen.getByRole('radio', { name: /solid/i }));
    await userEvent.click(screen.getByRole('button', { name: /another prompt/i }));

    expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /requirements/i })).not.toBeChecked();
    expect(screen.getByLabelText(/scratch/i)).toHaveValue('');
  });

  test('another prompt gets its own fresh 45-minute clock, even without rating first', async () => {
    vi.useFakeTimers();
    try {
      render(<Harness />);
      act(() => vi.advanceTimersByTime(250));
      expect(screen.getByRole('timer')).toHaveTextContent(/time left: 45:00/i);

      // Spend 10 minutes on this prompt, then restart without rating it — the next
      // prompt (which may well be this same one again) must not inherit this
      // elapsed time as a head start on its own clock.
      act(() => vi.advanceTimersByTime(10 * 60 * 1000));
      expect(screen.getByRole('timer')).toHaveTextContent(/time left: 35:00/i);

      fireEvent.click(screen.getByRole('button', { name: /finish/i }));
      fireEvent.click(screen.getByRole('button', { name: /another prompt/i }));

      act(() => vi.advanceTimersByTime(250));
      expect(screen.getByRole('timer')).toHaveTextContent(/time left: 45:00/i);
    } finally {
      vi.useRealTimers();
    }
  });
});
