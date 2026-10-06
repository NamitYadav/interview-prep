import { forwardConsole } from './compile';
import { createGrader } from './graderCore';
import type { FromGrader, ToGrader } from './protocol';

// The hidden-test runner that src/lib/gradeRun.ts drives. Separate from worker.ts because
// the protocol is: load once, then one message per case, timed by the page.
const scope = self as unknown as {
  postMessage(msg: FromGrader): void;
  addEventListener(type: 'message', fn: (e: MessageEvent<ToGrader>) => void): void;
};
const post = (msg: FromGrader) => scope.postMessage(msg);
const handle = createGrader(post);

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
