// Messages between ScratchPad (parent) and the sandbox page. Both sides post with
// targetOrigin '*': the frame's origin is opaque, so nothing else is possible, and nothing
// here is secret. Authenticity comes from checking `event.source`, not the origin.
export type LogLevel = 'log' | 'info' | 'warn' | 'error';

export type ToSandbox = { type: 'run'; code: string; preview?: string };

export type FromSandbox =
  | { type: 'ready' }
  | { type: 'log'; level: LogLevel; text: string }
  | { type: 'error'; text: string }
  | { type: 'done' };

// The grader worker (src/sandbox/grader.ts): one `load`, then one `case` at a time, so the
// page can time each case and terminate the worker on the one that hangs.
export type ToGrader =
  | { type: 'load'; code: string; fn: string; console: boolean }
  | { type: 'case'; i: number; args: unknown[] };

export type FromGrader =
  | { type: 'loaded' }
  | { type: 'load-error'; text: string }
  | { type: 'result'; i: number; ok: true; value: unknown; ms: number }
  | { type: 'result'; i: number; ok: false; error: string; ms: number }
  | { type: 'log'; level: LogLevel; text: string };
