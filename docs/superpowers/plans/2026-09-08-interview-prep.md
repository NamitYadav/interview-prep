# Staff Frontend Interview Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static React SPA that drills staff-frontend interview questions per round, reveals model answers, records self-ratings, and resurfaces weak questions first.

**Architecture:** Vite + React 19 SPA with no router; view state mirrored to `location.hash`. All content is static TypeScript data in `src/data/`. One reducer owns progress and notes, persisted to localStorage under one key. Pure functions in `src/lib/` (queue ordering, storage parsing) carry the logic and the tests.

**Tech Stack:** Vite 8, React 19.2, TypeScript 5.9 (strict), Tailwind CSS 4, Vitest 5, React Testing Library 16, jsdom, GitHub Actions → GitHub Pages.

Spec: `docs/superpowers/specs/2026-09-08-interview-prep-design.md`

## Global Constraints

- Repo root is `/Users/namit/personal/interview-prep`. Every command in this plan runs from there.
- Package manager: `npm`. Pin `typescript` to `~5.9.0` (v7 is the Go compiler; do not use it).
- No additional runtime dependencies beyond `react`, `react-dom`. No router, no state lib, no markdown lib, no UI kit.
- Vite `base` is `/interview-prep/`.
- localStorage key is `interview-prep:v1`; corrupt payload is moved to `interview-prep:v1:corrupt`.
- Question ids match `^(hr|hm|case|debrief|hoe)-\d{3}$` and are unique across all rounds.
- Every round has ≥ 20 questions; targets: hr 25, hm 50, case 35, debrief 30, hoe 30.
- Committed content is generic with `[your project]`-style placeholders. No real employer-internal facts, no real STAR stories, no personal contact details. Resume-derived *questions* are fine; answers coach what to cover.
- Rating scale is `1 | 2 | 3` = Weak / OK / Solid.
- Practice keyboard: `Space` reveal, `1`/`2`/`3` rate, `n` skip; all ignored while focus is in an `input` or `textarea`.
- Commit after each task with a Conventional Commit message. Run `npm test -- --run` and `npm run build` before every commit from Task 6 onward.

## File Structure

```
interview-prep/
  .github/workflows/pages.yml         Task 15  build + deploy to Pages
  index.html                          Task 1   Vite entry, <title>
  package.json                        Task 1   scripts: dev, build, preview, test, typecheck
  vite.config.ts                      Task 1   react + tailwind plugins, base, vitest config
  tsconfig.json                       Task 1   strict, bundler resolution
  README.md                           Task 15
  src/
    main.tsx                          Task 1   mount <App/>
    index.css                         Task 1   @import "tailwindcss"; base styles
    setupTests.ts                     Task 1   jest-dom matchers
    types.ts                          Task 2   RoundId, Round, Question, Rating, Progress, Notes, Persisted
    data/index.ts                     Task 2   rounds[], questions[], questionsByRound()
    data/hr.ts                        Task 9   25 questions
    data/hm.ts                        Task 10  50 questions
    data/case.ts                      Task 11  35 questions
    data/debrief.ts                   Task 12  30 questions
    data/hoe.ts                       Task 13  30 questions
    lib/storage.ts                    Task 3   load/save/parseBackup/backupFilename
    lib/queue.ts                      Task 4   orderQueue/nextQuestion/roundStats
    hooks/useAppState.ts              Task 5   reducer + persisted hook
    hooks/useHashRoute.ts             Task 6   RoundId | null ↔ location.hash
    components/ProgressBar.tsx        Task 6
    components/ExportImport.tsx       Task 6
    components/Home.tsx               Task 6
    App.tsx                           Task 6   home/round switch, save-failed banner
    components/QuestionCard.tsx       Task 7   question, reveal, answer, note, rating buttons
    components/Practice.tsx           Task 7   queue-driven single card + keyboard
    components/Browse.tsx             Task 8   search + expandable list
    components/RoundView.tsx          Task 8   tabs + category filter + back
    __tests__/data.test.ts            Task 2, extended Task 13
    __tests__/storage.test.ts         Task 3
    __tests__/queue.test.ts           Task 4
    __tests__/store.test.ts           Task 5
    __tests__/Practice.test.tsx       Task 7
```

---

### Task 1: Scaffold project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/setupTests.ts`, `.gitignore`
- Test: `src/__tests__/smoke.test.tsx` (deleted in Task 7 once real tests exist)

**Interfaces:**
- Produces: `npm run dev|build|test|typecheck` scripts; Vitest configured with jsdom and jest-dom.

- [ ] **Step 1: Scaffold with Vite and install deps**

```bash
cd /Users/namit/personal/interview-prep
npm create vite@latest . -- --template react-ts
npm install
npm install -D typescript@~5.9.0 tailwindcss @tailwindcss/vite vitest@^5 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
If `npm create vite` refuses because the directory is non-empty (it contains `.git` and `docs/`), choose "Ignore files and continue".

- [ ] **Step 2: Replace `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/interview-prep/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
```

- [ ] **Step 3: Replace `tsconfig.json`** (delete `tsconfig.app.json` / `tsconfig.node.json` if the template created them)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: Set scripts in `package.json`**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "typecheck": "tsc"
}
```
Remove any `lint` script and the eslint devDependencies the template added.

- [ ] **Step 5: Write `src/index.css`, `src/setupTests.ts`, `src/main.tsx`, `src/App.tsx`, `index.html`**

`src/index.css`:
```css
@import "tailwindcss";

:root { color-scheme: light dark; }
body { @apply bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 antialiased; }
```

`src/setupTests.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (temporary, replaced in Task 6):
```tsx
export default function App() {
  return <h1 className="p-6 text-2xl font-semibold">Interview Prep</h1>;
}
```

`index.html`: keep the template but set `<title>Interview Prep</title>` and `<html lang="en">`. Delete `src/App.css`, `src/assets/`, `public/vite.svg` and the favicon link.

- [ ] **Step 6: Write smoke test `src/__tests__/smoke.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /interview prep/i })).toBeInTheDocument();
});
```

- [ ] **Step 7: Run everything**

Run: `npm test -- --run && npm run build`
Expected: 1 test passes; `dist/` created with `index.html` referencing `/interview-prep/assets/...`.

- [ ] **Step 8: Ensure `.gitignore` has `node_modules`, `dist`, `*.local`, `.DS_Store`; commit**

```bash
git add -A
git commit -m "chore: scaffold vite + react 19 + tailwind 4 + vitest"
```

---

### Task 2: Types and data index

**Files:**
- Create: `src/types.ts`, `src/data/index.ts`, `src/data/hr.ts`, `src/data/hm.ts`, `src/data/case.ts`, `src/data/debrief.ts`, `src/data/hoe.ts` (each exporting an empty array for now)
- Test: `src/__tests__/data.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/types.ts
  export type RoundId = 'hr' | 'hm' | 'case' | 'debrief' | 'hoe';
  export interface Round { id: RoundId; title: string; blurb: string }
  export interface Question { id: string; round: RoundId; category: string; question: string; answer: string[]; keyPoints: string[]; followUps?: string[] }
  export type Rating = 1 | 2 | 3;
  export interface ProgressEntry { rating: Rating; seen: number; lastSeen: number }
  export type Progress = Record<string, ProgressEntry>;
  export type Notes = Record<string, string>;
  export interface Persisted { version: 1; progress: Progress; notes: Notes }
  // src/data/index.ts
  export const ROUND_IDS: readonly RoundId[];
  export const rounds: Round[];
  export const questions: Question[];
  export function questionsByRound(id: RoundId): Question[];
  ```

- [ ] **Step 1: Write `src/types.ts`** with exactly the block above.

- [ ] **Step 2: Write the failing data test `src/__tests__/data.test.ts`**

```ts
import { describe, expect, test } from 'vitest';
import { ROUND_IDS, questions, rounds } from '../data';

const ID_RE = /^(hr|hm|case|debrief|hoe)-\d{3}$/;

describe('question bank', () => {
  test('rounds cover every RoundId once', () => {
    expect(rounds.map((r) => r.id).sort()).toEqual([...ROUND_IDS].sort());
  });

  test('ids are unique and well-formed', () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(ID_RE);
  });

  test('id prefix matches round', () => {
    for (const q of questions) expect(q.id.startsWith(`${q.round}-`)).toBe(true);
  });

  test('required fields are non-empty', () => {
    for (const q of questions) {
      expect(q.question.trim().length, q.id).toBeGreaterThan(0);
      expect(q.category.trim().length, q.id).toBeGreaterThan(0);
      expect(q.answer.length, q.id).toBeGreaterThan(0);
      expect(q.keyPoints.length, q.id).toBeGreaterThan(0);
      for (const p of [...q.answer, ...q.keyPoints, ...(q.followUps ?? [])]) {
        expect(p.trim().length, q.id).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --run src/__tests__/data.test.ts`
Expected: FAIL, cannot resolve `../data`.

- [ ] **Step 4: Write the five empty data files**, each identical except the name:

```ts
// src/data/hr.ts  (same shape for hm.ts, case.ts, debrief.ts, hoe.ts)
import type { Question } from '../types';

export const hr: Question[] = [];
```
Export names: `hr`, `hm`, `caseStudy` (file `case.ts`; `case` is a reserved word), `debrief`, `hoe`.

- [ ] **Step 5: Write `src/data/index.ts`**

```ts
import type { Question, Round, RoundId } from '../types';
import { hr } from './hr';
import { hm } from './hm';
import { caseStudy } from './case';
import { debrief } from './debrief';
import { hoe } from './hoe';

export const ROUND_IDS = ['hr', 'hm', 'case', 'debrief', 'hoe'] as const satisfies readonly RoundId[];

export const rounds: Round[] = [
  { id: 'hr', title: 'HR screen', blurb: 'Motivation, logistics, compensation framing, German employment basics.' },
  { id: 'hm', title: 'Hiring manager', blurb: 'Technical depth and behavioral stories at staff scope.' },
  { id: 'case', title: 'Case study', blurb: 'Scoping, building and presenting the take-home.' },
  { id: 'debrief', title: 'Case study debrief', blurb: 'The panel grills your trade-offs, edge cases and what you would change.' },
  { id: 'hoe', title: 'Head of engineering', blurb: 'Vision, org impact, culture, and the questions you ask them.' },
];

export const questions: Question[] = [...hr, ...hm, ...caseStudy, ...debrief, ...hoe];

export function questionsByRound(id: RoundId): Question[] {
  return questions.filter((q) => q.round === id);
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- --run`
Expected: all pass (the bank is empty, so the loops are vacuous).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: question bank types, round metadata and integrity tests"
```

---

### Task 3: Storage: load, save, backup parse

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: `Persisted` from `src/types.ts`.
- Produces:
  ```ts
  export const STORAGE_KEY = 'interview-prep:v1';
  export const CORRUPT_KEY = 'interview-prep:v1:corrupt';
  export const EMPTY: Persisted;                       // { version: 1, progress: {}, notes: {} }
  export function load(storage?: Storage): Persisted;  // never throws
  export function save(data: Persisted, storage?: Storage): boolean;  // false on failure
  export function parseBackup(text: string): Persisted;  // throws Error(message) on invalid
  export function backupFilename(date?: Date): string;  // interview-prep-backup-YYYY-MM-DD.json
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, test } from 'vitest';
import { CORRUPT_KEY, EMPTY, STORAGE_KEY, backupFilename, load, parseBackup, save } from '../lib/storage';

const valid = { version: 1, progress: { 'hr-001': { rating: 2, seen: 1, lastSeen: 5 } }, notes: { 'hr-001': 'hi' } };

beforeEach(() => localStorage.clear());

describe('load', () => {
  test('returns EMPTY when nothing stored', () => {
    expect(load()).toEqual(EMPTY);
  });
  test('returns stored data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    expect(load()).toEqual(valid);
  });
  test('moves corrupt JSON aside and returns EMPTY', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(load()).toEqual(EMPTY);
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{not json');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  test('treats wrong shape as corrupt', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }));
    expect(load()).toEqual(EMPTY);
    expect(localStorage.getItem(CORRUPT_KEY)).not.toBeNull();
  });
});

describe('save', () => {
  test('writes JSON and returns true', () => {
    expect(save(valid as never)).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(valid);
  });
  test('returns false when storage throws', () => {
    const broken = { setItem: () => { throw new Error('quota'); } } as unknown as Storage;
    expect(save(EMPTY, broken)).toBe(false);
  });
});

describe('parseBackup', () => {
  test('accepts a valid backup', () => {
    expect(parseBackup(JSON.stringify(valid))).toEqual(valid);
  });
  test.each([
    ['not json', 'Not valid JSON'],
    [JSON.stringify({ version: 2, progress: {}, notes: {} }), 'Unsupported backup version'],
    [JSON.stringify({ version: 1, progress: [], notes: {} }), 'progress must be an object'],
    [JSON.stringify({ version: 1, progress: { a: { rating: 4, seen: 1, lastSeen: 1 } }, notes: {} }), 'Invalid progress entry for a'],
    [JSON.stringify({ version: 1, progress: {}, notes: { a: 1 } }), 'Invalid note for a'],
  ])('rejects %s', (text, message) => {
    expect(() => parseBackup(text)).toThrow(message);
  });
});

test('backupFilename uses the date', () => {
  expect(backupFilename(new Date('2026-09-08T10:00:00Z'))).toBe('interview-prep-backup-2026-09-08.json');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/__tests__/storage.test.ts`
Expected: FAIL, cannot resolve `../lib/storage`.

- [ ] **Step 3: Implement `src/lib/storage.ts`**

```ts
import type { Persisted, ProgressEntry } from '../types';

export const STORAGE_KEY = 'interview-prep:v1';
export const CORRUPT_KEY = 'interview-prep:v1:corrupt';
export const EMPTY: Persisted = { version: 1, progress: {}, notes: {} };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isEntry = (v: unknown): v is ProgressEntry =>
  isRecord(v) &&
  (v.rating === 1 || v.rating === 2 || v.rating === 3) &&
  typeof v.seen === 'number' &&
  typeof v.lastSeen === 'number';

/** Validates an unknown value as Persisted. Throws Error with a user-facing message. */
export function validate(raw: unknown): Persisted {
  if (!isRecord(raw)) throw new Error('Backup must be a JSON object');
  if (raw.version !== 1) throw new Error('Unsupported backup version');
  if (!isRecord(raw.progress)) throw new Error('progress must be an object');
  if (!isRecord(raw.notes)) throw new Error('notes must be an object');
  for (const [id, entry] of Object.entries(raw.progress)) {
    if (!isEntry(entry)) throw new Error(`Invalid progress entry for ${id}`);
  }
  for (const [id, note] of Object.entries(raw.notes)) {
    if (typeof note !== 'string') throw new Error(`Invalid note for ${id}`);
  }
  return { version: 1, progress: raw.progress as Persisted['progress'], notes: raw.notes as Persisted['notes'] };
}

export function parseBackup(text: string): Persisted {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Not valid JSON');
  }
  return validate(raw);
}

export function load(storage: Storage = localStorage): Persisted {
  let text: string | null = null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (text === null) return EMPTY;
  try {
    return parseBackup(text);
  } catch {
    try {
      storage.setItem(CORRUPT_KEY, text);
      storage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing else to do */
    }
    return EMPTY;
  }
}

export function save(data: Persisted, storage: Storage = localStorage): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function backupFilename(date: Date = new Date()): string {
  return `interview-prep-backup-${date.toISOString().slice(0, 10)}.json`;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run src/__tests__/storage.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/__tests__/storage.test.ts
git commit -m "feat: localStorage load/save with corrupt recovery and backup validation"
```

---

### Task 4: Queue ordering and round stats

**Files:**
- Create: `src/lib/queue.ts`
- Test: `src/__tests__/queue.test.ts`

**Interfaces:**
- Consumes: `Question`, `Progress`, `Rating` from `src/types.ts`.
- Produces:
  ```ts
  export function orderQueue(questions: Question[], progress: Progress): Question[];
  export function nextQuestion(questions: Question[], progress: Progress, exclude?: ReadonlySet<string>): Question | undefined;
  export interface RoundStats { total: number; unrated: number; weak: number; ok: number; solid: number }
  export function roundStats(questions: Question[], progress: Progress): RoundStats;
  ```
  Order: unrated → rating 1 → rating 2 → rating 3; within a bucket ascending `lastSeen` (unrated = 0); ties keep input order. `nextQuestion` returns the first ordered question whose id is not in `exclude`; if that leaves nothing and `exclude` is non-empty, it falls back to the first ordered question.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, test } from 'vitest';
import type { Progress, Question } from '../types';
import { nextQuestion, orderQueue, roundStats } from '../lib/queue';

const q = (id: string): Question => ({
  id, round: 'hm', category: 'X', question: id, answer: ['a'], keyPoints: ['k'],
});
const qs = ['a', 'b', 'c', 'd', 'e'].map(q);

describe('orderQueue', () => {
  test('unrated first, then weak, ok, solid', () => {
    const progress: Progress = {
      a: { rating: 3, seen: 1, lastSeen: 10 },
      b: { rating: 1, seen: 1, lastSeen: 10 },
      c: { rating: 2, seen: 1, lastSeen: 10 },
    };
    expect(orderQueue(qs, progress).map((x) => x.id)).toEqual(['d', 'e', 'b', 'c', 'a']);
  });

  test('within a bucket, oldest lastSeen first', () => {
    const progress: Progress = {
      a: { rating: 1, seen: 1, lastSeen: 30 },
      b: { rating: 1, seen: 1, lastSeen: 10 },
      c: { rating: 1, seen: 1, lastSeen: 20 },
      d: { rating: 1, seen: 1, lastSeen: 10 },
      e: { rating: 1, seen: 1, lastSeen: 5 },
    };
    expect(orderQueue(qs, progress).map((x) => x.id)).toEqual(['e', 'b', 'd', 'c', 'a']);
  });

  test('does not mutate input', () => {
    const copy = [...qs];
    orderQueue(qs, {});
    expect(qs).toEqual(copy);
  });
});

describe('nextQuestion', () => {
  test('returns head of queue', () => {
    expect(nextQuestion(qs, {})?.id).toBe('a');
  });
  test('skips excluded ids', () => {
    expect(nextQuestion(qs, {}, new Set(['a', 'b']))?.id).toBe('c');
  });
  test('falls back to head when everything is excluded', () => {
    expect(nextQuestion(qs, {}, new Set(['a', 'b', 'c', 'd', 'e']))?.id).toBe('a');
  });
  test('undefined for empty list', () => {
    expect(nextQuestion([], {})).toBeUndefined();
  });
});

describe('roundStats', () => {
  test('counts buckets', () => {
    const progress: Progress = {
      a: { rating: 3, seen: 1, lastSeen: 1 },
      b: { rating: 1, seen: 1, lastSeen: 1 },
      c: { rating: 2, seen: 1, lastSeen: 1 },
      zzz: { rating: 3, seen: 1, lastSeen: 1 }, // not in this round, ignored
    };
    expect(roundStats(qs, progress)).toEqual({ total: 5, unrated: 2, weak: 1, ok: 1, solid: 1 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/__tests__/queue.test.ts`
Expected: FAIL, cannot resolve `../lib/queue`.

- [ ] **Step 3: Implement `src/lib/queue.ts`**

```ts
import type { Progress, Question } from '../types';

// ponytail: bucket sort, not SM-2. Upgrade to SM-2 intervals if the queue feels repetitive.
const bucket = (progress: Progress, id: string): number => progress[id]?.rating ?? 0;
const lastSeen = (progress: Progress, id: string): number => progress[id]?.lastSeen ?? 0;

export function orderQueue(questions: Question[], progress: Progress): Question[] {
  return [...questions].sort(
    (a, b) =>
      bucket(progress, a.id) - bucket(progress, b.id) ||
      lastSeen(progress, a.id) - lastSeen(progress, b.id),
  );
}

export function nextQuestion(
  questions: Question[],
  progress: Progress,
  exclude: ReadonlySet<string> = new Set(),
): Question | undefined {
  const ordered = orderQueue(questions, progress);
  return ordered.find((q) => !exclude.has(q.id)) ?? ordered[0];
}

export interface RoundStats {
  total: number;
  unrated: number;
  weak: number;
  ok: number;
  solid: number;
}

export function roundStats(questions: Question[], progress: Progress): RoundStats {
  const stats: RoundStats = { total: questions.length, unrated: 0, weak: 0, ok: 0, solid: 0 };
  for (const q of questions) {
    const r = progress[q.id]?.rating;
    if (r === 1) stats.weak++;
    else if (r === 2) stats.ok++;
    else if (r === 3) stats.solid++;
    else stats.unrated++;
  }
  return stats;
}
```
`Array.prototype.sort` is stable in ES2019+, which gives the "ties keep input order" guarantee.

- [ ] **Step 4: Run tests**

Run: `npm test -- --run src/__tests__/queue.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/queue.ts src/__tests__/queue.test.ts
git commit -m "feat: weak-first queue ordering and round stats"
```

---

### Task 5: App state reducer and persisted hook

**Files:**
- Create: `src/hooks/useAppState.ts`
- Test: `src/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `Persisted`, `Rating` from `src/types.ts`; `load`, `save`, `EMPTY` from `src/lib/storage.ts`.
- Produces:
  ```ts
  export type Action =
    | { type: 'rate'; id: string; rating: Rating; now: number }
    | { type: 'note'; id: string; text: string }
    | { type: 'import'; data: Persisted }
    | { type: 'reset' };
  export function reducer(state: Persisted, action: Action): Persisted;
  export function useAppState(): { state: Persisted; dispatch: React.Dispatch<Action>; saveFailed: boolean };
  ```
  `rate` sets `{ rating, seen: previous.seen + 1, lastSeen: now }`. `note` with empty/whitespace text deletes the note. `import` replaces the whole state. `reset` returns `EMPTY`.

- [ ] **Step 1: Write the failing tests**

```ts
import { beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { EMPTY, STORAGE_KEY } from '../lib/storage';
import { reducer, useAppState } from '../hooks/useAppState';

beforeEach(() => localStorage.clear());

describe('reducer', () => {
  test('rate creates an entry with seen=1', () => {
    const s = reducer(EMPTY, { type: 'rate', id: 'hm-001', rating: 2, now: 100 });
    expect(s.progress['hm-001']).toEqual({ rating: 2, seen: 1, lastSeen: 100 });
  });
  test('rate increments seen and overwrites rating', () => {
    let s = reducer(EMPTY, { type: 'rate', id: 'hm-001', rating: 1, now: 100 });
    s = reducer(s, { type: 'rate', id: 'hm-001', rating: 3, now: 200 });
    expect(s.progress['hm-001']).toEqual({ rating: 3, seen: 2, lastSeen: 200 });
  });
  test('note sets and blank note deletes', () => {
    let s = reducer(EMPTY, { type: 'note', id: 'hm-001', text: 'STAR story' });
    expect(s.notes['hm-001']).toBe('STAR story');
    s = reducer(s, { type: 'note', id: 'hm-001', text: '   ' });
    expect(s.notes).toEqual({});
  });
  test('import replaces state', () => {
    const data = { version: 1 as const, progress: { x: { rating: 1 as const, seen: 1, lastSeen: 1 } }, notes: {} };
    expect(reducer(EMPTY, { type: 'import', data })).toEqual(data);
  });
  test('reset returns EMPTY', () => {
    const s = reducer(EMPTY, { type: 'rate', id: 'a', rating: 1, now: 1 });
    expect(reducer(s, { type: 'reset' })).toEqual(EMPTY);
  });
  test('does not mutate previous state', () => {
    const before = structuredClone(EMPTY);
    reducer(EMPTY, { type: 'rate', id: 'a', rating: 1, now: 1 });
    expect(EMPTY).toEqual(before);
  });
});

describe('useAppState', () => {
  test('loads from storage and persists changes', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, progress: {}, notes: { a: 'hi' } }));
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.notes.a).toBe('hi');
    act(() => result.current.dispatch({ type: 'rate', id: 'b', rating: 3, now: 5 }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).progress.b).toEqual({ rating: 3, seen: 1, lastSeen: 5 });
    expect(result.current.saveFailed).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/__tests__/store.test.ts`
Expected: FAIL, cannot resolve `../hooks/useAppState`.

- [ ] **Step 3: Implement `src/hooks/useAppState.ts`**

```ts
import { useEffect, useReducer, useState } from 'react';
import type { Persisted, Rating } from '../types';
import { EMPTY, load, save } from '../lib/storage';

export type Action =
  | { type: 'rate'; id: string; rating: Rating; now: number }
  | { type: 'note'; id: string; text: string }
  | { type: 'import'; data: Persisted }
  | { type: 'reset' };

export function reducer(state: Persisted, action: Action): Persisted {
  switch (action.type) {
    case 'rate': {
      const prev = state.progress[action.id];
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.id]: { rating: action.rating, seen: (prev?.seen ?? 0) + 1, lastSeen: action.now },
        },
      };
    }
    case 'note': {
      const notes = { ...state.notes };
      if (action.text.trim() === '') delete notes[action.id];
      else notes[action.id] = action.text;
      return { ...state, notes };
    }
    case 'import':
      return action.data;
    case 'reset':
      return EMPTY;
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, () => load());
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setSaveFailed(!save(state));
  }, [state]);

  return { state, dispatch, saveFailed };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAppState.ts src/__tests__/store.test.ts
git commit -m "feat: app state reducer with localStorage persistence"
```

---

### Task 6: Home screen, hash routing, export/import, App shell

**Files:**
- Create: `src/hooks/useHashRoute.ts`, `src/components/ProgressBar.tsx`, `src/components/ExportImport.tsx`, `src/components/Home.tsx`
- Modify: `src/App.tsx` (replace the Task 1 stub)
- Delete: `src/__tests__/smoke.test.tsx` (App now needs full wiring; Practice test in Task 7 covers rendering)

**Interfaces:**
- Consumes: `rounds`, `questionsByRound` (Task 2); `roundStats` (Task 4); `useAppState`, `Action` (Task 5); `parseBackup`, `backupFilename` (Task 3).
- Produces:
  ```ts
  // useHashRoute.ts
  export function useHashRoute(): [RoundId | null, (id: RoundId | null) => void];
  // ProgressBar.tsx
  export function ProgressBar(props: { value: number; max: number; label: string }): JSX.Element;
  // ExportImport.tsx
  export function ExportImport(props: { state: Persisted; dispatch: Dispatch<Action> }): JSX.Element;
  // Home.tsx
  export function Home(props: { state: Persisted; dispatch: Dispatch<Action>; onOpen: (id: RoundId) => void }): JSX.Element;
  ```
  `RoundView` (Task 8) is imported by `App.tsx`; until Task 8 lands, `App.tsx` renders a placeholder `<RoundView>` stub defined in Step 5 below. Task 8 replaces the stub with the real component.

- [ ] **Step 1: Write `src/hooks/useHashRoute.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { ROUND_IDS } from '../data';
import type { RoundId } from '../types';

const fromHash = (): RoundId | null => {
  const h = window.location.hash.replace(/^#/, '');
  return (ROUND_IDS as readonly string[]).includes(h) ? (h as RoundId) : null;
};

export function useHashRoute(): [RoundId | null, (id: RoundId | null) => void] {
  const [route, setRoute] = useState<RoundId | null>(fromHash);

  useEffect(() => {
    const onChange = () => setRoute(fromHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((id: RoundId | null) => {
    window.location.hash = id ?? '';
    setRoute(id);
  }, []);

  return [route, navigate];
}
```

- [ ] **Step 2: Write `src/components/ProgressBar.tsx`**

```tsx
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800"
    >
      <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}
```

- [ ] **Step 3: Write `src/components/ExportImport.tsx`**

```tsx
import { useRef, useState, type Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { backupFilename, parseBackup } from '../lib/storage';

export function ExportImport({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename();
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      dispatch({ type: 'import', data: parseBackup(await file.text()) });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reset = () => {
    if (window.confirm('Delete all ratings and notes? Export first if you want a backup.')) {
      dispatch({ type: 'reset' });
    }
  };

  const btn = 'rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={btn} onClick={exportJson}>Export</button>
      <button type="button" className={btn} onClick={() => fileRef.current?.click()}>Import</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import backup file"
        onChange={(e) => void importJson(e.target.files?.[0])}
      />
      <button type="button" className={`${btn} text-red-600 dark:text-red-400`} onClick={reset}>Reset progress</button>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Write `src/components/Home.tsx`**

```tsx
import type { Dispatch } from 'react';
import type { Persisted, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound, rounds } from '../data';
import { roundStats } from '../lib/queue';
import { ExportImport } from './ExportImport';
import { ProgressBar } from './ProgressBar';

export function Home({ state, dispatch, onOpen }: { state: Persisted; dispatch: Dispatch<Action>; onOpen: (id: RoundId) => void }) {
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Interview Prep</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Staff frontend · Berlin / EU loop</p>
        </div>
        <ExportImport state={state} dispatch={dispatch} />
      </header>
      <ol className="grid gap-3 sm:grid-cols-2">
        {rounds.map((round, i) => {
          const s = roundStats(questionsByRound(round.id), state.progress);
          return (
            <li key={round.id}>
              <button
                type="button"
                onClick={() => onOpen(round.id)}
                className="block w-full rounded-lg border border-zinc-200 bg-white p-4 text-left hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Round {i + 1}</div>
                <h2 className="font-medium">{round.title}</h2>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{round.blurb}</p>
                <ProgressBar value={s.solid} max={s.total} label={`${round.title} progress`} />
                <p className="mt-2 text-xs text-zinc-500">
                  {s.solid}/{s.total} solid · {s.ok} ok · {s.weak} weak · {s.unrated} unrated
                </p>
              </button>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
```

- [ ] **Step 5: Replace `src/App.tsx`**

```tsx
import { useAppState } from './hooks/useAppState';
import { useHashRoute } from './hooks/useHashRoute';
import { Home } from './components/Home';
import { RoundView } from './components/RoundView';

export default function App() {
  const { state, dispatch, saveFailed } = useAppState();
  const [route, navigate] = useHashRoute();

  return (
    <>
      {saveFailed && (
        <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          Progress is not being saved (storage unavailable). Export before closing the tab.
        </div>
      )}
      {route === null ? (
        <Home state={state} dispatch={dispatch} onOpen={navigate} />
      ) : (
        <RoundView roundId={route} state={state} dispatch={dispatch} onBack={() => navigate(null)} />
      )}
    </>
  );
}
```

Temporary `src/components/RoundView.tsx` so the build passes (replaced in Task 8):
```tsx
import type { Dispatch } from 'react';
import type { Persisted, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';

export function RoundView({ roundId, onBack }: { roundId: RoundId; state: Persisted; dispatch: Dispatch<Action>; onBack: () => void }) {
  return (
    <main className="p-6">
      <button type="button" onClick={onBack}>← Home</button>
      <p>{roundId} (coming in Task 8)</p>
    </main>
  );
}
```

- [ ] **Step 6: Delete smoke test, build, run the dev server and eyeball**

```bash
git rm -q src/__tests__/smoke.test.tsx
npm test -- --run && npm run build
```
Expected: tests pass, build succeeds. Then start the dev server (Browser pane `preview_start` with a `.claude/launch.json` entry `{"name":"dev","runtimeExecutable":"npm","runtimeArgs":["run","dev"],"port":5173}`; open `http://localhost:5173/interview-prep/`). Confirm: five cards render with 0/0 progress, clicking a card changes the hash to `#hm` etc. and shows the stub, back returns home, Reset asks for confirmation, Export downloads a file.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: home screen with round cards, hash routing, export/import/reset"
```

---

### Task 7: Practice mode with QuestionCard and keyboard shortcuts

**Files:**
- Create: `src/components/QuestionCard.tsx`, `src/components/Practice.tsx`
- Test: `src/__tests__/Practice.test.tsx`

**Interfaces:**
- Consumes: `nextQuestion` (Task 4); `Action` (Task 5).
- Produces:
  ```ts
  export function QuestionCard(props: {
    question: Question; revealed: boolean; note: string; rating?: Rating;
    onReveal: () => void; onNote: (text: string) => void; onRate: (r: Rating) => void;
  }): JSX.Element;
  export function Practice(props: { questions: Question[]; state: Persisted; dispatch: Dispatch<Action> }): JSX.Element;
  ```
  Practice owns `currentId`, `revealed`, and `skipped: Set<string>`. Rating dispatches `rate`, then picks `nextQuestion(questions, progress, skipped ∪ {currentId})`. Skip adds `currentId` to `skipped` and picks next. When `nextQuestion` falls back to the head because everything is excluded, `skipped` is cleared.

- [ ] **Step 1: Write the failing test `src/__tests__/Practice.test.tsx`**

```tsx
import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Question } from '../types';
import { EMPTY } from '../lib/storage';
import { reducer } from '../hooks/useAppState';
import { Practice } from '../components/Practice';

const qs: Question[] = [
  { id: 'hm-001', round: 'hm', category: 'A', question: 'First question?', answer: ['Answer one.'], keyPoints: ['Point one'], followUps: ['Follow one'] },
  { id: 'hm-002', round: 'hm', category: 'A', question: 'Second question?', answer: ['Answer two.'], keyPoints: ['Point two'] },
];

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <Practice questions={qs} state={state} dispatch={dispatch} />;
}

describe('Practice', () => {
  test('reveal shows answer, key points and follow-ups', async () => {
    render(<Harness />);
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(screen.queryByText('Answer one.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    expect(screen.getByText('Point one')).toBeInTheDocument();
    expect(screen.getByText('Follow one')).toBeInTheDocument();
  });

  test('rating advances to the next question and hides the answer', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('button', { name: /solid/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    expect(screen.queryByText('Answer two.')).not.toBeInTheDocument();
  });

  test('keyboard: space reveals, 2 rates, n skips', async () => {
    render(<Harness />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: '2' });
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'n' });
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('keyboard shortcuts are ignored inside the note textarea', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    const note = screen.getByRole('textbox', { name: /your note/i });
    await userEvent.type(note, 'n2 ');
    expect(note).toHaveValue('n2 ');
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('empty state when no questions', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Practice questions={[]} state={EMPTY} dispatch={() => {}} />);
    expect(screen.getByText(/no questions match/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- --run src/__tests__/Practice.test.tsx`
Expected: FAIL, cannot resolve `../components/Practice`.

- [ ] **Step 3: Write `src/components/QuestionCard.tsx`**

```tsx
import type { Question, Rating } from '../types';

const RATINGS: { value: Rating; label: string; className: string }[] = [
  { value: 1, label: 'Weak', className: 'border-red-500 text-red-600 dark:text-red-400' },
  { value: 2, label: 'OK', className: 'border-amber-500 text-amber-600 dark:text-amber-400' },
  { value: 3, label: 'Solid', className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
];

export function QuestionCard({
  question, revealed, note, rating, onReveal, onNote, onRate,
}: {
  question: Question; revealed: boolean; note: string; rating?: Rating;
  onReveal: () => void; onNote: (text: string) => void; onRate: (r: Rating) => void;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
        <span className="rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{question.category}</span>
        <span>{question.id}</span>
      </div>
      <h2 className="mb-4 text-lg font-medium">{question.question}</h2>

      {!revealed ? (
        <button
          type="button"
          onClick={onReveal}
          className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Reveal <kbd className="ml-2 text-xs opacity-70">Space</kbd>
        </button>
      ) : (
        <div className="space-y-4 text-sm">
          <section className="space-y-2">
            {question.answer.map((p, i) => <p key={i}>{p}</p>)}
          </section>
          <section>
            <h3 className="mb-1 font-semibold">Key points</h3>
            <ul className="list-disc space-y-1 pl-5">{question.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
          </section>
          {question.followUps && question.followUps.length > 0 && (
            <section>
              <h3 className="mb-1 font-semibold">Likely follow-ups</h3>
              <ul className="list-disc space-y-1 pl-5">{question.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </section>
          )}
          <section>
            <label htmlFor={`note-${question.id}`} className="mb-1 block font-semibold">Your note</label>
            <textarea
              id={`note-${question.id}`}
              value={note}
              onChange={(e) => onNote(e.target.value)}
              rows={3}
              placeholder="Your real story for this question. Stays in this browser only."
              className="w-full rounded border border-zinc-300 bg-transparent p-2 dark:border-zinc-700"
            />
          </section>
          <section className="flex flex-wrap gap-2" aria-label="Rate yourself">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => onRate(r.value)}
                aria-pressed={rating === r.value}
                className={`rounded border px-4 py-2 ${r.className} ${rating === r.value ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
              >
                {r.label} <kbd className="ml-1 text-xs opacity-70">{r.value}</kbd>
              </button>
            ))}
          </section>
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 4: Write `src/components/Practice.tsx`**

```tsx
import { useEffect, useMemo, useState, type Dispatch } from 'react';
import type { Persisted, Question, Rating } from '../types';
import type { Action } from '../hooks/useAppState';
import { nextQuestion } from '../lib/queue';
import { QuestionCard } from './QuestionCard';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT');

export function Practice({ questions, state, dispatch }: { questions: Question[]; state: Persisted; dispatch: Dispatch<Action> }) {
  const [currentId, setCurrentId] = useState<string | undefined>(() => nextQuestion(questions, state.progress)?.id);
  const [revealed, setRevealed] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());

  const current = useMemo(() => questions.find((q) => q.id === currentId), [questions, currentId]);

  // If the filter changed and the current question is no longer in the list, pick a new one.
  useEffect(() => {
    if (!current) {
      setCurrentId(nextQuestion(questions, state.progress)?.id);
      setRevealed(false);
      setSkipped(new Set());
    }
  }, [current, questions, state.progress]);

  const advance = (progress: Persisted['progress'], exclude: Set<string>) => {
    const ordered = nextQuestion(questions, progress, exclude);
    const exhausted = ordered !== undefined && exclude.has(ordered.id);
    setSkipped(exhausted ? new Set() : exclude);
    setCurrentId(ordered?.id);
    setRevealed(false);
  };

  const rate = (rating: Rating) => {
    if (!current) return;
    const now = Date.now();
    dispatch({ type: 'rate', id: current.id, rating, now });
    const progress = { ...state.progress, [current.id]: { rating, seen: (state.progress[current.id]?.seen ?? 0) + 1, lastSeen: now } };
    advance(progress, new Set([...skipped, current.id]));
  };

  const skip = () => {
    if (!current) return;
    advance(state.progress, new Set([...skipped, current.id]));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ') { e.preventDefault(); setRevealed(true); }
      else if (e.key === 'n' || e.key === 'N') skip();
      else if (revealed && (e.key === '1' || e.key === '2' || e.key === '3')) rate(Number(e.key) as Rating);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!current) {
    return <p className="rounded border border-dashed p-6 text-center text-zinc-500">No questions match this filter.</p>;
  }

  return (
    <div className="space-y-3">
      <QuestionCard
        question={current}
        revealed={revealed}
        note={state.notes[current.id] ?? ''}
        rating={state.progress[current.id]?.rating}
        onReveal={() => setRevealed(true)}
        onNote={(text) => dispatch({ type: 'note', id: current.id, text })}
        onRate={rate}
      />
      <div className="flex justify-end">
        <button type="button" onClick={skip} className="text-sm text-zinc-500 hover:underline">
          Skip <kbd className="ml-1 text-xs">N</kbd>
        </button>
      </div>
    </div>
  );
}
```
Note the keyboard `useEffect` has no dependency array on purpose: it re-binds every render so `rate`/`skip` always see fresh state. That is fine for one listener.

- [ ] **Step 5: Run tests**

Run: `npm test -- --run src/__tests__/Practice.test.tsx`
Expected: PASS (5 tests). If the "skip" assertion fails because `n` after rating returns `hm-001`: `hm-001` is rated 2 (bucket 2), `hm-002` unrated (bucket 0). Skipping `hm-002` excludes it, so head is `hm-001`. That is the expected behaviour and the test asserts it.

- [ ] **Step 6: Commit**

```bash
git add src/components/QuestionCard.tsx src/components/Practice.tsx src/__tests__/Practice.test.tsx
git commit -m "feat: practice mode with reveal, self-rating, notes and keyboard shortcuts"
```

---

### Task 8: Browse mode and RoundView with tabs and category filter

**Files:**
- Create: `src/components/Browse.tsx`
- Modify: `src/components/RoundView.tsx` (replace Task 6 stub)

**Interfaces:**
- Consumes: `QuestionCard`, `Practice` (Task 7); `rounds`, `questionsByRound` (Task 2).
- Produces:
  ```ts
  export function Browse(props: { questions: Question[]; state: Persisted; dispatch: Dispatch<Action> }): JSX.Element;
  export function RoundView(props: { roundId: RoundId; state: Persisted; dispatch: Dispatch<Action>; onBack: () => void }): JSX.Element;
  ```

- [ ] **Step 1: Write `src/components/Browse.tsx`**

```tsx
import { useState, type Dispatch } from 'react';
import type { Persisted, Question } from '../types';
import type { Action } from '../hooks/useAppState';
import { QuestionCard } from './QuestionCard';

const RATING_LABEL = { 1: 'Weak', 2: 'OK', 3: 'Solid' } as const;

export function Browse({ questions, state, dispatch }: { questions: Question[]; state: Persisted; dispatch: Dispatch<Action> }) {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const needle = search.trim().toLowerCase();
  const visible = needle
    ? questions.filter((q) => q.question.toLowerCase().includes(needle) || q.category.toLowerCase().includes(needle))
    : questions;

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search questions…"
        aria-label="Search questions"
        className="w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      <p className="text-xs text-zinc-500">{visible.length} of {questions.length}</p>
      <ul className="space-y-2">
        {visible.map((q) => {
          const rating = state.progress[q.id]?.rating;
          const open = openId === q.id;
          return (
            <li key={q.id}>
              {open ? (
                <div>
                  <QuestionCard
                    question={q}
                    revealed
                    note={state.notes[q.id] ?? ''}
                    rating={rating}
                    onReveal={() => {}}
                    onNote={(text) => dispatch({ type: 'note', id: q.id, text })}
                    onRate={(r) => dispatch({ type: 'rate', id: q.id, rating: r, now: Date.now() })}
                  />
                  <button type="button" onClick={() => setOpenId(null)} className="mt-1 text-sm text-zinc-500 hover:underline">Collapse</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenId(q.id)}
                  className="flex w-full items-start justify-between gap-3 rounded border border-zinc-200 bg-white p-3 text-left text-sm hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span>
                    <span className="mr-2 text-xs text-zinc-500">{q.category}</span>
                    {q.question}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">{rating ? RATING_LABEL[rating] : '—'}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/components/RoundView.tsx`**

```tsx
import { useMemo, useState, type Dispatch } from 'react';
import type { Persisted, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound, rounds } from '../data';
import { roundStats } from '../lib/queue';
import { Browse } from './Browse';
import { Practice } from './Practice';
import { ProgressBar } from './ProgressBar';

type Tab = 'practice' | 'browse';

export function RoundView({ roundId, state, dispatch, onBack }: { roundId: RoundId; state: Persisted; dispatch: Dispatch<Action>; onBack: () => void }) {
  const round = rounds.find((r) => r.id === roundId)!;
  const all = useMemo(() => questionsByRound(roundId), [roundId]);
  const categories = useMemo(() => [...new Set(all.map((q) => q.category))], [all]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [tab, setTab] = useState<Tab>('practice');

  const filtered = useMemo(
    () => (selected.size === 0 ? all : all.filter((q) => selected.has(q.category))),
    [all, selected],
  );
  const stats = roundStats(all, state.progress);

  const toggle = (c: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-zinc-300 dark:border-zinc-700'}`;
  const tabBtn = (active: boolean) =>
    `border-b-2 px-3 py-2 text-sm ${active ? 'border-emerald-500 font-medium' : 'border-transparent text-zinc-500'}`;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <button type="button" onClick={onBack} className="mb-4 text-sm text-zinc-500 hover:underline">← All rounds</button>
      <h1 className="text-2xl font-semibold">{round.title}</h1>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{round.blurb}</p>
      <ProgressBar value={stats.solid} max={stats.total} label={`${round.title} progress`} />
      <p className="mb-4 mt-1 text-xs text-zinc-500">{stats.solid}/{stats.total} solid · {stats.weak} weak · {stats.unrated} unrated</p>

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter by category">
        <button type="button" className={chip(selected.size === 0)} onClick={() => setSelected(new Set())}>All</button>
        {categories.map((c) => (
          <button key={c} type="button" className={chip(selected.has(c))} aria-pressed={selected.has(c)} onClick={() => toggle(c)}>{c}</button>
        ))}
      </div>

      <div role="tablist" className="mb-4 flex border-b border-zinc-200 dark:border-zinc-800">
        <button role="tab" type="button" aria-selected={tab === 'practice'} className={tabBtn(tab === 'practice')} onClick={() => setTab('practice')}>Practice</button>
        <button role="tab" type="button" aria-selected={tab === 'browse'} className={tabBtn(tab === 'browse')} onClick={() => setTab('browse')}>Browse</button>
      </div>

      {tab === 'practice'
        ? <Practice key={[...selected].sort().join('|')} questions={filtered} state={state} dispatch={dispatch} />
        : <Browse questions={filtered} state={state} dispatch={dispatch} />}
    </main>
  );
}
```
The `key` on `<Practice>` remounts it when the filter changes so the queue restarts cleanly.

- [ ] **Step 3: Typecheck, test, build, eyeball in the browser**

```bash
npm run typecheck && npm test -- --run && npm run build
```
Expected: all green. In the dev server, open `#hm`: tabs switch, category chips appear once content exists (empty now), Browse shows "0 of 0", Practice shows the empty state.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: round view with practice/browse tabs and category filter"
```

---

### Content tasks (9–13): shared rules

Each content task writes one `src/data/<round>.ts`. Rules for every question:

- `id` is `<round>-<nnn>` zero-padded, sequential from `001`.
- `answer`: 2–4 plain-text paragraphs written as coaching: what a strong staff-level answer covers and how to structure it. Use placeholders like `[your project]`, `[team size]`, `[metric]`. Never include real employer-internal facts or real numbers from the candidate's work. Refer to the resume only in the *question* text for the `From your CV` category.
- `keyPoints`: 3–6 bullets, each a concrete thing the answer must hit.
- `followUps`: 2–4 likely probes (omit only if none are natural).
- Tone: direct, no filler. Answers should be readable in under a minute.
- Berlin/EU framing where relevant: Blue Card / permanent residence, Probezeit (6 months typical), Kündigungsfrist (3 months common at senior levels), Anmeldung, statutory vs private health insurance switch, EUR salary bands, works councils, English-first teams, 28–30 days vacation norm.

After writing each file: `npm test -- --run src/__tests__/data.test.ts` must pass; then commit with `content: <round> questions`.

Example entry (use this exact shape):
```ts
{
  id: 'hr-001',
  round: 'hr',
  category: 'Motivation & fit',
  question: 'Why are you looking to move, and why this company?',
  answer: [
    'Lead with pull, not push: name two concrete things about the company (product domain, engineering culture signal, a public engineering post) and connect them to what you want to do next at staff scope.',
    'Keep the push side short and neutral: "[your current role] has been a great run; I have shipped [scope] and I am now looking for a larger platform surface / a Berlin-based team." Never criticise the current employer.',
    'Close by naming what you would own in the first year so the recruiter can map you to the open role.',
  ],
  keyPoints: [
    'Two specific, verifiable reasons for this company',
    'One sentence on why now, framed positively',
    'Explicit link between your track record and the staff role scope',
    'No negativity about the current or past employers',
  ],
  followUps: ['What would make you turn down an offer?', 'Where else are you interviewing?'],
},
```

---

### Task 9: HR round content (25 questions) — `src/data/hr.ts`

**Files:** Modify `src/data/hr.ts`

Categories and counts (topics to cover, one question each unless noted):

- **Motivation & fit (6):** why move / why us; what you want at staff level; what you know about the product; biggest professional strength and a real weakness; what a great first 90 days looks like; what would make you decline an offer.
- **Logistics & relocation (6):** earliest start date given notice period; relocation timeline and support needs; work permit status (answer coaches how to state "no sponsorship required" and which permit type to name generically); remote/hybrid expectations; willingness to be in-office in Berlin; German language level and whether it matters.
- **Compensation (4):** salary expectations (coach: research bands, give a range in EUR base, separate equity/bonus, ask their band first when possible); current compensation question (coach: you can decline in Germany, redirect to expectations); equity vs cash trade-offs; vacation days, Probezeit and Kündigungsfrist negotiation.
- **Process & culture (4):** what you know about the interview process; experience with English-first international teams; how you handle feedback; questions you have for HR (coach: ask about team size, hiring reason, decision timeline).
- **From your CV (5):** "You already lived in Berlin before, why did you leave and why come back?"; "You moved from Berlin to a company based in another country, walk me through that decision"; "Your current title is Technical Lead, why apply for a Staff IC role?"; "Six months from now you have relocated, what does success look like?"; "You list AI-assisted development as a skill, what does that mean day to day?".

- [ ] **Step 1: Write the 25 questions** following the shared rules.
- [ ] **Step 2: Run** `npm test -- --run src/__tests__/data.test.ts` → PASS.
- [ ] **Step 3: Commit** `git add src/data/hr.ts && git commit -m "content: HR round questions"`

---

### Task 10: Hiring Manager round content (50 questions) — `src/data/hm.ts`

**Files:** Modify `src/data/hm.ts`

- **Architecture & system design (10):** how you decide monolith SPA vs micro-frontends; module federation trade-offs; designing a shared component library across N apps; versioning and breaking changes in a design system; state management choice framework (server state vs client state, when Redux still makes sense); data-fetching layer design (caching, invalidation, optimistic updates); rendering strategy (SPA vs SSR vs streaming) for a B2B dashboard; frontend architecture for a multi-tenant / whitelabel product; handling a large framework upgrade across many apps; designing for offline or flaky networks.
- **Performance (6):** how you find and fix a slow page (measurement first, Core Web Vitals, profiler, long tasks); bundle size strategy (code splitting, tree shaking, analyzing, budgets); rendering performance in large tables/lists (virtualization, memoization limits); avoiding waterfalls in data fetching; performance budgets in CI; perceived performance techniques (skeletons, prefetch, optimistic UI).
- **Testing & quality (6):** testing pyramid for a frontend at scale and where you put the money; visual regression testing: when it pays off and its failure modes; flaky e2e tests: root causes and remedies; quality gates in CI and how you avoid slowing teams down; contract testing with backend; accessibility testing approach.
- **React & data (6):** concurrent features you actually use and why; useEffect misuse patterns and alternatives; form architecture at scale (validation, async, large forms); error boundaries and error handling strategy; TypeScript strictness and where to draw the line; server components: when they help and when they do not.
- **Leadership & influence (8):** influencing without authority (STAR); a technical decision you reversed; disagreement with a senior engineer or manager, how resolved; mentoring an engineer to the next level; handling an underperformer on your team when you are not their manager; driving an initiative across multiple teams; saying no to a product request and how; a failure you own and what changed.
- **Delivery & process (6):** feature flags and progressive delivery: design and pitfalls; how you write and use ADRs; incident you led or were in, RCA process; estimating and sequencing a risky migration; balancing tech debt vs roadmap; code review culture and how you improve it.
- **From your CV (8):** "Walk me through a major React version migration across multiple apps: how you sequenced it, what broke, what you would do differently"; "You significantly cut down a security vulnerability backlog: how did you triage, what did you deliberately leave?"; "Explain the feature-flag infrastructure you built and how the automatic fallback worked"; "You wrote an ADR to consolidate dozens of divergent data-grid implementations onto one: how did you phase it and what were the rollback triggers?"; "You introduced visual regression testing: what did it catch, what did it cost?"; "Tell me about a code-review nudge bot you built: what problem, what metric, did behavior change?"; "You built a micro-frontend with Module Federation: what did it decouple, what did it couple?"; "You built a document-generation feature where an output error carried real contractual or compliance consequences: how did you make sure a data error could not slip through?".

- [ ] **Step 1: Write the 50 questions.**
- [ ] **Step 2: Run** `npm test -- --run src/__tests__/data.test.ts` → PASS.
- [ ] **Step 3: Commit** `git add src/data/hm.ts && git commit -m "content: hiring manager round questions"`

---

### Task 11: Case Study round content (35 questions) — `src/data/case.ts`

**Files:** Modify `src/data/case.ts` (export `caseStudy`)

- **Scoping & approach (8):** how you read a take-home brief and extract implicit requirements; clarifying questions worth sending before starting; time-boxing (what to cut when the brief says 4 hours); choosing the stack for a take-home (familiar over fancy, justify); deciding what "production quality" means for a prototype; writing the README as the first artifact; how you decide what NOT to build and document it; handling ambiguous data or API contracts.
- **Building the take-home (10):** project structure that reads well in 10 minutes; state management for a small app without over-engineering; error, loading and empty states as first-class; accessibility basics you never skip (semantics, focus, contrast, keyboard); responsive layout approach; testing strategy for a take-home (a few meaningful tests over coverage theatre); type safety and API typing; performance considerations at take-home scale (avoid premature optimisation, but no obvious waste); git history hygiene and commit messages as narrative; handling secrets/config even in a demo.
- **Presentation (8):** structure of a 20-minute presentation (context, decisions, demo, trade-offs, next steps); how you demo without dead air; presenting trade-offs honestly including what is weak; anticipating the panel's questions; explaining a decision you are not proud of; handling a live bug during the demo; time management and reading the room; closing with what you would do with another week.
- **Common prompts (4):** "Build a searchable, filterable data table with server-side pagination" (coach: what a staff-level submission covers); "Build a multi-step form with validation and draft saving"; "Build a real-time dashboard from a websocket feed"; "Refactor this messy component and explain your changes".
- **From your CV (5):** "Your CV is heavy on migrations and infrastructure: show us you can still build product UI fast"; "Would you introduce feature flags in a take-home? Why or why not?"; "You champion visual regression: would you add it here? Justify the cost"; "How would you apply your data-grid consolidation thinking to the table in this assignment?"; "You list agent-assisted development: did you use AI on this take-home, and how do you vouch for the code?".

- [ ] **Step 1: Write the 35 questions.**
- [ ] **Step 2: Run** `npm test -- --run src/__tests__/data.test.ts` → PASS.
- [ ] **Step 3: Commit** `git add src/data/case.ts && git commit -m "content: case study round questions"`

---

### Task 12: Debrief round content (30 questions) — `src/data/debrief.ts`

**Files:** Modify `src/data/debrief.ts`

- **Trade-off probes (8):** "Why this state approach and not X?"; "Why did you choose this component structure?"; "Why client-side filtering instead of server-side (or vice versa)?"; "Why this styling approach?"; "Why did you not use a UI library (or why did you)?"; "You skipped Y, walk me through that decision"; "How did you decide what to test?"; "Why this folder structure?".
- **Scale & failure (6):** "What breaks first at 10x data?"; "What happens when the API is slow or down?"; "How would this work with 50 engineers contributing?"; "Where would you add caching and what invalidates it?"; "How would you make this real-time?"; "What is the worst bug you think is still in there?".
- **Quality & security (6):** "What security issues exist in your submission?" (XSS, injection via rendering, secrets, dependency risk); "How accessible is it, honestly?"; "How would you add i18n and what would you have to change?"; "What would a QA engineer break in five minutes?"; "How would you monitor this in production?"; "What did you not test and why?".
- **Reflection (5):** "What would you change with one more day?"; "What are you least proud of?"; "What did you learn building it?"; "How much of this was AI-generated and how did you verify it?"; "How would you onboard a junior to this codebase?".
- **From your CV (5):** "You have led large migrations: how would you migrate this take-home to a new framework version safely?"; "You built quality gates in CI: what gates would you add to this repo and in what order?"; "Given your feature-flag experience, how would you roll this feature out to real users?"; "You introduced e2e testing at a previous company: which three e2e tests would you write here?"; "Your CV emphasises ADRs: write the one-paragraph ADR for the biggest decision in this submission".

- [ ] **Step 1: Write the 30 questions.**
- [ ] **Step 2: Run** `npm test -- --run src/__tests__/data.test.ts` → PASS.
- [ ] **Step 3: Commit** `git add src/data/debrief.ts && git commit -m "content: case study debrief round questions"`

---

### Task 13: Head of Engineering round content (30 questions) — `src/data/hoe.ts`

**Files:** Modify `src/data/hoe.ts`

- **Vision & strategy (7):** how you think about frontend platform strategy over 2–3 years; build vs buy vs adopt framework for tooling; how you evaluate a new technology for adoption; balancing innovation and stability; how you would approach a rewrite request from leadership; how you measure engineering effectiveness on the frontend; AI in the development workflow: where it helps, where it is risky, how you would govern it.
- **Org & impact (7):** what staff-level impact looks like to you; how you work with product and design at the strategy level; a time you changed an org-wide practice; how you scale yourself (docs, enablement, multiplier work); how you handle being the only staff FE across several teams; cross-team dependency management; what you would need from the Head of Engineering to succeed.
- **Culture & values (6):** how you give hard feedback upwards; a time you disagreed with leadership and what you did; how you handle a team that resists a change you are driving; inclusion and hiring: how you reduce bias in interviews; how you build psychological safety in reviews and incidents; what you would refuse to do.
- **Questions to ask them (5):** each is a question the candidate should ask, with `answer` coaching why it matters and what a good vs concerning reply sounds like: "What does the frontend platform look like in two years and who owns it?"; "How are technical decisions made across teams today?"; "What has recently gone wrong and what changed afterwards?"; "How is staff-level performance evaluated here?"; "What would make you say this hire was a mistake in a year?".
- **From your CV (5):** "You have worked in more than one engineering culture and market: what did each context teach you about how orgs work?"; "Would you take a people-management role again, and what would have to be true?"; "You have introduced several process changes: how do you avoid becoming the process person?"; "You mention contributing to hiring: what is your view on the ideal frontend interview loop?"; "What is the most contrarian technical opinion you hold, and where has it cost you?".

- [ ] **Step 1: Write the 30 questions.**
- [ ] **Step 2: Add the minimum-count check to `src/__tests__/data.test.ts`:**

```ts
test('every round has at least 20 questions', () => {
  for (const id of ROUND_IDS) {
    expect(questions.filter((q) => q.round === id).length, id).toBeGreaterThanOrEqual(20);
  }
});
```
- [ ] **Step 3: Run** `npm test -- --run` → PASS (all files).
- [ ] **Step 4: Commit** `git add -A && git commit -m "content: head of engineering round questions; enforce round minimums"`

---

### Task 14: Content quality pass in the browser

**Files:** none new; edits to `src/data/*.ts` as needed.

- [ ] **Step 1:** Run the dev server, open each round, click through Practice for ~5 questions per round and Browse with search. Fix: any answer paragraph over ~90 words, any question that leaks employer-internal facts, any `From your CV` answer that states a real story instead of coaching structure, category name typos (categories must match exactly within a round so chips are not duplicated).
- [ ] **Step 2:** `npm test -- --run && npm run build`
- [ ] **Step 3:** Commit `git commit -am "content: quality pass"` (only if there were edits).

---

### Task 15: GitHub Pages workflow and README

**Files:**
- Create: `.github/workflows/pages.yml`, `README.md`

- [ ] **Step 1: Write `.github/workflows/pages.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- --run
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write `README.md`**

```markdown
# Interview Prep

Interactive mock-interview drill for staff frontend engineer loops in Berlin / EU.
Five rounds, ~170 curated questions with model answers, key points and likely
follow-ups. Reveal, rate yourself, and weak questions come back first.

**Live:** https://namityadav.github.io/interview-prep/

## Rounds
1. HR screen
2. Hiring manager (technical + behavioral)
3. Case study (take-home + presentation)
4. Case study debrief (panel grilling)
5. Head of engineering

## Using it
- **Practice**: `Space` reveal · `1` / `2` / `3` rate Weak / OK / Solid · `N` skip.
- **Browse**: search and expand any question.
- Notes and ratings stay in your browser (localStorage). Use **Export** / **Import** to back up or move devices.

## Adding questions
Edit `src/data/<round>.ts`. Ids are `<round>-<nnn>`. `npm test` validates shape and uniqueness.

## Development
```bash
npm install
npm run dev        # http://localhost:5173/interview-prep/
npm test           # vitest watch
npm run build      # tsc + vite build
```

## Stack
Vite · React 19 · TypeScript · Tailwind CSS 4 · Vitest · GitHub Pages
```

- [ ] **Step 3: Commit**

```bash
git add .github README.md
git commit -m "ci: deploy to GitHub Pages; add README"
```

---

### Task 16: Enable GitHub Pages and verify deploy

The repo already exists at `github.com/NamitYadav/interview-prep`, is cloned to
`/Users/namit/personal/interview-prep`, and the `origin` remote is HTTPS with
working cached credentials. Pushing needs no extra setup.

**User prerequisite:** on GitHub, Settings → Pages → Source: **GitHub Actions**.
Do this once, before or right after the Task 15 push.

- [ ] **Step 1:** `git push` (each earlier task can also push as it goes).
- [ ] **Step 2:** Confirm the Actions run on `main` is green.
- [ ] **Step 3:** Open `https://namityadav.github.io/interview-prep/` and confirm
      the five round cards render and a round opens.

---

## Self-review against the spec

- Rounds, counts, `From your CV` category: Tasks 2, 9–13. ✔
- Content stance (generic, placeholders, EU specifics): shared content rules + Task 14. ✔
- Stack, no router, hash navigation, Tailwind, Vitest, Pages base path: Tasks 1, 6, 15. ✔
- Data model: Task 2 matches the spec verbatim. ✔
- Home screen (cards, progress, export/import/reset with confirm): Task 6. ✔
- Round view tabs, category filter, back link: Task 8. ✔
- Practice (reveal, answer/keyPoints/followUps/note/rating, skip, keyboard incl. textarea guard, empty state): Task 7. ✔
- Browse (search on question + category, expand, editable rating): Task 8. ✔
- Queue order + no immediate repeat: Task 4 (`exclude`) + Task 7 (`skipped ∪ currentId`). ✔
- Export/import file name, validation, inline error: Tasks 3, 6. ✔
- Error handling (corrupt storage moved aside, save-failed banner): Tasks 3, 5, 6. ✔
- Four test files: Tasks 2/13 (data), 3 (storage — spec folded this into store; kept separate for clarity), 4 (queue), 5 (store), 7 (Practice). ✔
- Out-of-scope items not built. ✔
- Type names consistent: `Persisted`, `Progress`, `Rating`, `Action`, `nextQuestion(questions, progress, exclude?)`, `roundStats` used identically across Tasks 4–8. ✔
