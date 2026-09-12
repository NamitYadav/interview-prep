import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useReducer } from 'react';
import type { Persisted } from '../types';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { questionsByRound } from '../data';
import { DesignSession } from '../components/DesignSession';

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <DesignSession state={state} dispatch={dispatch} />;
}

describe('DesignSession', () => {
  // design-007/design-011 carry `deeper`; the session view rendered only `answer`,
  // so that material was invisible in the one mode built for the design round.
  // The prompt is picked at random, so assert against whichever one rendered —
  // either way this is a real assertion, never a vacuous pass.
  test('shows deeper material exactly when the shown prompt has it', async () => {
    const design = questionsByRound('design');
    expect(design.some((q) => q.deeper?.length), 'no design question carries deeper material').toBe(true);
    render(<Harness />);
    const shown = design.find((q) => screen.queryByText(q.question) !== null);
    expect(shown, 'no design prompt rendered').toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));
    const heading = screen.queryByRole('heading', { name: /if they dig deeper/i });
    if (shown!.deeper?.length) expect(heading).toBeInTheDocument();
    else expect(heading).not.toBeInTheDocument();
  });

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

  // Finish unmounts the button that was just pressed. Focus then sits on <body>:
  // a screen reader announces nothing, and the next Tab starts from the top of the
  // document rather than from the answer that just appeared.
  test('Finish moves focus to the heading of the answer that replaced it', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));
    expect(screen.getByRole('heading', { name: /model answer/i })).toHaveFocus();
  });

  test('the rating radios are arrow-key operable here too', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));
    screen.getByRole('radio', { name: /weak/i }).focus();
    await userEvent.keyboard('{ArrowRight}');
    // Arrows navigate; they do not commit. Space does.
    expect(screen.getByRole('radio', { name: /ok/i })).toHaveFocus();
    expect(screen.getByRole('radio', { name: /ok/i })).not.toBeChecked();
    await userEvent.keyboard(' ');
    expect(screen.getByRole('radio', { name: /ok/i })).toBeChecked();
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

describe('another prompt never repeats the very same prompt', () => {
  // Rating Weak keeps a question in the lowest bucket, so without excluding the
  // current id, nextQuestion picked it again on the very next call — "Another
  // prompt" just restarted the exact same prompt over and over.
  test('rating the current prompt Weak and restarting shows a different prompt', async () => {
    render(<Harness />);
    const design = questionsByRound('design');
    const shown = design.find((q) => screen.queryByText(q.question) !== null)!;
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));
    await userEvent.click(screen.getByRole('radio', { name: /weak/i }));
    await userEvent.click(screen.getByRole('button', { name: /another prompt/i }));
    expect(screen.queryByText(shown.question)).not.toBeInTheDocument();
  });
});

describe('design scratch survives a reload across attempts', () => {
  beforeEach(() => localStorage.clear());

  let persisted: Persisted = EMPTY;
  function ReloadableHarness() {
    const [state, dispatch] = useReducer(reducer, persisted);
    useEffect(() => { persisted = state; });
    return <DesignSession state={state} dispatch={dispatch} />;
  }

  // The scratch key used to include the in-memory `attempt` counter, which restarts
  // at 0 on every fresh mount. design-001 stays the weakest-rated design prompt
  // throughout this test, so it recurs at attempt 0, then again at attempt 2 (once a
  // different prompt has taken attempt 1) — and a reload always lands back at
  // attempt 0. The write made at attempt 2 was therefore unreachable after a reload,
  // not merely reset: attempt 0's key still held only the FIRST attempt's text.
  test('the latest scratch for a recurring prompt is still there after a reload, not the first', async () => {
    persisted = { ...EMPTY, progress: { 'design-001': { rating: 1, seen: 1, lastSeen: 0 } } };
    const first = render(<ReloadableHarness />);

    const [design1, design2] = questionsByRound('design');
    expect(screen.getByText(design1!.question)).toBeInTheDocument(); // attempt 0: design-001

    await userEvent.type(screen.getByLabelText(/scratch/i), 'v1');
    fireEvent.blur(screen.getByLabelText(/scratch/i));
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));
    await userEvent.click(screen.getByRole('button', { name: /another prompt/i }));

    expect(screen.getByText(design2!.question)).toBeInTheDocument(); // attempt 1: design-002
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));
    await userEvent.click(screen.getByRole('button', { name: /another prompt/i }));

    expect(screen.getByText(design1!.question)).toBeInTheDocument(); // attempt 2: design-001 again
    expect(screen.getByLabelText(/scratch/i)).toHaveValue('v1'); // the earlier attempt's draft, reloaded
    await userEvent.clear(screen.getByLabelText(/scratch/i));
    await userEvent.type(screen.getByLabelText(/scratch/i), 'v2 overwrite');
    fireEvent.blur(screen.getByLabelText(/scratch/i));
    first.unmount(); // simulate a reload

    render(<ReloadableHarness />);
    expect(screen.getByText(design1!.question)).toBeInTheDocument(); // back to attempt 0: design-001
    expect(screen.getByLabelText(/scratch/i)).toHaveValue('v2 overwrite');
  });
});
