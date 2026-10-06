import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Grader } from '../types';
import { buildCases } from '../lib/grade';
import { LOAD_LIMIT_MS, gradeRun } from '../lib/gradeRun';
import { FakeGraderWorker } from './helpers';

const grader: Grader = {
  fn: 'solution',
  reference: (A: number[]) => [...A].sort((x, y) => x - y),
  cases: [
    { name: 'a', kind: 'example', args: [[3, 1, 2]] },
    { name: 'b', kind: 'correctness', args: [[2, 1]] },
    { name: 'c', kind: 'performance', limitMs: 100, args: [[1]] },
  ],
};
const cases = buildCases(grader, 'algo-900');
const SORT = 'function solution(A: number[]) { return [...A].sort((x, y) => x - y); }';

beforeEach(() => {
  FakeGraderWorker.reset();
  vi.stubGlobal('Worker', FakeGraderWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const run = (code: string, extra: Partial<Parameters<typeof gradeRun>[3]> = {}) => {
  const onDone = vi.fn();
  const onLoadError = vi.fn();
  const cancel = gradeRun(code, 'solution', cases, { onDone, onLoadError, ...extra });
  return { onDone, onLoadError, cancel };
};

describe('gradeRun', () => {
  test('a correct solution passes every case, in order, on one worker', async () => {
    const { onDone } = run(SORT);
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0]![0].map((r: { status: string }) => r.status)).toEqual(['pass', 'pass', 'pass']);
    expect(FakeGraderWorker.instances).toHaveLength(1);
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
  });

  test('a solution that sorts its input in place is judged against untouched args', async () => {
    const { onDone } = run('function solution(A: number[]) { return A.sort((x, y) => x - y); }');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0]![0].every((r: { status: string }) => r.status === 'pass')).toBe(true);
  });

  test('an arrow-function solution with a helper loads', async () => {
    const { onDone } = run('const by = (x: number, y: number) => x - y;\nconst solution = (A: number[]) => [...A].sort(by);');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0]![0].every((r: { status: string }) => r.status === 'pass')).toBe(true);
  });

  test('a throw is an error result, not the end of the run', async () => {
    const { onDone } = run('function solution(A: number[]) { if (A.length === 2) throw new RangeError("boom"); return [...A].sort((x, y) => x - y); }');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const [a, b, c] = onDone.mock.calls[0]![0];
    expect([a.status, b.status, b.detail, c.status]).toEqual(['pass', 'error', 'RangeError: boom', 'pass']);
  });

  test('a missing function is one load error', async () => {
    const { onDone, onLoadError } = run('function other() {}');
    await vi.waitFor(() => expect(onLoadError).toHaveBeenCalledWith('Define a function named solution.'));
    expect(onDone).not.toHaveBeenCalled();
  });

  test('a case past its limit is a timeout; the worker is replaced and the run goes on', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    FakeGraderWorker.hangOn = (i) => i === 1;
    const { onDone } = run(SORT);
    await vi.advanceTimersByTimeAsync(2000);
    expect(onDone).toHaveBeenCalled();
    expect(onDone.mock.calls[0]![0].map((r: { status: string }) => r.status)).toEqual(['pass', 'timeout', 'pass']);
    expect(FakeGraderWorker.instances).toHaveLength(2);
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
  });

  test('a pad that never finishes loading ends with a load error, not a spinner', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    FakeGraderWorker.hangLoad = true;
    const { onDone, onLoadError } = run(SORT);
    await vi.advanceTimersByTimeAsync(LOAD_LIMIT_MS + 1);
    expect(onLoadError).toHaveBeenCalledWith(expect.stringMatching(/did not finish loading/));
    expect(onDone).not.toHaveBeenCalled();
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
  });

  test('cancel terminates the worker and nothing is reported afterwards', async () => {
    const onResult = vi.fn();
    const { onDone, cancel } = run(SORT, { onResult });
    cancel();
    await new Promise((r) => setTimeout(r, 20));
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
    expect(onResult).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  test('a late message from the replaced worker is ignored while the run is live on the new one', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    FakeGraderWorker.holdOn = (i) => i >= 1;
    const onResult = vi.fn();
    const onLog = vi.fn();
    const { onDone } = run(SORT, { onResult, onLog });
    // Case 1 times out at its 1500ms limit; case 2 is then in flight on the replacement worker.
    await vi.advanceTimersByTimeAsync(1500);
    const [stale, live] = FakeGraderWorker.instances as [FakeGraderWorker, FakeGraderWorker];
    expect(stale.terminated).toBe(true);
    expect(live.held).toHaveLength(1);
    expect(onDone).not.toHaveBeenCalled();
    // Only the worker the run is on counts: the terminated one's answer and console line drop.
    stale.release();
    stale.onmessage?.({ data: { type: 'log', level: 'log', text: 'late' } } as MessageEvent<unknown>);
    expect(onLog).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledTimes(2);
    live.release();
    expect(onDone.mock.calls[0]![0].map((r: { status: string }) => r.status)).toEqual(['pass', 'timeout', 'pass']);
  });

  test('cancel with a result in flight reports nothing', async () => {
    FakeGraderWorker.holdOn = () => true;
    const onResult = vi.fn();
    const { onDone, cancel } = run(SORT, { onResult });
    await vi.waitFor(() => expect(FakeGraderWorker.instances[0]!.held).toHaveLength(1));
    cancel();
    FakeGraderWorker.instances[0]!.release();
    await new Promise((r) => setTimeout(r, 20));
    expect(onResult).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(FakeGraderWorker.instances).toHaveLength(1);
  });
});
