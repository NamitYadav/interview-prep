import * as React from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { compile, formatArgs } from './compile';
import type { FromSandbox, ToSandbox } from './protocol';

const post = (msg: FromSandbox) => window.parent.postMessage(msg, '*');

const root = createRoot(document.getElementById('root')!);

// Forward console output to the parent's Output panel. The original still runs so the
// browser devtools show it too.
for (const level of ['log', 'info', 'warn', 'error'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    original(...args);
    post({ type: 'log', level, text: formatArgs(args) });
  };
}

// Async failures never pass through the try/catch below: a rejected promise in the pad,
// or a throw inside a React event handler / effect, surfaces here instead.
window.addEventListener('error', (e) => post({ type: 'error', text: formatArgs([e.error ?? e.message]) }));
window.addEventListener('unhandledrejection', (e) => post({ type: 'error', text: formatArgs([e.reason]) }));

window.addEventListener('message', (e: MessageEvent<ToSandbox>) => {
  if (e.source !== window.parent || e.data?.type !== 'run') return;
  try {
    const compiled = compile(e.data.code, e.data.preview);
    new Function('React', '__render', compiled)(React, (el: ReactNode) => root.render(el));
  } catch (err) {
    post({ type: 'error', text: formatArgs([err]) });
  }
  post({ type: 'done' });
});

post({ type: 'ready' });
