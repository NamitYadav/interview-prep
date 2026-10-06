import type { Persisted, Question } from '../types';
import { createGrader } from '../sandbox/graderCore';
import type { FromGrader, ToGrader } from '../sandbox/protocol';

export const EMPTY: Persisted = { version: 2, progress: {}, notes: {}, stories: {} };

// A graded question with one case of each kind, shared by the pad and card tests.
export const algoQ: Question = {
  id: 'algo-900', round: 'algo', category: 'Arrays & hashing', scratch: true,
  question: 'Sum', statement: 'Return the sum of A.',
  code: 'function solution(A: number[]): number {\n  return 0;\n}',
  grader: {
    fn: 'solution',
    reference: (A: number[]) => A.reduce((s, v) => s + v, 0),
    cases: [
      { name: 'example', kind: 'example', args: [[1, 2]], expected: 3 },
      { name: 'empty', kind: 'correctness', args: [[]], expected: 0 },
      { name: 'large', kind: 'performance', gen: () => [[5, 5]] },
    ],
  },
  answer: ['a'], keyPoints: ['O(N)'],
};

// jsdom has no Worker. This one runs the real grader core in-process, clones in both
// directions like postMessage, and answers asynchronously. `hangLoad` / `hangOn` simulate a
// pad that never finishes loading / a case that never returns, without spinning the test.
// `holdOn` computes a case's answer but keeps it in flight until `release()`, which delivers
// it even after terminate(): the late message a real worker can still have queued.
export class FakeGraderWorker {
  static instances: FakeGraderWorker[] = [];
  static loads: string[] = [];
  static hangLoad = false;
  static hangOn: ((i: number) => boolean) | undefined;
  static holdOn: ((i: number) => boolean) | undefined;
  static reset() {
    FakeGraderWorker.instances = [];
    FakeGraderWorker.loads = [];
    FakeGraderWorker.hangLoad = false;
    FakeGraderWorker.hangOn = undefined;
    FakeGraderWorker.holdOn = undefined;
  }
  onmessage: ((e: MessageEvent<unknown>) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  terminated = false;
  held: unknown[] = [];
  private handle = createGrader((msg: FromGrader) => {
    const data = structuredClone(msg);
    if (msg.type === 'result' && FakeGraderWorker.holdOn?.(msg.i)) {
      this.held.push(data);
      return;
    }
    void Promise.resolve().then(() => {
      if (!this.terminated) this.onmessage?.({ data } as MessageEvent<unknown>);
    });
  });
  constructor() {
    FakeGraderWorker.instances.push(this);
  }
  postMessage(msg: ToGrader) {
    if (this.terminated) return;
    if (msg.type === 'load') {
      FakeGraderWorker.loads.push(msg.code);
      if (FakeGraderWorker.hangLoad) return;
    }
    if (msg.type === 'case' && FakeGraderWorker.hangOn?.(msg.i)) return;
    this.handle(structuredClone(msg));
  }
  release() {
    for (const data of this.held.splice(0)) this.onmessage?.({ data } as MessageEvent<unknown>);
  }
  terminate() {
    this.terminated = true;
  }
}
