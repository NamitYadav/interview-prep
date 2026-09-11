# Drilling extras: SM-2, debounce, light theme, scratch editor, strict mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship five previously-scoped-out drilling improvements: SM-2 spaced repetition, debounced localStorage writes, a real light theme, a scratch code editor for build prompts, and a strict-mode countdown timer.

**Architecture:** Five independent, self-contained changes to existing modules — no new subsystems, no new routes. Shipped as one PR (user's call), reviewed as one whole-branch review before merge.

**Tech Stack:** No new dependencies. Vite + React 19 + TS strict + Tailwind v4 + Vitest, unchanged.

## Global Constraints

- Public repo: no employer-internal facts, real STAR stories, or personal specifics anywhere touched by this work.
- Existing `Persisted` (version 2) format must stay backward-compatible — old saved progress must load without a migration step or version bump.
- `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build` must all pass before any push.
- Per-round code-splitting is explicitly out of scope (evaluated and dropped: Home needs the full `questions` array for its landing-page counts, so splitting would not reduce time-to-interactive on the common path).

---

## 1. SM-2 spaced repetition

**Files:** `src/types.ts`, `src/lib/queue.ts`, `src/lib/storage.ts`, `src/__tests__/queue.test.ts`, `src/__tests__/data.test.ts` (if it asserts on `ProgressEntry` shape).

`ProgressEntry` gains three optional fields so existing saved data keeps validating with no version bump:

```ts
export interface ProgressEntry {
  rating: Rating;
  seen: number;
  lastSeen: number;
  dueAt?: number;      // ms epoch; absent means "due now" (never scheduled)
  interval?: number;   // days until next due, after the last rating
  easeFactor?: number; // SM-2 ease factor, starts at 2.5
}
```

`storage.ts`'s `isEntry` validator accepts these three as optional numbers (present or `undefined`); nothing else about validation changes.

New pure function in `queue.ts`, replacing `bucket()`:

```ts
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

// SM-2, quality collapsed from our 3-value rating: weak=fail (quality 2),
// ok=pass (quality 3), solid=pass (quality 5). A fail always resets the
// interval to 1 day; a pass grows it by the ease factor (first pass = 1 day,
// second pass = 6 days, every pass after that = interval * easeFactor).
export function nextInterval(
  rating: Rating,
  prevInterval: number,
  prevEase: number,
): { interval: number; easeFactor: number } {
  const quality = rating === 1 ? 2 : rating === 2 ? 3 : 5;
  const ease = Math.max(MIN_EASE, prevEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  if (quality < 3) return { interval: 1, easeFactor: ease };
  if (prevInterval <= 0) return { interval: 1, easeFactor: ease };
  if (prevInterval === 1) return { interval: 6, easeFactor: ease };
  return { interval: Math.round(prevInterval * ease), easeFactor: ease };
}
```

`useAppState.ts`'s `rate` action calls `nextInterval` with the entry's previous `interval`/`easeFactor` (defaulting to `0`/`DEFAULT_EASE` when absent) and stores the result plus `dueAt = now + interval * 86_400_000` alongside the existing `rating`/`seen`/`lastSeen` fields.

`orderQueue` in `queue.ts` sorts by `dueAt` ascending, with never-scheduled questions (`dueAt` absent, i.e. never rated) sorting first — same "you haven't seen this at all yet" priority the current bucket sort gives unrated questions:

```ts
const dueAt = (progress: Progress, id: string): number => progress[id]?.dueAt ?? 0;

export function orderQueue(questions: Question[], progress: Progress): Question[] {
  return [...questions].sort((a, b) => dueAt(progress, a.id) - dueAt(progress, b.id));
}
```

`roundStats` is unchanged — it already reads `rating` only, not scheduling fields.

**Testing:** unit tests for `nextInterval` covering weak (resets to 1, ease drops), first-ever ok/solid pass (interval 1), second pass (interval 6), later passes (multiplies by ease), and ease floor (`MIN_EASE`). Existing `orderQueue`/`nextQuestion` tests get updated to seed `dueAt` instead of `rating` where they assert ordering.

## 2. Debounced localStorage writes

**Files:** `src/hooks/useAppState.ts`, `src/__tests__/useAppState.test.ts` (or wherever its tests live).

Replace the synchronous per-render `save(state)` effect with a 500ms debounce, plus a `pagehide` listener that flushes synchronously so a tab close mid-debounce never drops the last write:

```ts
export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, () => load());
  const [saveFailed, setSaveFailed] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const timer = setTimeout(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSaveFailed(!save(state));
    }, 500);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const flush = () => save(stateRef.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  return { state, dispatch, saveFailed };
}
```

**Testing:** use fake timers to assert `save` is not called before 500ms, is called once after, and that rapid successive dispatches coalesce into a single write (advance timers only once at the end). Assert `pagehide` triggers an immediate `save` regardless of the pending timer.

## 3. Light theme

**Files:** `src/hooks/useTheme.ts`, `src/components/ThemeToggle.tsx`, `src/index.css`, `index.html`.

`THEMES` becomes `['dark', 'gruvbox', 'light'] as const`. `ThemeToggle`'s `LABELS` gets `light: 'Light'`.

`index.css`'s `@custom-variant dark` currently fires for *any* `data-theme` value (gruvbox rides on `dark:` utilities). Narrow it to the two dark themes:

```css
@custom-variant dark (&:where([data-theme='dark'] *, [data-theme='dark'], [data-theme='gruvbox'] *, [data-theme='gruvbox']));
```

No new color tokens: the undecorated (non-`dark:`) zinc/emerald/red/amber classes already are a light palette, so `data-theme="light"` needs no `[data-theme='light']` color block, only to be excluded from the `dark:` selector above (which it already is, implicitly, by not being listed).

`:root { color-scheme: dark; }` becomes theme-aware so native form controls/scrollbars match:

```css
:root { color-scheme: dark; }
[data-theme='light'] { color-scheme: light; }
```

`index.html`'s pre-paint script currently only special-cases `'gruvbox'`; it must also set `data-theme="light"` before first paint (default stays `dark`, set statically on `<html>` same as today):

```js
try {
  var t = localStorage.getItem('interview-prep:theme');
  if (t === 'gruvbox' || t === 'light') document.documentElement.dataset.theme = t;
} catch (e) { /* storage unavailable: keep the default */ }
```

**Testing:** extend existing `useTheme`/`ThemeToggle` tests to cover the third option; no new test file needed. Manual verification in the browser preview (not a jsdom-testable concern — jsdom doesn't compute actual CSS variable resolution).

## 4. Scratch editor for build prompts

**Files:** `src/components/QuestionCard.tsx`.

For questions where `question.round === 'coding' && question.category === 'Build prompts'`, render an editable `<textarea>` pre-filled with `question.code`, placed where the read-only `<pre><code>` block currently renders (only for this category — every other round's `code` field stays the existing read-only review-snippet display). State is local to the component (`useState`, keyed by `question.id` via a `key` prop so switching questions resets it) and is **not** persisted — it is a scratchpad, not saved state, matching the deliberate "write in your own editor" philosophy the rest of the app already documents.

```tsx
const isBuildPrompt = question.round === 'coding' && question.category === 'Build prompts';

{question.code && (
  isBuildPrompt ? (
    <textarea
      key={question.id}
      defaultValue={question.code}
      spellCheck={false}
      rows={question.code.split('\n').length + 2}
      className="mb-4 w-full overflow-x-auto rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800"
    />
  ) : (
    <pre className="mb-4 overflow-x-auto rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800">
      <code>{question.code}</code>
    </pre>
  )
)}
```

**Testing:** a test asserting a Build prompts question renders a textarea with the starter code as its value, and a non-Build-prompts question with a `code` field still renders the read-only `<pre>`.

## 5. Strict mode (countdown timer)

**Files:** `src/hooks/useStrictMode.ts` (new, mirrors `useTheme.ts`'s shape), `src/App.tsx`, `src/components/QuestionCard.tsx`.

A new per-device boolean preference, same pattern as theme (own localStorage key, not part of `Persisted`/export-import, so it doesn't need a schema version):

```ts
// src/hooks/useStrictMode.ts
import { useEffect, useState } from 'react';

export const STRICT_MODE_KEY = 'interview-prep:strict-mode';

export function useStrictMode(): [boolean, (v: boolean) => void] {
  const [strict, setStrict] = useState<boolean>(() => {
    try { return localStorage.getItem(STRICT_MODE_KEY) === '1'; } catch { return false; }
  });
  useEffect(() => {
    try {
      if (strict) localStorage.setItem(STRICT_MODE_KEY, '1');
      else localStorage.removeItem(STRICT_MODE_KEY);
    } catch { /* empty */ }
  }, [strict]);
  return [strict, setStrict];
}
```

`App.tsx` renders a toggle button next to `ThemeToggle` in the header, passes `strictMode` down to `RoundView`/`Practice`/`MockSession`/`Browse` the same way `state`/`dispatch` already flow, ultimately reaching `QuestionCard` as a new `strictMode?: boolean` prop (default `false`, so `Browse`'s always-revealed usage is unaffected).

In `QuestionCard`, when `strictMode` is true and `targetSeconds` is defined: instead of the existing "nothing happens until you click Reveal" behavior, a `setInterval`-driven countdown ticks down from `targetSeconds`; reaching 0 calls `handleReveal()` automatically. The post-reveal time line shows `"(out of time)"` instead of the elapsed time when the auto-reveal path fired, so it reads distinctly from a normal early reveal. The interval is cleared on reveal (manual or automatic) and on unmount.

**Testing:** fake-timer test asserting that with `strictMode` on and `targetSeconds` set, advancing time past the target auto-calls `onReveal` and renders "(out of time)"; a test asserting strict mode with no `targetSeconds` behaves exactly like today (no countdown, since some rounds — case study — have long targets where a hard countdown doesn't make sense... actually all rounds have `targetSeconds` today, so this branch only guards future rounds without one).

---

## Out of scope (explicitly dropped)

- **Per-round code-splitting** — evaluated during design; Home needs the full `questions` array for its landing-page counts, so it wouldn't reduce time-to-interactive on the actual first-load path. Dropped, not deferred.
