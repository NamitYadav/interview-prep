import { compile, formatArgs } from './compile';
import type { FromGrader, ToGrader } from './protocol';

// The grader worker's message handling, kept free of `self` so the tests drive this same
// code in-process (FakeGraderWorker in src/__tests__/helpers.ts). One pad per worker:
// `load` compiles it once, then each `case` calls the named function with that case's args.
export function createGrader(post: (msg: FromGrader) => void): (msg: ToGrader) => void {
  let solution: ((...args: unknown[]) => unknown) | undefined;
  return (msg) => {
    if (msg.type === 'load') {
      try {
        // A declaration inside `new Function` is local to it, so the body hands the named
        // function back instead of it being looked up on globalThis. That also makes
        // `const solution = (A) => …` work exactly like `function solution`.
        const found: unknown = new Function('React', `${compile(msg.code)}\n;return typeof ${msg.fn} === 'function' ? ${msg.fn} : undefined;`)({});
        if (typeof found !== 'function') {
          post({ type: 'load-error', text: `Define a function named ${msg.fn}.` });
          return;
        }
        solution = found as (...args: unknown[]) => unknown;
        post({ type: 'loaded' });
      } catch (err) {
        post({ type: 'load-error', text: formatArgs([err]) });
      }
      return;
    }
    if (!solution) return;
    const t0 = performance.now();
    let value: unknown;
    try {
      value = solution(...msg.args);
    } catch (err) {
      post({ type: 'result', i: msg.i, ok: false, error: formatArgs([err]), ms: performance.now() - t0 });
      return;
    }
    const ms = performance.now() - t0;
    // postMessage structured-clones; a returned function or Promise throws here, and that
    // is the solution's fault, not the grader's.
    try {
      post({ type: 'result', i: msg.i, ok: true, value, ms });
    } catch (err) {
      post({ type: 'result', i: msg.i, ok: false, error: `The return value could not be sent back: ${formatArgs([err])}`, ms });
    }
  };
}
