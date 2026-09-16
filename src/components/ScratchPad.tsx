import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Question } from '../types';
import { DRAFT_SAVE_FAILED, useDraft } from '../hooks/useDraft';
import { draftKey } from '../lib/drafts';
import type { FromSandbox, LogLevel, ToSandbox } from '../sandbox/protocol';

// Same host as the app, so it works in dev, `vite preview` and on GitHub Pages alike.
// `allow-scripts` without `allow-same-origin` makes the frame's origin opaque: the pad's
// code cannot read the app's localStorage or DOM.
const SANDBOX_URL = `${import.meta.env.BASE_URL}sandbox.html`;

const button = 'rounded border border-zinc-300 px-3 py-1 text-sm hover:border-emerald-500 dark:border-zinc-700';
const mono = 'rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800';
const warnText = 'text-amber-700 dark:text-amber-400';
const modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

type Line = { level: LogLevel; text: string };

// ponytail: a synchronous `while (true)` in the pad blocks the frame's thread. Chrome
// gives sandboxed opaque-origin frames their own process, so the app stays responsive and
// Stop works; Firefox and Safari share the process and the tab freezes until the browser
// offers to stop the page (the draft is saved 300ms after the last keystroke, so little is
// lost). Upgrade path: run the console-only starters in a Web Worker, which is terminable
// everywhere.
export function ScratchPad({ question, shortcuts = false }: { question: Question; shortcuts?: boolean }) {
  const scratch = useDraft(draftKey(question.id, 'scratch'), question.code ?? '');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Every Run reloads the frame (key bump) and posts once it says ready. One mechanism for
  // Run and Stop: no leaked globals, no React root to unmount, no stray timers between
  // attempts. Reloading a cached same-host page costs tens of milliseconds.
  const [frameKey, setFrameKey] = useState(0);
  const pending = useRef<ToSandbox | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');

  useEffect(() => {
    const onMessage = (e: MessageEvent<FromSandbox>) => {
      const frame = iframeRef.current;
      // `event.origin` is 'null' for an opaque frame and proves nothing; the source does.
      if (!frame || e.source !== frame.contentWindow) return;
      const msg = e.data;
      if (msg.type === 'ready') {
        if (pending.current) frame.contentWindow?.postMessage(pending.current, '*');
        pending.current = null;
      } else if (msg.type === 'log') {
        setLines((prev) => [...prev, { level: msg.level, text: msg.text }]);
      } else if (msg.type === 'error') {
        setLines((prev) => [...prev, { level: 'error', text: `✗ ${msg.text}` }]);
      } else if (msg.type === 'done') {
        setStatus('done');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const reload = useCallback((next: ToSandbox | null) => {
    pending.current = next;
    setLines([]);
    setStatus(next ? 'running' : 'idle');
    setFrameKey((k) => k + 1);
  }, []);
  const run = () => reload({ type: 'run', code: scratch.draft, preview: question.preview });
  const stop = () => reload(null);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      run();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      // setRangeText edits the DOM value in place and leaves the caret after the insert;
      // the controlled value then catches up to what is already there, so no caret jump.
      e.preventDefault();
      const el = e.currentTarget;
      el.setRangeText('  ', el.selectionStart, el.selectionEnd, 'end');
      scratch.onChange(el.value);
    }
  };

  const code = question.code ?? '';
  return (
    <div className="mb-4">
      <textarea
        value={scratch.draft}
        onChange={(e) => scratch.onChange(e.target.value)}
        onBlur={scratch.onBlur}
        onKeyDown={onKeyDown}
        spellCheck={false}
        wrap="off"
        rows={Math.max(code.split('\n').length + 2, scratch.draft.split('\n').length + 2)}
        aria-label="Scratch editor"
        className={`w-full overflow-x-auto ${mono}`}
      />
      {scratch.saveFailed && <p role="alert" className={`mt-1 text-xs ${warnText}`}>{DRAFT_SAVE_FAILED}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={run} className={button}>
          Run {shortcuts && <kbd className="ml-2 text-xs opacity-70 [@media(hover:none)]:hidden">{modKey}↩</kbd>}
        </button>
        <button type="button" onClick={stop} className={button}>Stop</button>
        <span role="status" className="text-xs text-zinc-500 dark:text-zinc-400">
          {status === 'running' ? 'Running…' : status === 'done' && lines.length === 0 ? 'Ran — no output' : ''}
        </span>
      </div>

      {lines.length > 0 && (
        <div role="log" aria-label="Output" className={`mt-2 max-h-64 overflow-auto whitespace-pre-wrap ${mono}`}>
          {lines.map((l, i) => (
            <div key={i} className={l.level === 'warn' || l.level === 'error' ? warnText : undefined}>{l.text}</div>
          ))}
        </div>
      )}

      {/* Kept in the DOM even without a preview: the code still runs there. */}
      <iframe
        key={frameKey}
        ref={iframeRef}
        src={SANDBOX_URL}
        sandbox="allow-scripts"
        title="Preview"
        aria-hidden={question.preview ? undefined : true}
        className={question.preview ? 'mt-2 min-h-48 w-full rounded border border-zinc-300 dark:border-zinc-700' : 'h-0 w-0 border-0'}
      />
    </div>
  );
}
