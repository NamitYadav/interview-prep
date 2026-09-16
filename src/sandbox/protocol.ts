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
