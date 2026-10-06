import * as React from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { compile, formatArgs, forwardConsole } from './compile';
import type { FromSandbox, ToSandbox } from './protocol';

const post = (msg: FromSandbox) => window.parent.postMessage(msg, '*');

const root = createRoot(document.getElementById('root')!);

forwardConsole(post);

// Async failures never pass through the try/catch below: a rejected promise in the pad,
// or a throw inside a React event handler / effect, surfaces here instead.
window.addEventListener('error', (e) => post({ type: 'error', text: formatArgs([e.error ?? e.message]) }));
window.addEventListener('unhandledrejection', (e) => post({ type: 'error', text: formatArgs([e.reason]) }));

// This page is also served from the app's real origin. Framed by any other site without
// the sandbox attribute, that site would be `window.parent` and could run code here with
// the origin's localStorage. Only the app's `sandbox="allow-scripts"` frame has an opaque
// origin — `window.origin`, not `location.origin`, which still reports the URL's.
const sandboxed = window.origin === 'null';

window.addEventListener('message', (e: MessageEvent<ToSandbox>) => {
  if (!sandboxed || e.source !== window.parent || e.data?.type !== 'run') return;
  try {
    const compiled = compile(e.data.code, e.data.preview);
    new Function('React', '__render', compiled)(React, (el: ReactNode) => root.render(el));
  } catch (err) {
    post({ type: 'error', text: formatArgs([err]) });
  }
  post({ type: 'done' });
});

post({ type: 'ready' });
