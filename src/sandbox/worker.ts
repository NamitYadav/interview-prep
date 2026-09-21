import * as React from 'react';
import { compile, formatArgs } from './compile';
import type { FromSandbox, ToSandbox } from './protocol';

// The runner for console-only starters: a dedicated Worker instead of the sandbox frame.
// Same compile step, same console shim, same message shape as src/sandbox/main.tsx, minus
// the React root — there is nothing to render. What the worker buys over the frame: it is
// terminable everywhere (`worker.terminate()` ends a `while (true)` in Firefox and Safari
// too, where the opaque-origin frame shares the tab's process and freezes it), and it is a
// same-origin script the service worker precaches, so Run works offline. Starters that need
// the DOM (`needsDom`) or a preview keep using the frame.
//
// React's exports are exposed as globals the same way the frame does, so a starter that
// defines a hook compiles and its non-hook parts run; calling a hook outside a renderer
// throws the same "Invalid hook call" it would in the frame with no preview mounted.

// The DOM lib types `self` as a Window, whose postMessage wants a target origin. This is
// the whole surface the worker uses, typed for what it actually is.
const scope = self as unknown as {
  postMessage(msg: FromSandbox): void;
  addEventListener(type: 'message', fn: (e: MessageEvent<ToSandbox>) => void): void;
  addEventListener(type: 'error', fn: (e: ErrorEvent) => void): void;
  addEventListener(type: 'unhandledrejection', fn: (e: PromiseRejectionEvent) => void): void;
};

const post = (msg: FromSandbox) => scope.postMessage(msg);

for (const level of ['log', 'info', 'warn', 'error'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    original(...args);
    post({ type: 'log', level, text: formatArgs(args) });
  };
}

// preventDefault keeps an uncaught throw from also surfacing as the parent Worker's
// `error` event, which the pad reads as "the runner failed to start".
scope.addEventListener('error', (e) => {
  e.preventDefault();
  post({ type: 'error', text: formatArgs([e.error ?? e.message]) });
});
scope.addEventListener('unhandledrejection', (e) => post({ type: 'error', text: formatArgs([e.reason]) }));

const noPreview = () => console.warn('This starter has no preview — __render does nothing here.');

scope.addEventListener('message', (e) => {
  if (e.data?.type !== 'run') return;
  try {
    new Function('React', '__render', compile(e.data.code))(React, noPreview);
  } catch (err) {
    post({ type: 'error', text: formatArgs([err]) });
  }
  post({ type: 'done' });
});
