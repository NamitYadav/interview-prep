import { describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Persisted } from '../types';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { StoriesView } from '../components/StoriesView';

const withStory = (title: string, body: string, lastRehearsed?: number): Persisted => ({
  ...EMPTY,
  stories: { s1: { title, body, lastRehearsed } },
});

function Harness({ initial }: { initial: Persisted }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <StoriesView state={state} dispatch={dispatch} />;
}

describe('StoriesView', () => {
  test('shows an empty state when there are no stories', () => {
    render(<Harness initial={EMPTY} />);
    expect(screen.getByText(/no stories yet/i)).toBeInTheDocument();
  });

  test('lists a story with its rehearsed status', () => {
    render(<Harness initial={withStory('The migration', 'Situation...')} />);
    expect(screen.getByDisplayValue('The migration')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Situation...')).toBeInTheDocument();
    expect(screen.getByText(/never rehearsed/i)).toBeInTheDocument();
  });

  test('shows a rehearsed date once marked', () => {
    render(<Harness initial={withStory('Title', 'Body', Date.now())} />);
    expect(screen.getByText(/last rehearsed today/i)).toBeInTheDocument();
  });

  test('adding a story creates an empty editable card', async () => {
    render(<Harness initial={EMPTY} />);
    await userEvent.click(screen.getByRole('button', { name: /new story/i }));
    expect(screen.getByPlaceholderText(/story title/i)).toBeInTheDocument();
    expect(screen.queryByText(/no stories yet/i)).not.toBeInTheDocument();
  });

  test('editing title then body within the same debounce window commits both, not just the last one', () => {
    vi.useFakeTimers();
    try {
      render(<Harness initial={withStory('', '')} />);
      fireEvent.change(screen.getByLabelText(/story title/i), { target: { value: 'Migration' } });
      fireEvent.change(screen.getByLabelText(/story body/i), { target: { value: 'Situation...' } });
      act(() => vi.advanceTimersByTime(300));
      expect(screen.getByLabelText(/story title/i)).toHaveValue('Migration');
      expect(screen.getByLabelText(/story body/i)).toHaveValue('Situation...');
    } finally {
      vi.useRealTimers();
    }
  });

  test('deleting a story asks for confirmation and removes it on accept', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Harness initial={withStory('Title', 'Body')} />);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByDisplayValue('Title')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/no stories yet/i)).toBeInTheDocument();
  });
});
