# Run code in the live coding round

**Goal:** The 21 scratch pads in the live coding round (13 React build prompts, 8
data-structure and utility starters) are write-only today: you type your approach into a
textarea and reveal the model answer. Real live-coding rounds run the code. This adds a
Run button that executes the draft in the browser, shows console output and errors, and
for the React starters renders the component with sample props — all offline, all on the
static GitHub Pages build, with no server and no external playground.

## Decisions already taken

Answered during brainstorming; recorded so the plan does not reopen them.

| Question | Decision |
|---|---|
| Which starters run | Both kinds: utility functions get console output; React components also get a live preview. |
| Transpiler | **Sucrase**, in the sandbox bundle only. TS type-stripping + JSX, no type checking. |
| React harness | A `preview` field on the question, authored once per React starter. The user edits only the component. |
| Editor | Keep the textarea. Add Tab-inserts-two-spaces and Cmd/Ctrl+Enter to run. No CodeMirror. |
| Run trigger | Manual: Run button and Cmd/Ctrl+Enter. No auto-run. |
| Execution | One path for both kinds: a sandboxed iframe. No Web Worker (see *Known ceilings*). |

## Data

`Question` gains one optional field:

```ts
/** JSX that mounts this component with sample props, e.g. `<Tabs tabs={[...]} />`.
 *  Only meaningful with `scratch: true`; a scratch question without it runs
 *  console-only. */
preview?: string;
```

The 13 `Build prompts` starters in `src/data/coding.ts` each get a `preview` with props
that exercise the TODOs in the starter — e.g. `Autocomplete` gets a `fetchSuggestions`
that resolves after a delay so the race is observable, `VirtualList` gets a few thousand
items, `ReorderableList` gets an `onReorder` that logs. The 8 `Data structures &
traversal` starters get none: they are functions, and the user calls them with
`console.log` in the pad.

`data.test.ts` gains: `preview` implies `scratch` and `code`. Nothing asserts that every
React starter has a preview; a build prompt without one degrades to console-only, which is
still useful.

## Sandbox page

A second Vite entry, `sandbox.html` → `src/sandbox/main.tsx`, bundled separately so the
main app bundle does not grow. It contains React, ReactDOM, Sucrase and ~60 lines of glue.
The app embeds it as `<iframe src={import.meta.env.BASE_URL + 'sandbox.html'}
sandbox="allow-scripts">` — same host, but `allow-scripts` without `allow-same-origin`
gives the frame an opaque origin, so the user's code cannot read the app's localStorage
(ratings, notes, drafts) or the DOM around it.

### Protocol

Parent → sandbox, via `iframe.contentWindow.postMessage(msg, '*')` (the target origin is
opaque, so `'*'` is the only option; the message carries nothing sensitive):

- `{ type: 'run', code: string, preview?: string }`

Sandbox → parent, via `window.parent.postMessage(msg, '*')`. The parent accepts a message
**only if `event.source === iframe.contentWindow`**; `event.origin` is `'null'` for an
opaque frame and proves nothing.

- `{ type: 'ready' }` — sent once the sandbox script has loaded and installed its listener.
- `{ type: 'log', level: 'log' | 'info' | 'warn' | 'error', text: string }` — one per
  `console.*` call. Arguments are joined with a space; strings as-is, everything else
  `JSON.stringify`'d with a `String()` fallback for cycles and functions.
- `{ type: 'error', text: string }` — a compile error (Sucrase's message includes line and
  column), a synchronous throw, an uncaught `window.onerror`, or an `unhandledrejection`.
- `{ type: 'done' }` — sent after the synchronous evaluation returns. Async work may still
  log or error afterwards; the parent keeps listening until the next run.

### Isolation between runs

**Every Run reloads the frame.** The parent bumps a `key` on the iframe, waits for
`ready`, then posts `run`. This is the one mechanism for both Run and Stop: no leaked
globals, no React root to unmount, no stray `setInterval` from the previous attempt.
Reloading a same-host page whose script is already cached costs tens of milliseconds.
Stop is a reload with no follow-up `run`.

If the user presses Run before the first `ready` arrives, the parent stores the request
and sends it on `ready`.

## Compile

`src/sandbox/compile.ts` exports one pure function, unit-tested without a DOM:

```ts
export function compile(code: string, preview?: string): string
```

1. Concatenate `code`, a newline and (if given) `;__render(${preview});` — appended
   **after** the user's code so Sucrase's line numbers in error messages match the pad.
2. `transform(src, { transforms: ['typescript', 'jsx'], jsxRuntime: 'classic',
   production: true }).code`. Classic runtime emits `React.createElement`, which resolves
   to the `React` parameter below; `production` drops `__self`/`__source`.
3. Prepend `Object.assign(globalThis, React);` so the bare `useState`, `useEffect`,
   `useSyncExternalStore`, `useActionState`, `useOptimistic` in the starters resolve —
   the starters have no imports and that is deliberate: the pad is the whole file.

The sandbox evaluates it as `new Function('React', '__render', compiled)(React, el =>
root.render(el))` where `root` is a `createRoot` on the sandbox's `#root`. A Sucrase
`SyntaxError` and a synchronous throw are both caught and posted as `error`.

Top-level `await` is not supported (`new Function` is not a module). The utility
starters that are async — `promisePool`, `fetchWithRetry`, `all` — are exercised with
`.then(console.log)` in the pad, which works fine.

## UI

The scratch block currently inlined in `QuestionCard` (textarea + save-failed notice)
moves into a `ScratchPad` component that owns `useDraft`, the textarea's keydown handler,
and the runner. `QuestionCard` renders `<ScratchPad question={question} />` in the spot the
textarea occupies today. The textarea keeps `aria-label="Scratch editor"` so the existing
tests and the README wording still hold.

**Textarea keydown.** `Tab` inserts two spaces at the caret (and keeps the caret after
them) instead of moving focus; `Shift+Tab` is left alone so keyboard users can still
leave the field backwards. `Cmd+Enter` / `Ctrl+Enter` runs. Both call `preventDefault`
only for those exact keys.

**Below the textarea**, always present for a scratch question:

- A row: **Run** (`<kbd>⌘↩</kbd>` / `Ctrl+↩` hint when shortcuts are enabled — reuse the
  existing `shortcuts` prop path), **Stop**, and a small status text: nothing before the
  first run, "Running…" until `done`, then "Ran — no output" if nothing was logged.
- An output panel, `role="log"` with `aria-label="Output"`, monospace, `max-h-64
  overflow-auto`, one line per message. `warn` and `error` lines use the amber tone the
  draft-save-failed notice already uses; `error` messages from the sandbox get a leading
  `✗`. Cleared on every Run and Stop.
- The iframe, `title="Preview"`. When the question has a `preview` it renders at
  `min-h-48` with the same rounded zinc border as the code block; when it has none it is
  kept in the DOM (it still executes the code) at zero size with `aria-hidden`.

Output is ephemeral: not persisted, not exported, gone on advancing to the next question
(the `key={current.id}` remount already does this).

### Sandbox document

Minimal, unthemed: `color-scheme: light dark`, the app's system font stack, 12px padding,
and a `#root`. The user's component is the only visible thing. Theme sync with the app is
out of scope.

## Build

`vite.config.ts`:

```ts
build: { rollupOptions: { input: { main: 'index.html', sandbox: 'sandbox.html' } } }
```

Both pages inherit `base: '/interview-prep/'`, so `sandbox.html` lands beside
`index.html` on GitHub Pages and `import.meta.env.BASE_URL + 'sandbox.html'` resolves in
dev, `vite preview` and production alike. `tsconfig.json` already includes `src`, so
`src/sandbox/*` is type-checked and linted with the rest.

Sucrase is added as a regular dependency; only `transform` is imported, so the CLI-side
dependencies (`commander`, `mz`, `pirates`, `tinyglobby`) are never bundled.

## Tests

- **`compile.test.ts`** (pure): strips a `type` alias and a generic parameter; compiles
  `<div/>` to `React.createElement`; appends the `__render` call after the user's code;
  prepends the `globalThis` assignment; a syntax error throws with a message containing
  the line number; no preview → no `__render`.
- **`ScratchPad.test.tsx`** (jsdom): Run posts `{type:'run', code, preview}` to the
  iframe's `contentWindow` after a dispatched `ready` (spy on `postMessage`); a `log`
  `MessageEvent` whose `source` is the iframe window appears in the `role="log"` panel; a
  message from another `source` is ignored; `error` renders with the amber class; Stop
  clears the panel and remounts the iframe (new element identity); Tab inserts two spaces
  and does not move focus; Cmd+Enter triggers a run; a question without `preview` gets a
  zero-size hidden iframe.
- **`data.test.ts`**: `preview` implies `scratch` and `code`.
- **Existing** `QuestionCard` scratch-editor tests stay green unchanged (they query the
  textbox by its label).
- **`static.test.ts`**: the question count assertion is unaffected; no new static assertion
  is needed.

`npm run build` is part of the manual check: it must emit both `index.html` and
`sandbox.html`, and the main chunk must not grow (Sucrase and the second React copy live in
the sandbox chunk).

## Known ceilings

- **Synchronous infinite loops.** `while (true) {}` in the pad blocks the frame's
  thread. Chrome runs sandboxed opaque-origin iframes in their own process, so the app
  stays responsive and Stop works. Firefox and Safari share the process, so the tab
  freezes until the browser offers to stop the page; the draft is saved 300 ms after the
  last keystroke, so at most the last few characters are lost. Marked with a `ponytail:`
  comment in `ScratchPad`; the upgrade path is a Web Worker for the console-only starters,
  which is terminable everywhere.
- **No type checking.** Sucrase strips types. A TS error that would fail `tsc` runs
  anyway; that matches CoderPad-style rounds, which also do not type-check.
- **No imports.** The pad is one file with React's exports as globals. A `import x from`
  line is a syntax error in `new Function`; the error surfaces in the output panel.

## Out of scope

- A Web Worker path for the utility starters (see above) — add when the freeze bites.
- CodeMirror or any highlighting editor.
- Assertions / pass-fail test cases in question data.
- Auto-run on pause.
- Theme sync between the app and the sandbox document.
- Persisting or exporting run output.
- Making the read-only `code` blocks on Debugging and Code review questions runnable.
- Opening the draft in an external playground.

## README

Same commit as the feature, per the repo rule: the *Working a question* bullet about
scratch pads gains the Run / Stop / Cmd+Enter behaviour and the preview; *Your data*
notes that run output is never stored; *Development* mentions that `sandbox.html` is a
second Vite page.
