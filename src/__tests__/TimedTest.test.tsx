import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useReducer } from 'react';
import { EMPTY, FakeGraderWorker } from './helpers';
import { reducer } from '../hooks/useAppState';
import { forRole } from '../data';
import { readTimedTest, writeTimedTest } from '../lib/lap';
import { TEST_SECONDS, TimedTest, drawTest, testPending } from '../components/TimedTest';

const pool = forRole('staff').byRound('algo');

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <TimedTest state={state} dispatch={dispatch} role="staff" />;
}

beforeEach(() => {
  localStorage.clear();
  FakeGraderWorker.reset();
  vi.stubGlobal('Worker', FakeGraderWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('drawTest', () => {
  test('draws three tasks from three different categories', () => {
    const tasks = drawTest(pool, {}, () => 0);
    expect(tasks).toHaveLength(3);
    expect(new Set(tasks.map((q) => q.category)).size).toBe(3);
  });

  test('weak tasks come first', () => {
    const weak = pool[pool.length - 1]!;
    const tasks = drawTest(pool, { [weak.id]: { rating: 1, seen: 1, lastSeen: 1 } }, () => 0);
    expect(tasks[0]!.id).toBe(weak.id);
  });
});

describe('TimedTest', () => {
  test('Start test draws three tasks with a switcher, a countdown, and no per-task Submit', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    for (const n of [1, 2, 3]) expect(screen.getByRole('button', { name: `Task ${n}` })).toBeInTheDocument();
    expect(await screen.findByRole('timer')).toHaveTextContent(/Time left: (90:00|89:5\d)/);
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();
    expect(readTimedTest()?.questionIds).toHaveLength(3);
  });

  // padButton's dark:border-zinc-700 used to outrank the active border in the dark themes.
  test('the active task is marked without the idle dark border', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Task 2' }));
    const active = screen.getByRole('button', { name: 'Task 2' });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(active).toHaveClass('border-emerald-500');
    expect(active.className).not.toContain('dark:border-zinc-700');
    expect(screen.getByRole('button', { name: 'Task 1' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('a reload resumes the same tasks', () => {
    const ids = drawTest(pool, {}, () => 0).map((q) => q.id);
    writeTimedTest({ questionIds: ids, startedAt: Date.now() - 60_000, submitted: false });
    render(<Harness />);
    expect(screen.getByRole('heading', { name: pool.find((q) => q.id === ids[0])!.question })).toBeInTheDocument();
  });

  test('a session past twice its length is dropped', () => {
    writeTimedTest({ questionIds: drawTest(pool, {}, () => 0).map((q) => q.id), startedAt: Date.now() - 2 * TEST_SECONDS * 1000 - 1, submitted: false });
    render(<Harness />);
    expect(screen.getByRole('button', { name: /start test/i })).toBeInTheDocument();
  });

  test('Submit test asks first, and Cancel keeps the test running', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit test/i }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(readTimedTest()?.submitted).toBe(false);
    expect(screen.getByRole('button', { name: /submit test/i })).toBeInTheDocument();
  });

  test('Submit test grades all three, offers ratings, and moves focus to the results', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit test/i }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: /^Task 1:/ }));
    expect(await screen.findAllByRole('region', { name: 'Test report' }, { timeout: 5000 })).toHaveLength(3);
    expect(screen.getAllByRole('radiogroup')).toHaveLength(3);
    expect(readTimedTest()?.submitted).toBe(true);
  });

  test('the clock running out submits, including code typed under 300ms before it', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    const ids = drawTest(pool, {}, () => 0).map((q) => q.id);
    writeTimedTest({ questionIds: ids, startedAt: Date.now() - TEST_SECONDS * 1000 + 1000, submitted: false });
    render(<Harness />);
    act(() => { vi.advanceTimersByTime(800); });
    fireEvent.change(screen.getByRole('textbox', { name: /scratch editor/i }), { target: { value: '// LAST SECOND\nfunction solution() { return 0; }' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(readTimedTest()?.submitted).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(FakeGraderWorker.loads[0]).toContain('// LAST SECOND');
    expect(confirm).not.toHaveBeenCalled();
  });

  test('New test clears the session and the test drafts', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /scratch editor/i }), { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: /submit test/i }));
    fireEvent.click(await screen.findByRole('button', { name: /new test/i }));
    expect(readTimedTest()).toBeUndefined();
    expect(localStorage.getItem('interview-prep:drafts') ?? '').not.toContain(':test');
  });
});

describe('testPending', () => {
  test('until it is handed in or abandoned', () => {
    const base = { questionIds: ['a'], startedAt: Date.now() - 60_000, submitted: false };
    expect(testPending(base)).toBe(true);
    expect(testPending({ ...base, submitted: true })).toBe(false);
    // Past zero but not abandoned: reopened so it gets handed in and graded.
    expect(testPending({ ...base, startedAt: Date.now() - TEST_SECONDS * 1000 - 1 })).toBe(true);
    expect(testPending({ ...base, startedAt: Date.now() - 2 * TEST_SECONDS * 1000 - 1 })).toBe(false);
    expect(testPending(undefined)).toBe(false);
  });
});
