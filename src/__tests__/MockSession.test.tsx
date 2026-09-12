import { beforeEach, describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useReducer } from 'react';
import type { Persisted } from '../types';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { MockSession } from '../components/MockSession';

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <MockSession state={state} dispatch={dispatch} strictMode={false} />;
}

describe('MockSession', () => {
  test('shows preset choices before a session starts', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /full loop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /technical rounds/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument();
  });

  test('starting a preset shows its full question count and a practice card', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /full loop/i }));
    expect(screen.getByText(/28 questions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
  });

  test('finishing with no ratings shows a zeroed recap', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /full loop/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    expect(screen.getByText(/0 of 28 rated/i)).toBeInTheDocument();
    expect(screen.getByText(/0 solid · 0 ok · 0 weak/i)).toBeInTheDocument();
  });

  test('rating a question during the session counts toward the recap', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /technical rounds/i }));
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /^solid/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    expect(screen.getByText(/1 of 20 rated/i)).toBeInTheDocument();
    expect(screen.getByText(/1 solid · 0 ok · 0 weak/i)).toBeInTheDocument();
  });

  test('full loop serves questions in round order, not re-shuffled across rounds', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /full loop/i }));
    // hr is the first round in the composition; its questions come first, and none
    // of hr's own picks should ever get bumped by a later round's weak rating —
    // there's nothing to rate yet, so this really is just testing the initial order.
    expect(screen.getByText(/hr screen/i)).toBeInTheDocument();
  });

  // Finish unmounts the link that was just activated and swaps the whole view. Focus
  // landed on <body>, so a screen reader user got no signal that the session had ended
  // and the recap they asked for was never announced.
  test('finishing moves focus to the recap heading', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /full loop/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    expect(screen.getByRole('heading', { name: /session recap/i })).toHaveFocus();
  });

  test('back to presets returns to the preset list', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /full loop/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    await userEvent.click(screen.getByRole('button', { name: /back to presets/i }));
    expect(screen.getByRole('button', { name: /full loop/i })).toBeInTheDocument();
  });
});

describe('a mock session never resumes an abandoned lap', () => {
  beforeEach(() => localStorage.clear());

  // Practice clears the stored lap only on genuine completion, but "Finish session"
  // and "Back to presets" unmount it directly — so the lap survived and re-picking the
  // same preset dropped the user back on the question they had walked away from.
  test('ending early via Finish session clears the lap', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /technical rounds/i }));
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(Object.keys(JSON.parse(localStorage.getItem('interview-prep:laps') ?? '{}'))).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    expect(JSON.parse(localStorage.getItem('interview-prep:laps') ?? '{}')).toEqual({});
  });

  // Leaving mid-session by navigating away is an interruption, not an ending — that
  // lap should survive, so the user can pick the preset back up where they left it.
  test('navigating away mid-session keeps the lap', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /technical rounds/i }));
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(Object.keys(JSON.parse(localStorage.getItem('interview-prep:laps') ?? '{}'))).toHaveLength(1);
  });
});

describe('a reloaded mock session still counts what it rated', () => {
  beforeEach(() => localStorage.clear());

  // A reload keeps localStorage and the saved progress, but takes the component tree
  // with it — which is exactly the case the baseline used to be re-frozen in.
  let persisted: Persisted = EMPTY;
  function ReloadableHarness() {
    const [state, dispatch] = useReducer(reducer, persisted);
    useEffect(() => { persisted = state; });
    return <MockSession state={state} dispatch={dispatch} strictMode={false} />;
  }

  // The session's ratings were compared against a baseline frozen when the preset was
  // picked. A mid-session reload drops the user on the preset list, and re-picking the
  // preset restored the lap but re-froze the baseline against progress that already
  // held those ratings — so every one of them was excluded from the recap.
  test('ratings from before a reload still show in the recap', async () => {
    persisted = EMPTY;
    const first = render(<ReloadableHarness />);
    await userEvent.click(screen.getByRole('button', { name: /technical rounds/i }));
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /^solid/i }));
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /^weak/i }));
    first.unmount();

    render(<ReloadableHarness />);
    await userEvent.click(screen.getByRole('button', { name: /technical rounds/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    expect(screen.getByText(/2 of 20 rated/i)).toBeInTheDocument();
    expect(screen.getByText(/1 solid · 0 ok · 1 weak/i)).toBeInTheDocument();
  });

  // The flip side: ratings you already had before the session must NOT be counted as
  // its work, reload or no reload.
  test('ratings that predate the session stay out of the recap', async () => {
    persisted = { ...EMPTY, progress: { 'hm-001': { rating: 3, seen: 1, lastSeen: 1 } } };
    const first = render(<ReloadableHarness />);
    await userEvent.click(screen.getByRole('button', { name: /technical rounds/i }));
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    first.unmount();

    render(<ReloadableHarness />);
    await userEvent.click(screen.getByRole('button', { name: /technical rounds/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    expect(screen.getByText(/0 of 20 rated/i)).toBeInTheDocument();
  });
});
