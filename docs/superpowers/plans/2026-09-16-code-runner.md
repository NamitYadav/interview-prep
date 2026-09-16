# Run code in the live coding round — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every scratch pad in the live coding round a Run button that executes the draft in the browser, shows console output and errors, and renders the React component starters with sample props.

**Architecture:** A second Vite page, `sandbox.html`, is embedded by the pad as an opaque-origin iframe (`sandbox="allow-scripts"`). The parent posts `{type:'run', code, preview}`; the sandbox compiles TS+JSX with Sucrase, evaluates via `new Function`, and posts `ready` / `log` / `error` / `done` back. Every Run (and Stop) reloads the frame, so there is one isolation mechanism and nothing leaks between attempts. The textarea and its persistence move out of `QuestionCard` into a `ScratchPad` component that owns the runner.

**Tech Stack:** React 19, TypeScript, Vite (multi-page), Vitest + Testing Library, Sucrase (new runtime dependency, sandbox bundle only).

**Spec:** [docs/superpowers/specs/2026-09-16-code-runner-design.md](../specs/2026-09-16-code-runner-design.md)

## Global Constraints

- Sucrase is imported **only** from `src/sandbox/*`. The main page's chunk must not contain the sandbox code (Task 3 Step 4 checks a marker string); `npm run build` must emit both `dist/index.html` and `dist/sandbox.html`. Rollup will hoist React into a chunk shared by both pages — that is expected, and the README's *Stack* paragraph is updated to say so (Task 5).
- The iframe is `sandbox="allow-scripts"` — never add `allow-same-origin`. Parent accepts a message only when `event.source === iframe.contentWindow`.
- The textarea keeps `aria-label="Scratch editor"`; existing `QuestionCard` scratch tests must pass unchanged.
- Run output is never persisted, exported, or imported.
- No CodeMirror, no auto-run, no Web Worker, no theme sync, no assertions-in-data (spec › *Out of scope*).
- `npm test -- --run`, `npm run typecheck` and `npm run lint` pass after every task.
- README is updated in the same commit as the user-visible change (Task 5).
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Do not push; the user pushes after review.

---

## File structure

| File | Responsibility |
|---|---|
| `src/types.ts` | `Question.preview?: string` |
| `src/data/coding.ts` | `preview` on the 7 component starters |
| `src/sandbox/protocol.ts` | Message types shared by parent and sandbox |
| `src/sandbox/compile.ts` | Pure: `compile(code, preview)` and `formatArgs(args)` |
| `src/sandbox/main.tsx` | Sandbox glue: console shim, error forwarding, message loop |
| `sandbox.html` | Second Vite page hosting `main.tsx` |
| `vite.config.ts` | Second rollup input; CORS for the opaque-origin frame in dev/preview |
| `src/components/ScratchPad.tsx` | Textarea + Tab/Cmd-Enter + Run/Stop + output log + preview iframe |
| `src/components/QuestionCard.tsx` | Renders `<ScratchPad>` instead of the inline textarea |
| `src/__tests__/compile.test.ts`, `ScratchPad.test.tsx`, `data.test.ts` | Tests |
| `README.md` | Docs |

---

## Task 1: `preview` on questions and the component starters

**Files:**
- Modify: `src/types.ts:6-8`
- Modify: `src/data/coding.ts` (questions `coding-028` … `coding-032`, `coding-034`, `coding-035`)
- Modify: `docs/superpowers/specs/2026-09-16-code-runner-design.md` (Data section, one correction)
- Test: `src/__tests__/data.test.ts`

**Interfaces:**
- Produces: `Question.preview?: string` — JSX expression text, read only by `ScratchPad` (Task 4) and forwarded to the sandbox.

Note for the implementer: the spec says "the 13 React build prompts get a preview". Six of the thirteen `Build prompts` starters are plain functions or hooks (`promisePool`, `createStore`/`useStore`, `LRUCache`, `fetchWithRetry`, `memoizeAsync`, `debounce`/`throttle`) — a JSX harness makes no sense for them. Only the 7 component starters get one.

- [ ] **Step 1: Write the failing data test**

Append inside `describe('question bank', …)` in `src/__tests__/data.test.ts`, after the `'a scratch question always carries starter code'` test:

```ts
  // `preview` is the JSX harness the sandbox mounts after the pad's code. Only ScratchPad
  // reads it, and ScratchPad only renders for scratch questions — a preview on a read-only
  // snippet would be dead data.
  test('a preview only appears on a scratch question with code', () => {
    for (const q of questions) {
      if (q.preview) expect(q.scratch && q.code, `${q.id} has a preview but is not a scratch pad`).toBeTruthy();
    }
  });

  test('every component starter in the coding round has a preview', () => {
    // A top-level function with a capitalised name is a component; the hooks and utilities
    // are camelCase and the caches are classes.
    const components = questions.filter((q) => q.round === 'coding' && q.scratch && /^(async )?function [A-Z]/m.test(q.code ?? ''));
    expect(components.map((q) => q.id)).toEqual(['coding-028', 'coding-029', 'coding-030', 'coding-031', 'coding-032', 'coding-034', 'coding-035']);
    for (const q of components) expect(q.preview, `${q.id} is a component with no preview`).toBeTruthy();
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: FAIL — TypeScript complains `preview` does not exist on `Question` (vitest reports the type error as a test failure via the second test's `q.preview`), or the second test fails on `coding-028 is a component with no preview`.

- [ ] **Step 3: Add the field to `Question`**

In `src/types.ts`, after `code?: string; scratch?: true;` line, add:

```ts
  /** JSX that mounts this component with sample props, e.g. `<Tabs tabs={[...]} />`. The
   *  sandbox appends `__render(<preview/>)` after the pad's code. Only meaningful with
   *  `scratch: true`; a scratch question without it runs console-only. */
  preview?: string;
```

- [ ] **Step 4: Add the 7 previews**

In `src/data/coding.ts`, add a `preview:` line directly after `scratch: true,` in each listed question. Previews are single-quoted TS strings; use double quotes inside the JSX.

`coding-028` (Autocomplete — the first keystroke resolves slowly so the race is visible):
```ts
    preview: '<Autocomplete fetchSuggestions={(q) => new Promise((resolve) => setTimeout(() => resolve(["apple", "apricot", "avocado", "banana", "blueberry", "cherry"].filter((s) => s.startsWith(q.toLowerCase()))), q.length === 1 ? 900 : 200))} />',
```

`coding-029` (VirtualList):
```ts
    preview: '<VirtualList items={Array.from({ length: 10000 }, (_, i) => "Row " + (i + 1))} rowHeight={28} viewportHeight={280} />',
```

`coding-030` (Combobox):
```ts
    preview: '<Combobox options={["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Leipzig", "Dresden"]} />',
```

`coding-031` (Tabs):
```ts
    preview: '<Tabs tabs={[{ id: "overview", label: "Overview", panel: "Overview panel" }, { id: "activity", label: "Activity", panel: "Activity panel" }, { id: "settings", label: "Settings", panel: "Settings panel" }]} />',
```

`coding-032` (TransactionsTable — 57 rows so paging shows, mixed currencies, negative amounts):
```ts
    preview: '<TransactionsTable rows={Array.from({ length: 57 }, (_, i) => ({ id: "tx-" + i, date: new Date(2026, 0, 1 + i).toISOString().slice(0, 10), counterparty: ["Acme GmbH", "Globex", "Initech", "Umbrella"][i % 4], amountMinor: ((i * 7919) % 100000) - 25000, currency: i % 3 === 0 ? "USD" : "EUR", status: ["settled", "pending", "failed"][i % 3] }))} />',
```

`coding-034` (AmountForm):
```ts
    preview: '<AmountForm />',
```

`coding-035` (ReorderableList — the callback logs so the console shows the new order):
```ts
    preview: '<ReorderableList items={["Alpha", "Bravo", "Charlie", "Delta"]} onReorder={(next) => console.log("reorder", next)} />',
```

- [ ] **Step 5: Correct the spec's count**

In `docs/superpowers/specs/2026-09-16-code-runner-design.md`, Data section, replace

```
The 13 `Build prompts` starters in `src/data/coding.ts` each get a `preview` with props
```
with
```
The 7 component starters among the `Build prompts` in `src/data/coding.ts` (Autocomplete,
VirtualList, Combobox, Tabs, TransactionsTable, AmountForm, ReorderableList) each get a
`preview` with props
```
and replace
```
The 8 `Data structures &
traversal` starters get none: they are functions, and the user calls them with
`console.log` in the pad.
```
with
```
The other 14 scratch starters (the 6 function/hook build prompts and the 8 `Data
structures & traversal` questions) get none: they are functions, and the user calls them
with `console.log` in the pad.
```

- [ ] **Step 6: Run the tests, typecheck, lint**

Run: `npx vitest run src/__tests__/data.test.ts && npm run typecheck && npm run lint`
Expected: PASS, no type or lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/data/coding.ts src/__tests__/data.test.ts docs/superpowers/specs/2026-09-16-code-runner-design.md
git commit -m "feat: add preview harness to the seven component starters

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 2: Sucrase and the pure compile step

**Files:**
- Modify: `package.json` (dependency)
- Create: `src/sandbox/protocol.ts`
- Create: `src/sandbox/compile.ts`
- Test: `src/__tests__/compile.test.ts`

**Interfaces:**
- Produces:
  - `type ToSandbox = { type: 'run'; code: string; preview?: string }`
  - `type FromSandbox = { type: 'ready' } | { type: 'log'; level: LogLevel; text: string } | { type: 'error'; text: string } | { type: 'done' }`
  - `type LogLevel = 'log' | 'info' | 'warn' | 'error'`
  - `compile(code: string, preview?: string): string` — throws `SyntaxError` on bad input
  - `formatArgs(args: unknown[]): string`

- [ ] **Step 1: Install Sucrase**

Run: `npm install sucrase@^3.35.1`
Expected: `package.json` `dependencies` gains `"sucrase": "^3.35.1"`; `package-lock.json` updates.

- [ ] **Step 2: Write the protocol types**

Create `src/sandbox/protocol.ts`:

```ts
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
```

- [ ] **Step 3: Write the failing compile tests**

Create `src/__tests__/compile.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { compile, formatArgs } from '../sandbox/compile';

describe('compile', () => {
  test('strips types and keeps the code', () => {
    const out = compile('type T = { a: number };\nfunction f<T>(x: T): T { return x; }');
    expect(out).not.toContain('type T');
    expect(out).toMatch(/function f\s*\(x\)\s*\{ return x; \}/);
  });

  test('compiles JSX to React.createElement, resolved against the React parameter', () => {
    expect(compile('const el = <div className="a" />;')).toMatch(/React\.createElement\(['"]div['"]/);
  });

  test('appends the render call after the user code when given a preview', () => {
    const out = compile('function F() { return null; }', '<F />');
    const user = out.indexOf('function F');
    const render = out.indexOf('__render(React.createElement(F');
    expect(user).toBeGreaterThan(-1);
    expect(render).toBeGreaterThan(user);
  });

  test('adds no render call without a preview', () => {
    expect(compile('const x = 1;')).not.toContain('__render');
  });

  test('exposes React as globals before anything else runs', () => {
    expect(compile('1;').startsWith('Object.assign(globalThis, React);')).toBe(true);
  });

  // The pad shows the user's code from line 1; the harness is appended after it so
  // Sucrase's "(line:col)" in the message points at what they can see.
  test('a syntax error names the line', () => {
    expect(() => compile('const x = ;\nconst y = 1;')).toThrow(/\(1:/);
  });
});

describe('formatArgs', () => {
  test('strings as-is, everything else as JSON, joined by a space', () => {
    expect(formatArgs(['n =', 42, { a: [1] }, undefined, null])).toBe('n = 42 {"a":[1]} undefined null');
  });

  test('cycles and functions fall back to String()', () => {
    const o: Record<string, unknown> = {};
    o.self = o;
    expect(formatArgs([o])).toBe('[object Object]');
    expect(formatArgs([() => 1])).toMatch(/=>/);
  });

  test('errors show name and message, not a stack into eval-ed code', () => {
    expect(formatArgs([new TypeError('boom')])).toBe('TypeError: boom');
  });
});
```

- [ ] **Step 4: Run to verify they fail**

Run: `npx vitest run src/__tests__/compile.test.ts`
Expected: FAIL — cannot resolve `../sandbox/compile`.

- [ ] **Step 5: Implement `compile.ts`**

Create `src/sandbox/compile.ts`:

```ts
import { transform } from 'sucrase';

// The pad is the whole file: no imports, React's exports as globals. The classic JSX
// runtime emits `React.createElement`, which resolves to the `React` parameter the sandbox
// passes to `new Function('React', '__render', compiled)`. The harness is appended AFTER
// the user's code so Sucrase's line numbers in error messages match what the pad shows.
export function compile(code: string, preview?: string): string {
  const src = preview ? `${code}\n;__render(${preview});` : code;
  const { code: js } = transform(src, { transforms: ['typescript', 'jsx'], jsxRuntime: 'classic', production: true });
  return `Object.assign(globalThis, React);\n${js}`;
}

// One line per console call. Strings as typed; objects as JSON so `console.log(map)`
// shows something; cycles and functions fall back to String(). Errors are name + message
// on purpose — a stack into `new Function` code is noise nobody can act on.
export function formatArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      try {
        const json = JSON.stringify(a);
        return json === undefined ? String(a) : json;
      } catch {
        return String(a);
      }
    })
    .join(' ');
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run src/__tests__/compile.test.ts && npm run typecheck && npm run lint`
Expected: PASS. If the `createElement` assertion fails because Sucrase quotes the tag differently, widen the regex rather than the implementation.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/sandbox/protocol.ts src/sandbox/compile.ts src/__tests__/compile.test.ts
git commit -m "feat: compile TS+JSX pad code with Sucrase for the sandbox

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 3: The sandbox page

**Files:**
- Create: `sandbox.html` (repo root, beside `index.html`)
- Create: `src/sandbox/main.tsx`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `compile`, `formatArgs` (Task 2), `ToSandbox`, `FromSandbox` (Task 2).
- Produces: a page at `import.meta.env.BASE_URL + 'sandbox.html'` that posts `{type:'ready'}` on load and answers `run` per the protocol.

No unit test: the glue is DOM + `postMessage` + `new Function`, all of which the pure `compile` tests and the `ScratchPad` tests (Task 4) cover from either side. The check for this task is the build and a manual run in the browser.

- [ ] **Step 1: Create `sandbox.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
    <style>
      /* Unthemed on purpose: the user's component is the only thing on this page. The
         frame has an opaque origin, so the app's self-hosted font would need CORS — the
         system stack is fine here. */
      :root { color-scheme: light dark; }
      body { margin: 0; padding: 12px; font: 14px/1.4 system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/sandbox/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/sandbox/main.tsx`**

```tsx
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
```

- [ ] **Step 3: Register the page and the CORS rule in `vite.config.ts`**

Replace the whole file with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The code-runner iframe is `sandbox="allow-scripts"` with no allow-same-origin, so its
// origin is opaque and its module-script requests arrive with `Origin: null`, which needs
// a CORS answer. GitHub Pages sends `Access-Control-Allow-Origin: *` on every asset; the
// dev and preview servers must allow 'null' too, which Vite's localhost-only default
// does not. Any sandboxed frame on any page also has origin 'null' — acceptable for a
// personal tool's dev server, and only while it is running.
const sandboxCors = { origin: [/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/, 'null'] };

export default defineConfig({
  base: '/interview-prep/',
  plugins: [react(), tailwindcss()],
  build: {
    // No deliberate code-splitting (see README › Stack); the size warning was noise on
    // every build. 1500 leaves headroom for the bank to grow as much again as it did
    // between 1000 and here.
    chunkSizeWarningLimit: 1500,
    // Second page: the code-runner sandbox (src/sandbox). Rollup hoists React into a chunk
    // both pages share and keeps Sucrase in the sandbox's own chunk, so the app never
    // downloads the compiler.
    rollupOptions: { input: { main: 'index.html', sandbox: 'sandbox.html' } },
  },
  server: { cors: sandboxCors },
  preview: { cors: sandboxCors },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Vitest blanks CSS imports by default; static.test.ts reads index.css as text.
    css: { include: [/index\.css/] },
  },
});
```

- [ ] **Step 4: Build and check both pages exist and the sandbox code stayed out of the main chunk**

Run: `npm run build 2>&1 | grep -E '\.(html|js)' && ls dist/index.html dist/sandbox.html && grep -c 'Object.assign(globalThis, React)' dist/assets/*.js`
Expected: both html files exist; the grep prints `0` for the `index-*.js` chunk and `1` for the `sandbox-*.js` chunk. Rollup will also emit a shared chunk holding React (both pages import it) — that is expected and reported `0` too. If `index-*.js` reports `1`, something from `src/sandbox` is imported by the main app — stop and fix the import.

- [ ] **Step 5: Manual smoke test in the browser**

Start the dev server (use the Browser pane's `preview_start`, not Bash) and open `http://localhost:5173/interview-prep/sandbox.html` directly. Expected: blank page, no console errors. Then, in the page console:

```js
addEventListener('message', (e) => console.log('from sandbox', e.data));
postMessage({ type: 'run', code: 'console.log("hi", {a:1}); function F(){ return <b>works</b> }', preview: '<F />' }, '*');
```

Expected: the page shows **works**; the console shows `from sandbox {type:'log', …text:'hi {"a":1}'}` then `{type:'done'}`. (Opened top-level like this, `window.parent === window`, so the source check passes and the posts loop back — good enough to prove compile + eval + render.)

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: clean. If ESLint flags `new Function`, add `// eslint-disable-next-line no-new-func` above that one line with the comment `— the whole point of this file`.

- [ ] **Step 7: Commit**

```bash
git add sandbox.html src/sandbox/main.tsx vite.config.ts
git commit -m "feat: add the code-runner sandbox page as a second Vite entry

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 4: `ScratchPad` — editor, Run/Stop, output, preview

**Files:**
- Create: `src/components/ScratchPad.tsx`
- Modify: `src/components/QuestionCard.tsx:6-7` (imports), `:66-69` (useDraft), `:148-166` (scratch branch)
- Test: `src/__tests__/ScratchPad.test.tsx`
- Existing tests that must stay green: `src/__tests__/QuestionCard.test.tsx` (`scratch editor` describe)

**Interfaces:**
- Consumes: `ToSandbox`, `FromSandbox` (Task 2); `Question.preview` (Task 1); `useDraft`, `DRAFT_SAVE_FAILED` from `src/hooks/useDraft.ts`; `draftKey` from `src/lib/drafts.ts`.
- Produces: `ScratchPad({ question: Question; shortcuts?: boolean })`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/ScratchPad.test.tsx`:

```tsx
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Question } from '../types';
import { ScratchPad } from '../components/ScratchPad';

const q: Question = {
  id: 'coding-001', round: 'coding', category: 'Build prompts', scratch: true,
  question: 'Build it', code: 'function f() {\n  return 1;\n}', answer: ['a'], keyPoints: ['k'],
};

afterEach(() => localStorage.clear());

const frame = () => screen.getByTitle('Preview') as HTMLIFrameElement;

// Messages "from the sandbox" are MessageEvents on window whose source is the iframe's
// window — exactly what the browser delivers, minus the actual frame load (jsdom does
// not fetch iframe sources, but it does give each one a contentWindow).
const fromSandbox = (data: unknown, source: Window | null = frame().contentWindow) =>
  act(() => { window.dispatchEvent(new MessageEvent('message', { data, source })); });

describe('ScratchPad editor', () => {
  test('is a textarea pre-filled with the starter code', () => {
    render(<ScratchPad question={q} />);
    expect(screen.getByRole('textbox', { name: /scratch editor/i })).toHaveValue(q.code);
  });

  test('Tab inserts two spaces at the caret and keeps focus', async () => {
    const user = userEvent.setup();
    render(<ScratchPad question={{ ...q, code: 'ab' }} />);
    const ta = screen.getByRole('textbox', { name: /scratch editor/i }) as HTMLTextAreaElement;
    ta.focus();
    ta.setSelectionRange(1, 1);
    await user.keyboard('{Tab}');
    expect(ta).toHaveValue('a  b');
    expect(ta).toHaveFocus();
    expect(ta.selectionStart).toBe(3);
  });

  test('Shift+Tab is left alone so focus can still leave backwards', async () => {
    const user = userEvent.setup();
    render(<><button>before</button><ScratchPad question={{ ...q, code: 'ab' }} /></>);
    const ta = screen.getByRole('textbox', { name: /scratch editor/i });
    ta.focus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(ta).toHaveValue('ab');
    expect(screen.getByRole('button', { name: 'before' })).toHaveFocus();
  });

  test('Cmd/Ctrl+Enter runs from inside the editor', () => {
    render(<ScratchPad question={q} />);
    fireEvent.keyDown(screen.getByRole('textbox', { name: /scratch editor/i }), { key: 'Enter', ctrlKey: true });
    expect(screen.getByRole('status')).toHaveTextContent('Running…');
  });
});

describe('ScratchPad runner', () => {
  test('Run reloads the frame, then posts the draft and preview once it is ready', () => {
    render(<ScratchPad question={{ ...q, preview: '<f />' }} />);
    const before = frame();
    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    expect(frame()).not.toBe(before);
    const post = vi.spyOn(frame().contentWindow!, 'postMessage');
    fromSandbox({ type: 'ready' });
    expect(post).toHaveBeenCalledWith({ type: 'run', code: q.code, preview: '<f />' }, '*');
  });

  test('a ready with nothing pending posts nothing', () => {
    render(<ScratchPad question={q} />);
    const post = vi.spyOn(frame().contentWindow!, 'postMessage');
    fromSandbox({ type: 'ready' });
    expect(post).not.toHaveBeenCalled();
  });

  test('console output lands in the Output log', () => {
    render(<ScratchPad question={q} />);
    fromSandbox({ type: 'log', level: 'log', text: 'hello 42' });
    fromSandbox({ type: 'log', level: 'warn', text: 'careful' });
    const log = screen.getByRole('log', { name: /output/i });
    expect(log).toHaveTextContent('hello 42');
    expect(screen.getByText('careful')).toHaveClass('text-amber-700');
  });

  test('errors are marked with ✗ and coloured', () => {
    render(<ScratchPad question={q} />);
    fromSandbox({ type: 'error', text: 'SyntaxError: Unexpected token (2:3)' });
    const line = screen.getByText(/Unexpected token/);
    expect(line).toHaveTextContent('✗ SyntaxError: Unexpected token (2:3)');
    expect(line).toHaveClass('text-amber-700');
  });

  test('messages from any other window are ignored', () => {
    render(<ScratchPad question={q} />);
    fromSandbox({ type: 'log', level: 'log', text: 'spoofed' }, window);
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });

  test('a run that logs nothing says so once done', () => {
    render(<ScratchPad question={q} />);
    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Running…');
    fromSandbox({ type: 'done' });
    expect(screen.getByRole('status')).toHaveTextContent('Ran — no output');
  });

  test('Stop clears the output, resets the status and reloads the frame', () => {
    render(<ScratchPad question={q} />);
    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    const before = frame();
    fromSandbox({ type: 'log', level: 'log', text: 'x' });
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(frame()).not.toBe(before);
  });

  test('the frame is sandboxed to scripts only and points at the sandbox page', () => {
    render(<ScratchPad question={q} />);
    expect(frame()).toHaveAttribute('sandbox', 'allow-scripts');
    expect(frame().getAttribute('src')).toMatch(/\/sandbox\.html$/);
  });

  test('without a preview the frame is kept in the DOM but hidden', () => {
    render(<ScratchPad question={q} />);
    expect(frame()).toHaveAttribute('aria-hidden', 'true');
    expect(frame()).toHaveClass('h-0');
  });

  test('with a preview the frame is visible', () => {
    render(<ScratchPad question={{ ...q, preview: '<f />' }} />);
    expect(frame()).not.toHaveAttribute('aria-hidden');
    expect(frame()).toHaveClass('min-h-48');
  });

  test('the Run hint shows only when shortcuts are on', () => {
    const { rerender } = render(<ScratchPad question={q} />);
    expect(screen.getByRole('button', { name: /run/i }).querySelector('kbd')).toBeNull();
    rerender(<ScratchPad question={q} shortcuts />);
    expect(screen.getByRole('button', { name: /run/i }).querySelector('kbd')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/__tests__/ScratchPad.test.tsx`
Expected: FAIL — cannot resolve `../components/ScratchPad`.

- [ ] **Step 3: Create `ScratchPad.tsx`**

```tsx
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
```

- [ ] **Step 4: Run the ScratchPad tests**

Run: `npx vitest run src/__tests__/ScratchPad.test.tsx`
Expected: PASS. Likely failure points and their fixes:
- *Tab test*: if user-event still moved focus, confirm `e.preventDefault()` runs before `setRangeText` — user-event honours `defaultPrevented`.
- *Run test's `frame()` after click*: `frame()` must be called **after** the click (the click remounts the iframe; the spy goes on the new window).

- [ ] **Step 5: Wire it into `QuestionCard`**

In `src/components/QuestionCard.tsx`:

Replace the imports on lines 6-7
```ts
import { DRAFT_SAVE_FAILED, useDraft } from '../hooks/useDraft';
import { draftKey } from '../lib/drafts';
```
with
```ts
import { ScratchPad } from './ScratchPad';
```

Delete lines 67-69 (the comment and the `const scratch = useDraft(...)` line):
```ts
  // The scratch editor was uncontrolled — defaultValue with no onChange — so anything
  // typed into it during a live-coding drill was captured nowhere and lost on advance.
  const scratch = useDraft(draftKey(question.id, 'scratch'), question.code ?? '');
```

Replace the scratch branch (the `question.scratch ? ( <> <textarea … </> ) : (` part, lines 149-166) so the whole block reads:
```tsx
      {question.code && (
        question.scratch ? (
          <ScratchPad key={question.id} question={question} shortcuts={shortcuts} />
        ) : (
          <pre className="mb-4 overflow-x-auto rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800">
            <code>{question.code}</code>
          </pre>
        )
      )}
```
(`key={question.id}` keeps `useDraft`'s remount contract explicit at the call site; QuestionCard is already remounted per question by every caller, so this is belt and braces, not a behaviour change.)

- [ ] **Step 6: Run the whole suite, typecheck, lint**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: all green, including `QuestionCard scratch editor (Build prompts)` unchanged. If `typecheck` reports `useDraft`/`draftKey`/`DRAFT_SAVE_FAILED` unused in QuestionCard, the import edit in Step 5 was missed.

- [ ] **Step 7: Manual check in the app**

Dev server via the Browser pane's `preview_start`. Open `http://localhost:5173/interview-prep/#coding`, Browse tab, find `coding-031` (Tabs). In the pad, replace the body with:

```tsx
function Tabs({ tabs }: { tabs: { id: string; label: string; panel: string }[] }) {
  const [activeId, setActiveId] = useState(tabs[0].id);
  console.log('render', activeId);
  return <div>{tabs.map(t => <button key={t.id} onClick={() => setActiveId(t.id)}>{t.label}</button>)}<p>{tabs.find(t => t.id === activeId)!.panel}</p></div>;
}
```

Press Cmd/Ctrl+Enter. Expected: preview shows three buttons and "Overview panel"; Output shows `render overview`; clicking a button re-renders and logs. Type `const x: = 1` at the top and Run: Output shows `✗ SyntaxError: … (1:…)`. Press Stop: Output clears, preview blanks. Then open `coding-037` (LRUCache), append `console.log(new LRUCache<string, number>(2))` and Run: Output shows `{}`-ish JSON and the frame stays hidden. Take a screenshot of the Tabs run for the PR.

- [ ] **Step 8: Commit**

```bash
git add src/components/ScratchPad.tsx src/components/QuestionCard.tsx src/__tests__/ScratchPad.test.tsx
git commit -m "feat: run scratch-pad code in a sandboxed iframe with console output and preview

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Task 5: README

**Files:**
- Modify: `README.md:97-103` (scratch pad bullet), `:135-137` (Your data › Scratch pads), `:146-152` (Development)

- [ ] **Step 1: Update the *Working a question* bullet**

Replace the bullet that begins `- The **Live coding** build prompts and the data-structures questions give you an` (README.md:97-103) with:

```markdown
- The **Live coding** build prompts and the data-structures questions give you an
  editable scratch pad pre-filled with the starter code, instead of a read-only
  snippet — write your approach out before revealing, then **Run** it (`⌘↩` /
  `Ctrl+↩` inside the pad). Console output and errors show up under the pad; the
  React component prompts (Autocomplete, Tabs, VirtualList and friends) also render
  live in a preview with sample props. Every Run starts from a clean slate, and
  **Stop** kills whatever is going on. It runs TypeScript and JSX without type-checking,
  the way CoderPad does, with React's hooks available as globals — no imports. What you
  type is kept per question on this device, so a reload or a switch to another question
  doesn't lose it; it stays out of export/import backups. Run output is never stored.
```

- [ ] **Step 2: Update *Your data › Scratch pads***

In the bullet beginning `- **Scratch pads** (Build-prompt code, 45-minute design write-ups)` (README.md:135), append after `Anything worth keeping goes in a note.`:

```markdown
 Run output is not stored at all — it is gone when you leave the question.
```

- [ ] **Step 3: Update *Development***

Replace the Development code block with:

```bash
npm install
npm run dev        # http://localhost:5173/interview-prep/
npm test           # vitest watch
npm run build      # tsc + vite build — emits index.html and sandbox.html (the code-runner frame)
```

and in the *Stack* section replace the paragraph beginning `One JS bundle, ~330KB gzipped` with (keep the rest of that paragraph from "Skipped for the same reason" onwards unchanged):

```markdown
Two JS chunks for the app itself — the app and the React runtime, ~330KB gzipped
together, most of it the question bank's own text, not code — plus a third chunk that
only `sandbox.html` loads: the second Vite page that runs scratch-pad code in a
sandboxed iframe, with Sucrase to strip types and compile JSX. React is shared between
the two pages; the compiler is never downloaded by the app. Measured, not optimized:
further code-splitting would trim the initial load, but this is a single-user app run
from a laptop, so it isn't worth the added complexity.
```

Then run the build and put the real gzipped total in place of `~330KB` if it moved.

- [ ] **Step 4: Check the README question-count test still passes**

Run: `npx vitest run src/__tests__/static.test.ts`
Expected: PASS (nothing about counts changed).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: describe Run, Stop and the preview for live-coding scratch pads

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 6: Report, do not push**

Full suite one last time: `npx vitest run && npm run typecheck && npm run lint && npm run build`. Then report the branch, the commits, the screenshot from Task 4 Step 7, and the one post-deploy check that cannot be done locally: after merge, open the live site's live-coding round, Run once, and confirm the sandbox chunk loads (it depends on GitHub Pages sending `Access-Control-Allow-Origin: *`, which it does today). Wait for the user's go-ahead before pushing.
