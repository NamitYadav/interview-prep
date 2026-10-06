import type { FromGrader, LogLevel, ToGrader } from '../sandbox/protocol';
import { judge, type BuiltCase, type CaseResult } from './grade';

// A pad whose top level never returns (`while (true)` outside the function) would otherwise
// leave the run waiting on `loaded` forever.
export const LOAD_LIMIT_MS = 3000;

interface GradeCallbacks {
  onDone: (results: CaseResult[]) => void;
  /** The pad did not compile, did not define the function, or did not finish loading. */
  onLoadError: (text: string) => void;
  onResult?: (result: CaseResult) => void;
  onLog?: (level: LogLevel, text: string) => void;
  /** Forward the pad's console (Run examples) instead of muting it (Submit). */
  console?: boolean;
}

// Drives src/sandbox/grader.ts one case at a time. The timer lives here, on the page's
// thread, because a synchronous O(N²) loop inside the worker cannot be interrupted from
// inside it: on timeout the worker is terminated, the case recorded as a timeout, and a fresh
// worker loads the pad again for the next case. Returns a cancel function.
export function gradeRun(code: string, fn: string, cases: BuiltCase[], cb: GradeCallbacks): () => void {
  let worker: Worker | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let i = 0;
  let stopped = false;
  const results: CaseResult[] = [];

  const kill = () => {
    clearTimeout(timer);
    worker?.terminate();
    worker = null;
  };
  const fail = (text: string) => {
    stopped = true;
    kill();
    cb.onLoadError(text);
  };
  const record = (result: CaseResult) => {
    results.push(result);
    cb.onResult?.(result);
    i++;
    next();
  };

  const start = () => {
    const w = new Worker(new URL('../sandbox/grader.ts', import.meta.url), { type: 'module' });
    worker = w;
    w.onmessage = (e: MessageEvent<unknown>) => {
      // A terminated worker can still have a message in flight; only the live one counts.
      if (stopped || w !== worker) return;
      const msg = e.data as { type?: unknown } | null;
      if (typeof msg !== 'object' || msg === null) return;
      if (msg.type === 'loaded') {
        clearTimeout(timer);
        next();
      } else if (msg.type === 'load-error') {
        fail(String((msg as Extract<FromGrader, { type: 'load-error' }>).text));
      } else if (msg.type === 'log') {
        const log = msg as Extract<FromGrader, { type: 'log' }>;
        cb.onLog?.(log.level, String(log.text));
      } else if (msg.type === 'result') {
        const r = msg as Extract<FromGrader, { type: 'result' }>;
        if (r.i !== i) return;
        clearTimeout(timer);
        record(judge(cases[i]!, r.ok ? { value: r.value, ms: r.ms } : { error: String(r.error), ms: r.ms }));
      }
    };
    w.onerror = () => fail('The grader did not start — check the browser console.');
    timer = setTimeout(
      () => fail(`Your code did not finish loading within ${LOAD_LIMIT_MS / 1000}s — is something running at the top level?`),
      LOAD_LIMIT_MS,
    );
    w.postMessage({ type: 'load', code, fn, console: cb.console ?? false } satisfies ToGrader);
  };

  const next = () => {
    if (stopped) return;
    if (i >= cases.length) {
      stopped = true;
      kill();
      cb.onDone(results);
      return;
    }
    if (!worker) {
      start();
      return;
    }
    const c = cases[i]!;
    timer = setTimeout(() => {
      kill();
      record(judge(c, 'timeout'));
    }, c.limitMs);
    worker.postMessage({ type: 'case', i, args: c.args } satisfies ToGrader);
  };

  next();
  return () => {
    stopped = true;
    kill();
  };
}
