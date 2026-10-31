import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { LoggedQuestion, Persisted } from '../types';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { LogView } from '../components/LogView';
import App from '../App';

beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0); });
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.location.hash = '';
  localStorage.clear();
});

const day = (d: number, h = 12) => new Date(2026, 9, d, h).getTime();
const logged = (question: string, at: number, round: LoggedQuestion['round'] = 'hm'): LoggedQuestion => ({ question, round, answer: '', at });

function Harness({ initial }: { initial: Persisted }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <LogView state={state} dispatch={dispatch} strictMode={false} role="staff" />;
}

describe('LogView', () => {
  test('shows the empty state and no drill button with nothing logged', () => {
    render(<Harness initial={EMPTY} />);
    expect(screen.getByText(/nothing logged yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Drill these' })).toBeNull();
  });

  test('add, type, reload: the question is kept', async () => {
    window.location.hash = '#log';
    const { unmount } = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    expect(screen.getByLabelText('Question')).toHaveFocus();
    await userEvent.type(screen.getByLabelText('Question'), 'Why leave your job?');
    fireEvent.blur(screen.getByLabelText('Question'));
    unmount();
    render(<App />);
    expect(screen.getByDisplayValue('Why leave your job?')).toBeInTheDocument();
  });

  test("a new entry takes the previous entry's round", async () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Old', day(1), 'design'), b: logged('Newer', day(2), 'backend') } }} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    expect(screen.getAllByLabelText('Round').map((s) => (s as HTMLSelectElement).value)).toContain('backend');
    const fresh = screen.getByLabelText('Question', { selector: ':focus' });
    expect(within(fresh.closest('li')!).getByLabelText('Round')).toHaveValue('backend');
  });

  test('a new entry in an empty log defaults to the hiring manager round', async () => {
    render(<Harness initial={EMPTY} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    expect(screen.getByLabelText('Round')).toHaveValue('hm');
  });

  test('entries group under their day, newest first', () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('First day', day(20)), b: logged('Second day, early', day(22, 9)), c: logged('Second day, late', day(22, 15)) } }} />);
    const groups = screen.getAllByRole('heading', { level: 2 });
    expect(groups).toHaveLength(2);
    const values = screen.getAllByLabelText('Question').map((t) => (t as HTMLTextAreaElement).value);
    expect(values).toEqual(['Second day, late', 'Second day, early', 'First day']);
  });

  test('a picked date is the local day and moves the entry', () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Q', day(22)) } }} />);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-21' } });
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-21');
  });

  test('the date input stops at today', () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Q', day(22)) } }} />);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    expect(screen.getByLabelText('Date')).toHaveAttribute('max', `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`);
  });

  test('Drill these serves weak before solid and skips empty questions', async () => {
    const now = Date.now();
    render(<Harness initial={{
      ...EMPTY,
      log: { s: logged('Solid one', day(1)), w: logged('Weak one', day(2)), e: logged('  ', day(3)) },
      progress: { 'log:s': { rating: 3, seen: 1, lastSeen: now }, 'log:w': { rating: 1, seen: 1, lastSeen: now } },
    }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Drill these' }));
    expect(screen.getByRole('heading', { name: 'Weak one' })).toBeInTheDocument();
    expect(screen.getByText(/of 2/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to the list' }));
    expect(screen.getByRole('button', { name: '+ Add question' })).toBeInTheDocument();
  });

  test('Delete asks first, and removes the entry once confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Q', day(22)) } }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(confirm).toHaveBeenCalledWith('Delete this question?');
    expect(screen.getByDisplayValue('Q')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByDisplayValue('Q')).toBeNull();
  });

  test('deleting with an edit still pending does not bring the entry back', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Q', day(22)) } }} />);
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'half typed' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Delete' })); });
    expect(screen.queryByLabelText('Question')).toBeNull();
    expect(screen.getByText(/nothing logged yet/i)).toBeInTheDocument();
  });

  test('typing a date key by key saves only the finished date, on blur', () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Q', day(22)) } }} />);
    const input = screen.getByLabelText('Date');
    fireEvent.change(input, { target: { value: '0002-10-29' } });
    // Not saved yet: the card stays put, so the input keeps focus and identity.
    expect(screen.getByLabelText('Date')).toBe(input);
    fireEvent.change(input, { target: { value: '2026-10-21' } });
    fireEvent.blur(input);
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-21');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('21');
  });

  test('an implausible date is not saved', () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Q', day(22)) } }} />);
    const input = screen.getByLabelText('Date');
    fireEvent.change(input, { target: { value: '0002-10-29' } });
    fireEvent.blur(input);
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-22');
  });

  test('re-dating a new card does not pull focus back to its question', async () => {
    render(<Harness initial={EMPTY} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    const input = screen.getByLabelText('Date');
    input.focus();
    fireEvent.change(input, { target: { value: '2026-01-05' } });
    fireEvent.blur(input);
    expect(screen.getByLabelText('Question')).not.toHaveFocus();
  });

  test('re-dating keeps the time of day, so the entry keeps its place in the day', () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Early', day(21, 9)), b: logged('Late', day(22, 15)) } }} />);
    const late = screen.getByDisplayValue('Late').closest('li')!;
    const date = within(late).getByLabelText('Date');
    fireEvent.change(date, { target: { value: '2026-10-21' } });
    fireEvent.blur(date);
    expect(screen.getAllByLabelText('Question').map((t) => (t as HTMLTextAreaElement).value)).toEqual(['Late', 'Early']);
  });

  test('Enter on a new date keeps focus on the moved card', () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Q', day(22)) } }} />);
    const input = screen.getByLabelText('Date');
    input.focus();
    fireEvent.change(input, { target: { value: '2026-10-21' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByLabelText('Date')).toHaveValue('2026-10-21');
    expect(screen.getByLabelText('Date')).toHaveFocus();
  });

  test('tabbing from a new date to the answer lands on the answer after the move', () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Q', day(22)) } }} />);
    const input = screen.getByLabelText('Date');
    fireEvent.change(input, { target: { value: '2026-10-21' } });
    fireEvent.blur(input, { relatedTarget: screen.getByLabelText('Your answer') });
    expect(screen.getByLabelText('Your answer')).toHaveFocus();
  });

  test('a picked date is saved when the tab is hidden before blur', () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Q', day(22)) } }} />);
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-21' } });
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('21');
  });

  test('a new entry takes the round last picked here, not the newest date', async () => {
    render(<Harness initial={{ ...EMPTY, log: { a: logged('Today, HR', Date.now(), 'hr') } }} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    const fresh = screen.getByLabelText('Question', { selector: ':focus' }).closest('li')!;
    fireEvent.change(within(fresh).getByLabelText('Round'), { target: { value: 'design' } });
    const date = within(fresh).getByLabelText('Date');
    fireEvent.change(date, { target: { value: '2026-01-05' } });
    fireEvent.blur(date);
    await userEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    const next = screen.getByLabelText('Question', { selector: ':focus' }).closest('li')!;
    expect(within(next).getByLabelText('Round')).toHaveValue('design');
  });
});

