import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Question } from '../types';
import { EMPTY } from '../lib/storage';
import { reducer } from '../hooks/useAppState';
import { Practice } from '../components/Practice';

const qs: Question[] = [
  { id: 'hm-001', round: 'hm', category: 'A', question: 'First question?', answer: ['Answer one.'], keyPoints: ['Point one'], followUps: ['Follow one'] },
  { id: 'hm-002', round: 'hm', category: 'A', question: 'Second question?', answer: ['Answer two.'], keyPoints: ['Point two'] },
];

const qs3: Question[] = [
  ...qs,
  { id: 'hm-003', round: 'hm', category: 'A', question: 'Third question?', answer: ['Answer three.'], keyPoints: ['Point three'] },
];

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <Practice questions={qs} state={state} dispatch={dispatch} strictMode={false} />;
}

function Harness3() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <Practice questions={qs3} state={state} dispatch={dispatch} strictMode={false} />;
}

const rateVisible = async () => {
  await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
  await userEvent.click(screen.getByRole('button', { name: /solid/i }));
};

describe('Practice', () => {
  test('reveal shows answer and key points; follow-ups stay gated until asked for', async () => {
    render(<Harness />);
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(screen.queryByText('Answer one.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    expect(screen.getByText('Point one')).toBeInTheDocument();
    expect(screen.queryByText('Follow one')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /answer the follow-up/i }));
    expect(screen.getByText('Follow one')).toBeInTheDocument();
  });

  test('reveal moves focus into the answer instead of dropping it to body', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    const answer = screen.getByText('Answer one.').parentElement?.parentElement;
    expect(answer).toHaveFocus();
  });

  test('rating advances to the next question and hides the answer', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('button', { name: /solid/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    expect(screen.queryByText('Answer two.')).not.toBeInTheDocument();
  });

  test('keyboard: space reveals, 2 rates, n skips', async () => {
    render(<Harness />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: '2' });
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    // Both questions have now been shown this lap — skipping the second ends the lap
    // rather than silently wrapping back to the first.
    fireEvent.keyDown(window, { key: 'n' });
    expect(screen.getByText(/lap done/i)).toBeInTheDocument();
  });

  test('a lap ends once every question has been shown, with a way to start another', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('button', { name: /solid/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('button', { name: /solid/i }));

    expect(screen.getByText(/lap done/i)).toBeInTheDocument();
    expect(screen.getByText(/2 solid/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /start another lap/i }));
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('keyboard shortcuts are ignored inside the note textarea', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    const note = screen.getByRole('textbox', { name: /your note/i });
    await userEvent.type(note, 'n2 ');
    expect(note).toHaveValue('n2 ');
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('space activates a focused button instead of being swallowed by the global reveal shortcut', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /reveal/i }));
    screen.getByRole('button', { name: /solid/i }).focus();
    await user.keyboard(' ');
    expect(screen.getByText('Second question?')).toBeInTheDocument();
  });

  test('back returns to the previous question, revealed, and is disabled on the first', async () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('button', { name: /solid/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /solid/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
  });

  test('keyboard: b goes back', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('button', { name: /solid/i }));
    fireEvent.keyDown(window, { key: 'b' });
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('advancing after a Back overwrites the old forward path instead of replaying it', async () => {
    render(<Harness3 />);
    await rateVisible(); // Q1 -> Q2
    await rateVisible(); // Q2 -> Q3
    expect(screen.getByText('Third question?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /back/i })); // -> Q2
    expect(screen.getByText('Second question?')).toBeInTheDocument();

    // Back leaves the card already revealed, so re-rating needs no Reveal click.
    await userEvent.click(screen.getByRole('button', { name: /solid/i })); // Q2 -> should reach Q3 again, not repeat it
    expect(screen.getByText('Third question?')).toBeInTheDocument();

    await rateVisible(); // every question shown once now -> lap done
    expect(screen.getByText(/lap done/i)).toBeInTheDocument();
  });

  test('starting another lap resets history so Back is disabled again on its first question', async () => {
    render(<Harness />);
    await rateVisible(); // Q1 -> Q2
    await rateVisible(); // Q2 -> lap done
    expect(screen.getByText(/lap done/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /start another lap/i }));
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
  });

  test('empty state when no questions', () => {
    render(<Practice questions={[]} state={EMPTY} dispatch={() => {}} strictMode={false} />);
    expect(screen.getByText(/no questions match/i)).toBeInTheDocument();
  });
});
