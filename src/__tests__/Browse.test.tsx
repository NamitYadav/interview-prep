import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Question } from '../types';
import { EMPTY } from './helpers';
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

  test('search matches deeper material, not just the answer', async () => {
    const withDeeper: Question[] = [
      ...qs,
      { id: 'hm-003', round: 'hm', category: 'Frontend', question: 'Where do you store an auth token?', answer: ['Answer three.'], deeper: ['Refresh tokens must rotate on every use.'], keyPoints: ['Point three'] },
    ];
    function DeeperHarness() {
      const [state, dispatch] = useReducer(reducer, EMPTY);
      return <Browse questions={withDeeper} state={state} dispatch={dispatch} />;
    }
    render(<DeeperHarness />);
    const search = screen.getByPlaceholderText(/search questions/i);
    await userEvent.type(search, 'rotate');
    expect(screen.getByText('Where do you store an auth token?')).toBeInTheDocument();
    expect(screen.queryByText('How do you design a rate limiter?')).not.toBeInTheDocument();
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

  test('the row button toggles the answer and reports aria-expanded', async () => {
    render(<Harness />);
    const row = screen.getByRole('button', { name: /debounce/i });
    await userEvent.click(row);
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    expect(row).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(row);
    expect(screen.queryByText('Answer one.')).not.toBeInTheDocument();
    expect(row).toHaveAttribute('aria-expanded', 'false');
  });

  test('rating a question updates its badge in the collapsed row', async () => {
    render(<Harness />);
    const row = screen.getByRole('button', { name: /debounce/i });
    await userEvent.click(row);
    await userEvent.click(screen.getByRole('radio', { name: /^solid/i }));
    await userEvent.click(row);
    expect(row).toHaveTextContent('Solid');
  });
});
