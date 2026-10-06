import { formatArgs, forwardConsole } from './compile';
import { createGrader } from './graderCore';
import type { FromGrader, ToGrader } from './protocol';

// The hidden-test runner that src/lib/gradeRun.ts drives. Separate from worker.ts because
// the protocol is: load once, then one message per case, timed by the page.
const scope = self as unknown as {
  postMessage(msg: FromGrader): void;
  addEventListener(type: 'message', fn: (e: MessageEvent<ToGrader>) => void): void;
  addEventListener(type: 'error', fn: (e: ErrorEvent) => void): void;
};
const post = (msg: FromGrader) => scope.postMessage(msg);
const handle = createGrader(post);

// A throw from a pad's setTimeout or microtask lands here after its case has already
// answered. Unhandled, it fires the page's Worker `error`, which gradeRun reads as "the
// grader did not start" and abandons every remaining case — same guard as worker.ts.
scope.addEventListener('error', (e) => {
  e.preventDefault();
  post({ type: 'log', level: 'error', text: formatArgs([e.error ?? e.message]) });
});

scope.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg?.type === 'load') {
    // Run examples shows your console; Submit mutes it, so a log inside a loop over 100,000
    // items costs nothing and floods nothing.
    if (msg.console) forwardConsole((m) => { if (m.type === 'log') post(m); });
    else for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) console[level] = () => {};
  }
  if (msg?.type === 'load' || msg?.type === 'case') handle(msg);
});
