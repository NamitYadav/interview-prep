import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { CaseKind, Question } from '../types';
import { DRAFT_SAVE_FAILED, useDraft } from '../hooks/useDraft';
import { draftKey } from '../lib/drafts';
import type { FromSandbox, LogLevel, ToSandbox } from '../sandbox/protocol';
import { buildCases, score, type CaseResult, type Score } from '../lib/grade';
import { gradeRun } from '../lib/gradeRun';
import { GradeReport } from './GradeReport';

// Same host as the app, so it works in dev, `vite preview` and on GitHub Pages alike.
// `allow-scripts allow-forms` without `allow-same-origin` makes the frame's origin opaque:
// the pad's code cannot read the app's localStorage or DOM. Forms are allowed because the
// AmountForm starter (coding-034) is a React 19 form Action, which needs the `submit` event.
const SANDBOX_URL = `${import.meta.env.BASE_URL}sandbox.html`;

const button = 'rounded border border-zinc-300 px-3 py-1 text-sm hover:border-emerald-500 dark:border-zinc-700';
const mono = 'rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800';
const warnText = 'text-amber-700 dark:text-amber-400';
const modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

type Line = { level: LogLevel; text: string };

const asText = (v: unknown): string => (typeof v === 'string' ? v : String(v));

const READY_TIMEOUT_MS = 3000;

// A logging loop (`while (true) console.log(i)`) posted lines faster than the tab could
// copy an ever-growing array into an ever-growing live region, and it hung before Stop
// could be clicked. The last MAX_LINES are kept, under one marker line.
const MAX_LINES = 500;
const TRUNCATED: Line = { level: 'warn', text: '… earlier output truncated' };
const append = (line: Line) => (prev: Line[]): Line[] => {
  const next = [...(prev[0] === TRUNCATED ? prev.slice(1) : prev), line];
  return next.length > MAX_LINES ? [TRUNCATED, ...next.slice(-MAX_LINES)] : next;
};

const EXAMPLES: ReadonlySet<CaseKind> = new Set(['example']);
const exampleLine = (r: CaseResult): Line =>
  r.status === 'pass'
    ? { level: 'log', text: `✓ ${r.name} (${Math.round(r.ms ?? 0)}ms)` }
    : { level: 'warn', text: `✗ ${r.name}: ${r.status === 'fail' ? `expected ${r.expected}, got ${r.got}` : r.detail}` };

// Two runners, one protocol. A console-only starter runs in a dedicated Worker
// (src/sandbox/worker.ts): `terminate()` ends a synchronous `while (true)` in every
// browser, and the worker script is a same-origin file the service worker precaches, so
// Run works offline. A starter with a preview, or one that needs the DOM (`needsDom`),
// runs in the sandbox frame instead.
//
// ponytail: the frame path still has the old ceiling. Chrome gives sandboxed opaque-origin
// frames their own process, so Stop works there; Firefox and Safari share the process and a
// `while (true)` in a preview starter freezes the tab until the browser offers to stop the
// page (the draft is saved 300ms after the last keystroke, so little is lost). The frame
// also has an opaque origin the service worker cannot serve, so a preview Run needs the
// network. No cheap upgrade path: a preview needs a DOM, and a worker has none. This stays
// until a preview starter's freeze actually bites.
export function ScratchPad({
  question, shortcuts = false, draftField = 'scratch', submit = true, onGraded,
}: {
  question: Question; shortcuts?: boolean;
  /** Draft slot; the timed test uses its own so a test starts from the blank starter. */
  draftField?: string;
  /** Show Submit (hidden tests). The timed test grades at the end instead. */
  submit?: boolean;
  onGraded?: (s: Score) => void;
}) {
  const scratch = useDraft(draftKey(question.id, draftField), question.code ?? '');
  const grader = question.grader;
  // Decided per question, not per run: the iframe is mounted (hidden) for the frame path
  // and absent for the worker path. jsdom has no Worker, so tests exercise the frame
  // unless they install one.
  const inWorker = !question.preview && !question.needsDom && typeof Worker !== 'undefined';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const workerRef = useRef<Worker | null>(null);
  // Every Run reloads the frame (key bump) and posts once it says ready. One mechanism for
  // Run and Stop: no leaked globals, no React root to unmount, no stray timers between
  // attempts. Reloading a cached same-host page costs tens of milliseconds. The worker
  // path gets the same clean slate by terminating and constructing a fresh Worker.
  const [frameKey, setFrameKey] = useState(0);
  const pending = useRef<ToSandbox | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  // The frame is only shown once it has reported ready for a run: before that (and when
  // it fails to load) it was a bright empty rectangle under the editor in the dark theme.
  const [frameReady, setFrameReady] = useState(false);
  const runRef = useRef<HTMLButtonElement>(null);
  const cancelGrade = useRef<(() => void) | null>(null);
  const [report, setReport] = useState<CaseResult[] | null>(null);

  // Output handling shared by both runners. The source proves where a message came from,
  // not what it is: pad code has postMessage and can send anything. A non-string `text`
  // rendered as a React child threw straight through to the app-wide ErrorBoundary.
  const receive = useCallback((data: unknown) => {
    const msg = data as Partial<FromSandbox> | null;
    if (typeof msg !== 'object' || msg === null) return;
    if (msg.type === 'log') {
      const level: LogLevel = msg.level === 'warn' || msg.level === 'error' || msg.level === 'info' ? msg.level : 'log';
      setLines(append({ level, text: asText(msg.text) }));
    } else if (msg.type === 'error') {
      setLines(append({ level: 'error', text: `✗ ${asText(msg.text)}` }));
    } else if (msg.type === 'done') {
      setStatus('done');
    }
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent<unknown>) => {
      const frame = iframeRef.current;
      // `event.origin` is 'null' for an opaque frame and proves nothing; the source does.
      if (!frame || e.source !== frame.contentWindow) return;
      const msg = e.data as Partial<FromSandbox> | null;
      if (typeof msg === 'object' && msg !== null && msg.type === 'ready') {
        if (timer.current) clearTimeout(timer.current);
        if (pending.current) frame.contentWindow?.postMessage(pending.current, '*');
        pending.current = null;
        setFrameReady(true);
        return;
      }
      receive(e.data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [receive]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    workerRef.current?.terminate();
    cancelGrade.current?.();
  }, []);

  const reload = useCallback((next: ToSandbox | null) => {
    pending.current = next;
    setLines([]);
    setStatus(next ? 'running' : 'idle');
    setFrameReady(false);
    setFrameKey((k) => k + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = next
      ? setTimeout(() => {
          if (!pending.current) return;
          pending.current = null;
          setLines([{ level: 'error', text: '✗ The sandbox page did not load — check the browser console.' }]);
          setStatus('done');
        }, READY_TIMEOUT_MS)
      : null;
  }, []);

  const stopWorker = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setLines([]);
  };
  const runInWorker = (code: string) => {
    stopWorker();
    setStatus('running');
    const worker = new Worker(new URL('../sandbox/worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<unknown>) => receive(e.data);
    // Uncaught throws inside the pad's code are reported by the worker itself and never
    // reach here; this is the script failing to load at all.
    worker.onerror = () => {
      worker.terminate();
      setLines([{ level: 'error', text: '✗ The runner did not start — check the browser console.' }]);
      setStatus('done');
    };
    worker.postMessage({ type: 'run', code } satisfies ToSandbox);
    workerRef.current = worker;
  };

  // Graded questions never touch the console runner: Run executes the example cases with
  // your console shown, Submit executes every case with it muted and renders the report.
  const runGrader = (all: boolean) => {
    cancelGrade.current?.();
    setLines([]);
    setReport(null);
    setStatus('running');
    cancelGrade.current = gradeRun(scratch.draft, grader!.fn, buildCases(grader!, question.id, all ? undefined : EXAMPLES), {
      console: !all,
      onLog: (level, text) => setLines(append({ level, text })),
      onResult: all ? undefined : (r) => setLines(append(exampleLine(r))),
      onLoadError: (text) => {
        cancelGrade.current = null;
        setLines(append({ level: 'error', text: `✗ ${text}` }));
        setStatus('done');
      },
      onDone: (results) => {
        cancelGrade.current = null;
        setStatus('done');
        if (!all) return;
        setReport(results);
        onGraded?.(score(results));
      },
    });
  };

  const run = () => {
    if (grader) runGrader(false);
    else if (inWorker) runInWorker(scratch.draft);
    else reload({ type: 'run', code: scratch.draft, preview: question.preview });
  };
  const stop = () => {
    if (grader) {
      cancelGrade.current?.();
      cancelGrade.current = null;
      setStatus('idle');
    } else if (inWorker) {
      stopWorker();
      setStatus('idle');
    } else {
      reload(null);
    }
  };

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
    } else if (e.key === 'Escape') {
      // Tab indents, so forward Tab could never leave the editor: a keyboard user had no
      // way to reach Run. Escape hands focus to it, the same convention code editors use.
      e.preventDefault();
      runRef.current?.focus();
    }
  };

  const code = question.code ?? '';
  const hintId = `scratch-hint-${question.id}`;
  const showPreview = Boolean(question.preview) && frameReady && status !== 'idle';
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
        aria-describedby={hintId}
        className={`w-full overflow-x-auto ${mono}`}
      />
      <p id={hintId} className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Tab indents · Esc leaves the editor</p>
      {scratch.saveFailed && <p role="alert" className={`mt-1 text-xs ${warnText}`}>{DRAFT_SAVE_FAILED}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button ref={runRef} type="button" onClick={run} className={button}>
          {grader ? 'Run examples' : 'Run'} {shortcuts && <kbd className="ml-2 text-xs opacity-70 [@media(hover:none)]:hidden">{modKey}↩</kbd>}
        </button>
        <button type="button" onClick={stop} className={button}>Stop</button>
        {grader && submit && (
          <button type="button" onClick={() => runGrader(true)} className={button}>Submit</button>
        )}
        <span role="status" className="text-xs text-zinc-500 dark:text-zinc-400">
          {status === 'running' ? (grader ? 'Grading…' : 'Running…') : status === 'done' && lines.length === 0 && !report ? 'Ran — no output' : ''}
        </span>
      </div>

      {/* Mounted empty so the live region exists before the first line arrives: a log
          that appears with its text already inside is routinely missed. */}
      <div
        role="log"
        aria-label="Output"
        className={lines.length > 0 ? `mt-2 max-h-64 overflow-auto whitespace-pre-wrap ${mono}` : undefined}
      >
        {lines.map((l, i) => (
          <div key={i} className={l.level === 'warn' || l.level === 'error' ? warnText : undefined}>{l.text}</div>
        ))}
      </div>
      {report && <GradeReport results={report} />}

      {/* Kept in the DOM even when hidden: the code still runs there. */}
      {!inWorker && !grader && (
        <iframe
          key={frameKey}
          ref={iframeRef}
          src={SANDBOX_URL}
          sandbox="allow-scripts allow-forms"
          title="Preview"
          aria-hidden={showPreview ? undefined : true}
          tabIndex={showPreview ? undefined : -1}
          className={showPreview ? 'mt-2 min-h-48 w-full rounded border border-zinc-300 dark:border-zinc-700' : 'h-0 w-0 border-0'}
        />
      )}
    </div>
  );
}
