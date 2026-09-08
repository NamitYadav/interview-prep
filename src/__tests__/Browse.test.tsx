import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Question } from '../types';
import { EMPTY } from '../lib/storage';
import { reducer } from '../hooks/useAppState';
import { Browse } from '../components/Browse';

const qs: Question[] = [
  { id: 'hm-001', round: 'hm', category: 'Frontend', question: 'How do you debounce a search input?', answer: ['Answer one.'], keyPoints: ['Point one'] },
  { id: 'hm-002', round: 'hm', category: 'Systems', question: 'How do you design a rate limiter?', answer: ['Answer two.'], keyPoints: ['Point two'] },
];

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <Browse questions={qs} state={state} dispatch={dispatch} />;
}

describe('Browse', () => {
  test('lists every question collapsed with a count and no rating', () => {
    render(<Harness />);
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /debounce/i })).toHaveAttribute('aria-expanded', 'false');
  });

  test('search narrows by question text and by category', async () => {
    render(<Harness />);
    const search = screen.getByPlaceholderText(/search questions/i);

    await userEvent.type(search, 'rate limiter');
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rate limiter/i })).toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, 'systems');
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  test('expanding a row reveals the answer and collapse restores the list', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /debounce/i }));
    expect(screen.getByText('Answer one.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /collapse/i }));
    expect(screen.queryByText('Answer one.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /debounce/i })).toBeInTheDocument();
  });

  test('rating a question updates its badge in the collapsed row', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /debounce/i }));
    await userEvent.click(screen.getByRole('button', { name: /^solid/i }));
    await userEvent.click(screen.getByRole('button', { name: /collapse/i }));
    expect(screen.getByRole('button', { name: /debounce/i })).toHaveTextContent('Solid');
  });
});
