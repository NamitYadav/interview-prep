import { describe, expect, test, vi } from 'vitest';
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

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <Practice questions={qs} state={state} dispatch={dispatch} />;
}

describe('Practice', () => {
  test('reveal shows answer, key points and follow-ups', async () => {
    render(<Harness />);
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(screen.queryByText('Answer one.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    expect(screen.getByText('Point one')).toBeInTheDocument();
    expect(screen.getByText('Follow one')).toBeInTheDocument();
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
    fireEvent.keyDown(window, { key: 'n' });
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

  test('empty state when no questions', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Practice questions={[]} state={EMPTY} dispatch={() => {}} />);
    expect(screen.getByText(/no questions match/i)).toBeInTheDocument();
  });
});
