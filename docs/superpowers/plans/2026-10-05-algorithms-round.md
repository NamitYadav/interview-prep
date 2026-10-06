# Algorithms Round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Codility-style "Algorithms" round. It has 24 graded tasks, a hidden-test grader with correctness and performance scoring, and a 3-task, 90-minute timed test.

**Architecture:**
- Tasks are typed data in `src/data/algo.ts`. Each one carries a reference solution and seeded input generators.
- The main thread builds each case's args and expected value (`src/lib/grade.ts`).
- `src/lib/gradeRun.ts` feeds the cases one at a time to a dedicated grader worker (`src/sandbox/grader.ts`). It times each case and terminates and respawns the worker when a case overruns its limit.
- The UI reuses `ScratchPad` / `QuestionCard` and adds a `GradeReport`, plus a `TimedTest` tab modelled on `DesignSession`.

**Tech Stack:** React 19, TypeScript (strict, `noUncheckedIndexedAccess`), Sucrase (the existing `compile()`), Vitest + Testing Library on jsdom, and Vite workers via `new Worker(new URL(...), { type: 'module' })`.

**Spec:** `docs/superpowers/specs/2026-10-05-algorithms-round-design.md`

## Global Constraints

- TypeScript/JavaScript only. No new dependencies.
- New round id `algo`, with title `Algorithms`, blurb `Codility-style tasks: hidden correctness and performance tests, timed.` and `targetSeconds: 1800`.
- `algo` comes right after `coding` in Senior, Staff, Lead, Senior full-stack and Staff full-stack. It is never in Architect.
- Ids are `algo-001…algo-024`, 3 per category. The categories, in this order: `Arrays & hashing`, `Prefix sums`, `Two pointers & sliding window`, `Sorting`, `Stacks & queues`, `Binary search`, `Greedy`, `Dynamic programming`.
- `DEFAULT_LIMIT_MS = 1500` per case, and `LOAD_LIMIT_MS = 3000` for the pad to load.
- Performance cases use N = 100,000 unless a task says otherwise.
- Run executes example cases only, with console output shown. Submit runs every case with console muted.
- Pass rule: `JSON.stringify(got) === JSON.stringify(expected)`.
- Suggested rating from a grade uses the existing rule: all passed → Solid, under half → Weak, otherwise OK.
- Timed test: 3 tasks from 3 distinct categories, weakest first. One 90-minute countdown. Auto-submit at zero. A session older than 180 minutes is dropped. Drafts use `draftKey(id, 'test')`.
- Mock presets: Full loop gets `algo: 1`, Technical gets `algo: 2`.
- Statements are original wording in the Codility style. Never copy Codility's text.
- An algo `answer` must fit a 180-second spoken budget (390 words at 130 wpm), not the 1800s target.
- **Commits:** none per task. Namit wants one commit at the end (Task 10). Work on branch `feat/algorithms-round` (create it before Task 1: `git switch -c feat/algorithms-round`).
- Match the surrounding code: comments explain *why*, in the same voice as the existing files. No Prettier; format by hand like the neighbours.

## Review Focus

1. **A pad that never finishes loading** (top-level `while (true)`, heavy top-level work). Submit must end with the load-timeout message, not show "Grading…" forever. The test lives in Task 3.
2. **A solution that mutates its input** (e.g. `A.sort()` in place). It must be judged against an expected value computed from untouched args, and later cases must be unaffected. The test lives in Task 3.
3. **A solution written as `const solution = (A) => …` or with helper functions.** It must load like a function declaration does. The test lives in Task 3.
4. **Stop, Run examples again, or leaving the question mid-grade.** The old worker is terminated and no late result lands in the new run or after unmount. The test lives in Task 4.
5. **Timed-test auto-submit while the last keystrokes are still debounced** (typed under 300ms before the deadline). The graded code must include them. The test lives in Task 6.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/grade.ts` (new) | Pure grading logic: seeded RNG, `buildCases`, `same`, `preview`, `judge`, `score` |
| `src/sandbox/protocol.ts` (modify) | `ToGrader` / `FromGrader` message types |
| `src/sandbox/graderCore.ts` (new) | `createGrader(post)`: load the pad, run one case. Free of `self`, so tests reuse it |
| `src/sandbox/grader.ts` (new) | Worker entry: console wiring + `createGrader` |
| `src/lib/gradeRun.ts` (new) | Main-thread runner: per-case timer, terminate/respawn, cancel |
| `src/types.ts` (modify) | `CaseKind`, `AlgoCase`, `Grader`, `Question.statement`, `Question.grader`, `RoundId` gains `'algo'` |
| `src/data/algo.ts` (new) | The 24 tasks and their seeded-input helpers |
| `src/data/index.ts`, `src/data/roles.ts` (modify) | Register the round and put it in the loops |
| `src/components/GradeReport.tsx` (new) | The score line and per-case rows |
| `src/components/ScratchPad.tsx` (modify) | Run examples / Submit / report for graded questions |
| `src/components/QuestionCard.tsx` (modify) | Statement block; grade-based suggested rating |
| `src/lib/lap.ts` (modify) | Timed-test session store |
| `src/components/TimedTest.tsx` (new) | The timed test tab |
| `src/components/RoundView.tsx` (modify) | The `Timed test` tab on `algo` |
| `src/components/MockSession.tsx` (modify) | Preset compositions |
| `src/__tests__/helpers.ts` (modify) | `FakeGraderWorker` |
| `scripts/smoke.mjs`, `README.md`, `public/manifest.webmanifest` (modify) | Real-browser check, docs |

---

### Task 1: Pure grading logic (`src/lib/grade.ts`)

**Files:**
- Create: `src/lib/grade.ts`
- Modify: `src/types.ts` (add the grader types only; `RoundId` changes in Task 2)
- Test: `src/__tests__/grade.test.ts`

**Interfaces:**
- Produces (types in `src/types.ts`):
  ```ts
  export type CaseKind = 'example' | 'correctness' | 'performance';
  export type AlgoCase = { name: string; kind: CaseKind; limitMs?: number } & (
    | { args: unknown[]; expected?: unknown }
    | { gen: (rng: () => number) => unknown[] }
  );
  export interface Grader { fn: string; reference: (...args: never[]) => unknown; cases: AlgoCase[] }
  ```
- Produces (`src/lib/grade.ts`): `DEFAULT_LIMIT_MS`, `rng(seed)`, `seedFor(questionId, index)`, `BuiltCase`, `CaseStatus`, `CaseResult`, `Score`, `buildCases(grader, questionId, kinds?)`, `same(a, b)`, `preview(value, max?)`, `judge(c, outcome)`, `score(results)`. The exact signatures are in the code below.

- [ ] **Step 1: Add the types to `src/types.ts`**

Append after the `Question` interface. Then add the two optional fields inside `Question`, right after `needsDom?: true;`:

```ts
export type CaseKind = 'example' | 'correctness' | 'performance';
/** One hidden test. Fixed `args` (with `expected` hand-written or, if omitted, computed by
 *  the reference) or a `gen` that builds a large input from the case's own seeded draw. */
export type AlgoCase = { name: string; kind: CaseKind; limitMs?: number } & (
  | { args: unknown[]; expected?: unknown }
  | { gen: (rng: () => number) => unknown[] }
);
export interface Grader {
  /** The function the pad must define, e.g. 'solution'. */
  fn: string;
  // `never[]` so any concrete signature is assignable; callers cast to call it.
  reference: (...args: never[]) => unknown;
  cases: AlgoCase[];
}
```

Inside `Question`:

```ts
  /** Full task text for an algo question: the task, examples, constraints. `question` stays the heading. */
  statement?: string;
  /** Hidden tests for an algo question; ScratchPad shows Run examples / Submit when set. */
  grader?: Grader;
```

- [ ] **Step 2: Write the failing tests**

Create `src/__tests__/grade.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import type { Grader } from '../types';
import { DEFAULT_LIMIT_MS, buildCases, judge, preview, rng, same, score, seedFor, type BuiltCase } from '../lib/grade';

const sum = (A: number[]) => A.reduce((s, v) => s + v, 0);
const grader: Grader = {
  fn: 'solution',
  reference: sum,
  cases: [
    { name: 'example', kind: 'example', args: [[1, 2]], expected: 3 },
    { name: 'empty', kind: 'correctness', args: [[]] },
    { name: 'large', kind: 'performance', limitMs: 500, gen: (r) => [Array.from({ length: 5 }, () => Math.floor(r() * 10))] },
  ],
};

describe('rng', () => {
  test('is deterministic per seed and stays in [0, 1)', () => {
    const a = rng(42), b = rng(42), c = rng(43);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs).not.toEqual(Array.from({ length: 100 }, () => c()));
    for (const x of xs) expect(x >= 0 && x < 1).toBe(true);
  });

  test('seedFor differs by question and by case index', () => {
    expect(seedFor('algo-001', 0)).not.toBe(seedFor('algo-001', 1));
    expect(seedFor('algo-001', 0)).not.toBe(seedFor('algo-002', 0));
  });
});

describe('buildCases', () => {
  test('keeps a hand-written expected, computes a missing one, and generates seeded inputs', () => {
    const built = buildCases(grader, 'algo-900');
    expect(built.map((c) => c.name)).toEqual(['example', 'empty', 'large']);
    expect(built[0]).toMatchObject({ args: [[1, 2]], expected: 3, limitMs: DEFAULT_LIMIT_MS });
    expect(built[1]!.expected).toBe(0);
    expect(built[2]!.limitMs).toBe(500);
    expect(built[2]!.expected).toBe(sum(built[2]!.args[0] as number[]));
    expect(buildCases(grader, 'algo-900')[2]!.args).toEqual(built[2]!.args);
  });

  test('filters by kind', () => {
    expect(buildCases(grader, 'algo-900', new Set(['example'])).map((c) => c.name)).toEqual(['example']);
  });

  test('the reference cannot corrupt the args the pad receives', () => {
    const sorting: Grader = { fn: 'solution', reference: (A: number[]) => A.sort((x, y) => x - y)[0], cases: [{ name: 'x', kind: 'correctness', args: [[3, 1, 2]] }] };
    expect(buildCases(sorting, 'algo-900')[0]!.args).toEqual([[3, 1, 2]]);
  });
});

describe('same / preview', () => {
  test('compares by JSON, so a string never equals a number', () => {
    expect(same([1, 2], [1, 2])).toBe(true);
    expect(same('3', 3)).toBe(false);
    expect(same(undefined, 0)).toBe(false);
  });

  test('truncates long input and says by how much', () => {
    expect(preview([1, 2])).toBe('[1,2]');
    const long = preview(Array.from({ length: 1000 }, () => 7));
    expect(long.startsWith('[7,7,')).toBe(true);
    expect(long).toMatch(/… \(\d+ more chars\)$/);
  });
});

describe('judge / score', () => {
  const [example, empty, large] = buildCases(grader, 'algo-900') as [BuiltCase, BuiltCase, BuiltCase];

  test('pass, fail, error and timeout', () => {
    expect(judge(example, { value: 3, ms: 1 }).status).toBe('pass');
    expect(judge(example, { value: 4, ms: 1 })).toMatchObject({ status: 'fail', got: '4', expected: '3', input: '[1,2]' });
    expect(judge(empty, { error: 'TypeError: x', ms: 1 })).toMatchObject({ status: 'error', detail: 'TypeError: x' });
    expect(judge(large, 'timeout')).toMatchObject({ status: 'timeout', detail: 'timed out after 500ms' });
  });

  test('scores correctness (example + correctness) and performance separately', () => {
    const results = [judge(example, { value: 3, ms: 1 }), judge(empty, { value: 1, ms: 1 }), judge(large, 'timeout')];
    expect(score(results)).toEqual({ correctness: 50, performance: 0, total: 33, passed: 1, count: 3 });
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `npx vitest run src/__tests__/grade.test.ts`
Expected: FAIL, `Failed to resolve import "../lib/grade"`.

- [ ] **Step 4: Implement `src/lib/grade.ts`**

```ts
import type { CaseKind, Grader } from '../types';

// Grading for the Algorithms round, everything that does not need a worker. The runner
// (gradeRun.ts) and the report (GradeReport.tsx) are built on these.

// ponytail: a fixed per-case limit. O(N log N) at N = 100,000 runs in ~20ms and O(N²) needs
// ~10^10 steps, so the gap is wide; a slow machine timing out a correct solution is the
// ceiling. Calibrate with a case's own `limitMs`, or this constant.
export const DEFAULT_LIMIT_MS = 1500;

export interface BuiltCase { name: string; kind: CaseKind; limitMs: number; args: unknown[]; expected: unknown }
export type CaseStatus = 'pass' | 'fail' | 'error' | 'timeout';
export interface CaseResult {
  name: string; kind: CaseKind; status: CaseStatus; ms?: number;
  input: string; expected: string; got?: string; detail?: string;
}
export interface Score { correctness: number; performance: number; total: number; passed: number; count: number }

// mulberry32: small, fast, good enough to build test inputs, and seedable — which is the
// point: a failing performance case must fail the same way on the next Submit.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a over "<question id>:<case index>", so every case of every task gets its own draw.
export function seedFor(questionId: string, index: number): number {
  let h = 2166136261;
  for (const ch of `${questionId}:${index}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Args and expected value for each case, optionally only some kinds. The reference gets
 *  a clone, so a reference that sorts in place cannot change what the pad is sent. */
export function buildCases(grader: Grader, questionId: string, kinds?: ReadonlySet<CaseKind>): BuiltCase[] {
  const reference = grader.reference as (...args: unknown[]) => unknown;
  return grader.cases.flatMap((c, i) => {
    if (kinds && !kinds.has(c.kind)) return [];
    const args = 'gen' in c ? c.gen(rng(seedFor(questionId, i))) : c.args;
    const expected = !('gen' in c) && c.expected !== undefined ? c.expected : reference(...structuredClone(args));
    return [{ name: c.name, kind: c.kind, limitMs: c.limitMs ?? DEFAULT_LIMIT_MS, args, expected }];
  });
}

// Algorithm outputs are numbers, strings, booleans and arrays of them; JSON equality is
// exact for those and makes "3" vs 3 a failure, as Codility does.
export const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export function preview(value: unknown, max = 120): string {
  let s: string;
  try {
    s = JSON.stringify(value) ?? String(value);
  } catch {
    s = String(value);
  }
  return s.length > max ? `${s.slice(0, max)}… (${s.length - max} more chars)` : s;
}

export function judge(
  c: BuiltCase,
  outcome: { value: unknown; ms: number } | { error: string; ms?: number } | 'timeout',
): CaseResult {
  const base = { name: c.name, kind: c.kind, input: preview(c.args.length === 1 ? c.args[0] : c.args), expected: preview(c.expected) };
  if (outcome === 'timeout') return { ...base, status: 'timeout', detail: `timed out after ${c.limitMs}ms` };
  if ('error' in outcome) return { ...base, status: 'error', ms: outcome.ms, detail: outcome.error };
  return { ...base, status: same(outcome.value, c.expected) ? 'pass' : 'fail', ms: outcome.ms, got: preview(outcome.value) };
}

const percent = (results: CaseResult[]) =>
  results.length === 0 ? 100 : Math.round((100 * results.filter((r) => r.status === 'pass').length) / results.length);

export function score(results: CaseResult[]): Score {
  return {
    correctness: percent(results.filter((r) => r.kind !== 'performance')),
    performance: percent(results.filter((r) => r.kind === 'performance')),
    total: percent(results),
    passed: results.filter((r) => r.status === 'pass').length,
    count: results.length,
  };
}
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npx vitest run src/__tests__/grade.test.ts && npm run typecheck`
Expected: PASS, and tsc reports nothing.

---

### Task 2: Register the round with the first three tasks

**Files:**
- Create: `src/data/algo.ts`
- Modify: `src/types.ts:1` (RoundId), `src/data/index.ts` (import, `ROUND_IDS`, `rounds`, `questions`), `src/data/roles.ts`
- Test: `src/__tests__/data.test.ts`, `src/data/roles.test.ts`

**Interfaces:**
- Consumes: `buildCases`, `same`, `preview`, `rng`, `seedFor`, `DEFAULT_LIMIT_MS` from Task 1; `compile` from `src/sandbox/compile.ts`.
- Produces: `export const algo: Question[]` in `src/data/algo.ts`. Questions with `round: 'algo'` are visible through `forRole(role).byRound('algo')` for the five loops.

- [ ] **Step 1: Write the failing data and role tests**

In `src/__tests__/data.test.ts`:
1. Change `ID_RE` to `/^(hr|hm|coding|algo|design|case|debrief|hoe|lead|arch|backend)-\d{3}$/`.
2. Add `algo: 3` to the `min` record (Task 8 raises it to 24).
3. In the word-budget test, replace the budget line with:
   ```ts
   // Algorithms tasks give 30 minutes to code; the talk-track still has to be sayable in
   // the live-coding round's three.
   const budget = new Map(rounds.map((r) => [r.id, Math.round(((r.id === 'algo' ? 180 : r.targetSeconds) / 60) * SPOKEN_WPM)]));
   ```
4. Add `import { buildCases, DEFAULT_LIMIT_MS, judge, preview, same, score } from '../lib/grade';` to the imports.
5. Append this block at the end of the file:

```ts
describe('algorithms round', () => {
  const algo = questions.filter((q) => q.round === 'algo');
  // The pad as the grader worker loads it: compiled, evaluated, the named function handed back.
  const load = (code: string, fn: string) =>
    new Function('React', `${compile(code)}\n;return typeof ${fn} === 'function' ? ${fn} : undefined;`)({}) as ((...a: unknown[]) => unknown) | undefined;

  test('is catalogued with a 30-minute target', () => {
    expect(rounds.find((r) => r.id === 'algo')).toMatchObject({ title: 'Algorithms', targetSeconds: 1800 });
  });

  test('every task is a graded scratch pad whose starter defines the graded function', () => {
    expect(algo.length).toBeGreaterThan(0);
    for (const q of algo) {
      expect(q.scratch && q.statement?.trim() && q.grader, q.id).toBeTruthy();
      expect(q.preview ?? q.needsDom, q.id).toBeUndefined();
      expect(q.grader!.fn, q.id).toMatch(/^[A-Za-z_$][\w$]*$/);
      expect(typeof load(q.code!, q.grader!.fn), q.id).toBe('function');
    }
  });

  test('every task has an example, a correctness and a performance case', () => {
    for (const q of algo) {
      for (const kind of ['example', 'correctness', 'performance'] as const) {
        expect(q.grader!.cases.some((c) => c.kind === kind), `${q.id} has no ${kind} case`).toBe(true);
      }
    }
  });

  // A wrong hand-written expected would grade a correct solution as failing.
  test('the reference returns every hand-written expected value', () => {
    for (const q of algo) {
      const reference = q.grader!.reference as (...a: unknown[]) => unknown;
      for (const c of q.grader!.cases) {
        if ('gen' in c || c.expected === undefined) continue;
        expect(same(reference(...structuredClone(c.args)), c.expected), `${q.id}: ${c.name}`).toBe(true);
      }
    }
  });

  test('generated inputs come from the seeded draw, not Math.random', () => {
    for (const q of algo) {
      const fingerprint = () => buildCases(q.grader!, q.id).map((c) => preview(c.args));
      expect(fingerprint(), q.id).toEqual(fingerprint());
    }
  });

  // The limits are only meaningful if a good solution is nowhere near them; a gen that
  // builds a 10^7 input would time out the reference on a slow laptop.
  test('the reference clears every case at a fifth of its time limit', () => {
    for (const q of algo) {
      const reference = q.grader!.reference as (...a: unknown[]) => unknown;
      for (const c of buildCases(q.grader!, q.id)) {
        const args = structuredClone(c.args);
        const t0 = performance.now();
        reference(...args);
        expect(performance.now() - t0, `${q.id}: ${c.name}`).toBeLessThan(Math.min(c.limitMs, DEFAULT_LIMIT_MS) / 5);
      }
    }
  });

  test('the starter alone does not pass', () => {
    for (const q of algo) {
      const solution = load(q.code!, q.grader!.fn)!;
      const results = buildCases(q.grader!, q.id).map((c) => judge(c, { value: solution(...structuredClone(c.args)), ms: 0 }));
      expect(score(results).total, q.id).toBeLessThan(100);
    }
  });

  test('every task names a complexity in its key points', () => {
    for (const q of algo) expect(q.keyPoints.join(' '), q.id).toMatch(/O\(/);
  });
});
```

In `src/data/roles.test.ts`:
1. Change the Lead expectation to `['hr', 'hm', 'coding', 'algo', 'design', 'lead', 'hoe']`.
2. Change the full-stack order test's expectation to `['hr', 'hm', 'coding', 'algo', 'backend', 'design', 'case', 'debrief', 'hoe']`, and rename it to `'full-stack round order puts algorithms then backend between live coding and system design'`.
3. Add inside `describe('role catalogue')`:

```ts
  test('every loop with live coding has algorithms right after it; architect has neither', () => {
    for (const role of roles) {
      const coding = role.rounds.indexOf('coding');
      if (role.id === 'architect') {
        expect(coding, role.id).toBe(-1);
        expect(role.rounds, role.id).not.toContain('algo');
      } else {
        expect(role.rounds[coding + 1], role.id).toBe('algo');
      }
    }
  });
```

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run src/__tests__/data.test.ts src/data/roles.test.ts`
Expected: FAIL. `rounds cover every RoundId once` still passes, but `is catalogued with a 30-minute target` fails on undefined, the role-order tests fail, and the `min` record no longer type-checks.

- [ ] **Step 3: Register the round**

`src/types.ts` line 1:
```ts
export type RoundId = 'hr' | 'hm' | 'coding' | 'algo' | 'design' | 'case' | 'debrief' | 'hoe' | 'lead' | 'arch' | 'backend';
```

`src/data/index.ts`:
```ts
import { algo } from './algo';
// …
export const ROUND_IDS = ['hr', 'hm', 'coding', 'algo', 'design', 'case', 'debrief', 'hoe', 'lead', 'arch', 'backend'] as const satisfies readonly RoundId[];
```
In `rounds`, after the `coding` entry:
```ts
  { id: 'algo', title: 'Algorithms', blurb: 'Codility-style tasks: hidden correctness and performance tests, timed.', targetSeconds: 1800 },
```
In `questions`: `[...hr, ...hm, ...coding, ...algo, ...design, …]`.

`src/data/roles.ts`: insert `'algo'` right after `'coding'` in `senior`, `staff`, `lead`, `fs-senior` and `fs-staff`. Leave `architect` alone.

- [ ] **Step 4: Create `src/data/algo.ts` with the helpers and the Arrays & hashing tasks**

The file starts with the helpers below. Every later content task appends to the same `algo` array.

```ts
import type { Question } from '../types';

// Codility-style tasks. Each carries a reference solution and its hidden cases; the
// statement is ours, written in the Codility style, never their text. Performance inputs are
// built by `gen` from the case's own seeded draw (lib/grade.ts), so a failing case fails
// the same way on every Submit, and the data file stays small.
//
// Each answer is the live-pairing talk-track — brute force first, then the optimal with its
// complexity, then the edge cases — inside the live-coding round's 180s spoken budget.

const N = 100_000;
const int = (rng: () => number, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const ints = (rng: () => number, n: number, lo: number, hi: number) => Array.from({ length: n }, () => int(rng, lo, hi));
const range = (n: number, from = 0) => Array.from({ length: n }, (_, i) => i + from);
function shuffle<T>(xs: T[], rng: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}
const starter = (params: string, returns: string, value: string) =>
  `function solution(${params}): ${returns} {\n  // Your solution here.\n  return ${value};\n}`;

export const algo: Question[] = [
  // ── Arrays & hashing ─────────────────────────────────────────────────────────────
  {
    id: 'algo-001',
    round: 'algo',
    category: 'Arrays & hashing',
    scratch: true,
    question: 'Find the value that occurs an odd number of times.',
    statement: `An array A of N integers is given. Every value in A occurs an even number of times except one, which occurs an odd number of times. Return that value.

Example:
  A = [9, 3, 9, 3, 9, 7, 9]  →  7

Constraints:
  N is an odd integer in [1..100,000]
  each element of A is an integer in [1..1,000,000,000]
  exactly one value occurs an odd number of times`,
    code: starter('A: number[]', 'number', '0'),
    grader: {
      fn: 'solution',
      reference: (A: number[]) => A.reduce((x, v) => x ^ v, 0),
      cases: [
        { name: 'example', kind: 'example', args: [[9, 3, 9, 3, 9, 7, 9]], expected: 7 },
        { name: 'single element', kind: 'correctness', args: [[42]], expected: 42 },
        { name: 'odd value first', kind: 'correctness', args: [[5, 1, 1]], expected: 5 },
        { name: 'odd value last', kind: 'correctness', args: [[1, 1, 5]], expected: 5 },
        { name: 'odd value occurs three times', kind: 'correctness', args: [[2, 2, 2, 4, 4]], expected: 2 },
        { name: 'values near 10^9', kind: 'correctness', args: [[1e9, 999_999_999, 1e9]], expected: 999_999_999 },
        { name: 'random, N = 99,999', kind: 'performance', gen: (rng) => { const half = ints(rng, 49_999, 1, 1e9); return [shuffle([...half, ...half, 777], rng)]; } },
        { name: 'one repeated value, N = 99,999', kind: 'performance', gen: () => [[...Array<number>(99_998).fill(3), 8]] },
      ],
    },
    answer: [
      'Pin the constraints first: N up to 100,000 rules out anything quadratic, and "odd number of times" means the answer can appear three or five times, not just once.',
      'Brute force counts every value against every other: O(N²), and it fails the performance tests. A Map of counts, then the key whose count is odd, is O(N) time and O(N) space.',
      'Optimal: XOR everything. x ^ x is 0 and XOR is commutative, so every even-count value cancels and the odd-count one is what is left: O(N) time, O(1) space. Values stay under 2^31, so JavaScript\'s 32-bit XOR is safe.',
      'Before submitting I would run a single element, the odd value at either end, and the odd value occurring three times.',
    ],
    keyPoints: [
      'Rules out O(N²) from N = 100,000 before writing code',
      'Names the Map-count solution: O(N) time, O(N) space',
      'Reaches XOR for O(N) time, O(1) space and says why pairs cancel',
      'Tests a single element and a value occurring three times',
    ],
    followUps: ['What breaks in the XOR trick if values can exceed 2^31 in JavaScript?', 'Two values are unpaired instead of one — can you still do it in O(1) space?'],
  },
];
```

Then add `algo-002` and `algo-003` to the same array. Use the shape of `algo-001` and fill in from the specs below. **Recipe for the prose fields:**
- `statement`: task paragraph, `Example:` block, `Constraints:` block, all in your own words.
- `answer`: 3–4 paragraphs. Restate constraints → brute force + complexity → optimal + complexity → the edge cases you'd test. Stay within 390 words.
- `keyPoints`: 4 items, at least one naming an `O(…)`.
- `followUps`: 2 items.

**algo-002 · Arrays & hashing · "Check whether an array is a permutation of 1..N."**
- Signature: `starter('A: number[]', 'number', '0')`. Return 1 if A contains each of 1..N exactly once, else 0.
- Constraints: N in [1..100,000]; elements in [1..1,000,000,000].
- Reference:
  ```ts
  reference: (A: number[]) => {
    const seen = new Uint8Array(A.length + 1);
    for (const v of A) {
      if (v < 1 || v > A.length || seen[v]) return 0;
      seen[v] = 1;
    }
    return 1;
  },
  ```
- Cases:
  ```ts
  { name: 'example: permutation', kind: 'example', args: [[4, 1, 3, 2]], expected: 1 },
  { name: 'example: missing 2', kind: 'example', args: [[4, 1, 3]], expected: 0 },
  { name: 'single 1', kind: 'correctness', args: [[1]], expected: 1 },
  { name: 'single 2', kind: 'correctness', args: [[2]], expected: 0 },
  { name: 'duplicate', kind: 'correctness', args: [[1, 1]], expected: 0 },
  { name: 'value above N', kind: 'correctness', args: [[1, 3]], expected: 0 },
  { name: 'huge value', kind: 'correctness', args: [[1e9]], expected: 0 },
  { name: 'shuffled 1..N', kind: 'performance', gen: (rng) => [shuffle(range(N, 1), rng)] },
  { name: 'shuffled 1..N with one duplicate', kind: 'performance', gen: (rng) => { const xs = shuffle(range(N, 1), rng); xs[0] = xs[1]!; return [xs]; } },
  ```
- Talk-track facts: brute force `includes` for each of 1..N is O(N²). Sort-and-compare is O(N log N). A seen-array is O(N) time, O(N) space. The traps are duplicates and values above N. Follow-ups: do it in O(1) extra space by marking in place; what changes if A may be modified?

**algo-003 · Arrays & hashing · "Find the smallest positive integer missing from an array."**
- Signature: `starter('A: number[]', 'number', '1')`.
- Constraints: N in [1..100,000]; elements in [−1,000,000..1,000,000].
- Reference:
  ```ts
  reference: (A: number[]) => {
    const seen = new Uint8Array(A.length + 2);
    for (const v of A) if (v > 0 && v <= A.length + 1) seen[v] = 1;
    let i = 1;
    while (seen[i]) i++;
    return i;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[1, 3, 6, 4, 1, 2]], expected: 5 },
  { name: 'example: consecutive', kind: 'example', args: [[1, 2, 3]], expected: 4 },
  { name: 'all negative', kind: 'correctness', args: [[-1, -3]], expected: 1 },
  { name: 'single 2', kind: 'correctness', args: [[2]], expected: 1 },
  { name: 'single 1', kind: 'correctness', args: [[1]], expected: 2 },
  { name: 'only extremes', kind: 'correctness', args: [[-1e6, 1e6]], expected: 1 },
  { name: 'duplicates', kind: 'correctness', args: [[2, 2, 1, 1]], expected: 3 },
  { name: 'shuffled 1..N', kind: 'performance', gen: (rng) => [shuffle(range(N, 1), rng)] },
  { name: 'random in range', kind: 'performance', gen: (rng) => [ints(rng, N, -1e6, 1e6)] },
  ```
- Talk-track facts: the answer is always in 1..N+1 (pigeonhole), which bounds the seen-array. A `while (A.includes(i))` loop is O(N²) on a permutation. Sorting is O(N log N), a Set is O(N). The trap is that negatives and zero don't count. Follow-ups: O(1) extra space with cyclic placement; what if the input is a stream?

- [ ] **Step 5: Run the data and role tests to confirm they pass**

Run: `npx vitest run src/__tests__/data.test.ts src/data/roles.test.ts && npm run typecheck`
Expected: PASS. If `the lap cap holds one lap per possible question set` fails, raise `MAX_LAPS` in `src/lib/lap.ts` to `100` and update its comment ("about 65" → the new count printed by the failure).

- [ ] **Step 6: Run the whole suite and fix fallout from the new round**

Run: `npx vitest run`
Expected: every failure comes from tests that hardcode round lists or counts (Home, App, MockSession, RoundView). For each one, update the expectation to include `algo` in its loop position, then re-run until green. Don't change behaviour to satisfy an old expectation.

---

### Task 3: Grader worker and runner

**Files:**
- Modify: `src/sandbox/protocol.ts`
- Create: `src/sandbox/graderCore.ts`, `src/sandbox/grader.ts`, `src/lib/gradeRun.ts`
- Modify: `src/__tests__/helpers.ts` (add `FakeGraderWorker`)
- Test: `src/__tests__/gradeRun.test.ts`

**Interfaces:**
- Consumes: `BuiltCase`, `CaseResult`, `judge` (Task 1); `compile`, `formatArgs`, `forwardConsole` (`src/sandbox/compile.ts`).
- Produces:
  - `ToGrader`, `FromGrader` (protocol).
  - `createGrader(post: (msg: FromGrader) => void): (msg: ToGrader) => void`.
  - `LOAD_LIMIT_MS = 3000`.
  - `interface GradeCallbacks { onDone(results: CaseResult[]): void; onLoadError(text: string): void; onResult?(r: CaseResult): void; onLog?(level: LogLevel, text: string): void; console?: boolean }`.
  - `gradeRun(code: string, fn: string, cases: BuiltCase[], cb: GradeCallbacks): () => void`. The return value cancels.
  - `FakeGraderWorker` (test helper) with statics `instances`, `loads: string[]`, `hangLoad: boolean`, `hangOn?: (i: number) => boolean`, `reset()`.

- [ ] **Step 1: Add the protocol types**

Append to `src/sandbox/protocol.ts`:

```ts
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
```

- [ ] **Step 2: Write `createGrader` (`src/sandbox/graderCore.ts`)**

```ts
import { compile, formatArgs } from './compile';
import type { FromGrader, ToGrader } from './protocol';

// The grader worker's message handling, kept free of `self` so the tests drive this same
// code in-process (FakeGraderWorker in src/__tests__/helpers.ts). One pad per worker:
// `load` compiles it once, then each `case` calls the named function with that case's args.
export function createGrader(post: (msg: FromGrader) => void): (msg: ToGrader) => void {
  let solution: ((...args: unknown[]) => unknown) | undefined;
  return (msg) => {
    if (msg.type === 'load') {
      try {
        // A declaration inside `new Function` is local to it, so the body hands the named
        // function back instead of it being looked up on globalThis. That also makes
        // `const solution = (A) => …` work exactly like `function solution`.
        const found: unknown = new Function('React', `${compile(msg.code)}\n;return typeof ${msg.fn} === 'function' ? ${msg.fn} : undefined;`)({});
        if (typeof found !== 'function') {
          post({ type: 'load-error', text: `Define a function named ${msg.fn}.` });
          return;
        }
        solution = found as (...args: unknown[]) => unknown;
        post({ type: 'loaded' });
      } catch (err) {
        post({ type: 'load-error', text: formatArgs([err]) });
      }
      return;
    }
    if (!solution) return;
    const t0 = performance.now();
    let value: unknown;
    try {
      value = solution(...msg.args);
    } catch (err) {
      post({ type: 'result', i: msg.i, ok: false, error: formatArgs([err]), ms: performance.now() - t0 });
      return;
    }
    const ms = performance.now() - t0;
    // postMessage structured-clones; a returned function or Promise throws here, and that
    // is the solution's fault, not the grader's.
    try {
      post({ type: 'result', i: msg.i, ok: true, value, ms });
    } catch (err) {
      post({ type: 'result', i: msg.i, ok: false, error: `The return value could not be sent back: ${formatArgs([err])}`, ms });
    }
  };
}
```

- [ ] **Step 3: Write the worker entry (`src/sandbox/grader.ts`)**

```ts
import { forwardConsole } from './compile';
import { createGrader } from './graderCore';
import type { FromGrader, ToGrader } from './protocol';

// The hidden-test runner that src/lib/gradeRun.ts drives. Separate from worker.ts because
// the protocol is: load once, then one message per case, timed by the page.
const scope = self as unknown as {
  postMessage(msg: FromGrader): void;
  addEventListener(type: 'message', fn: (e: MessageEvent<ToGrader>) => void): void;
};
const post = (msg: FromGrader) => scope.postMessage(msg);
const handle = createGrader(post);

scope.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg?.type === 'load') {
    // Run examples shows your console; Submit mutes it, so a log inside a loop over 100,000
    // items costs nothing and floods nothing.
    if (msg.console) forwardConsole((m) => { if (m.type === 'log') post(m); });
    else for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) console[level] = () => {};
  }
  if (msg?.type === 'load' || msg?.type === 'case') handle(msg);
});
```

- [ ] **Step 4: Add `FakeGraderWorker` to `src/__tests__/helpers.ts`**

```ts
import { createGrader } from '../sandbox/graderCore';
import type { FromGrader, ToGrader } from '../sandbox/protocol';

// jsdom has no Worker. This one runs the real grader core in-process, clones in both
// directions like postMessage, and answers asynchronously. `hangLoad` / `hangOn` simulate a
// pad that never finishes loading / a case that never returns, without spinning the test.
export class FakeGraderWorker {
  static instances: FakeGraderWorker[] = [];
  static loads: string[] = [];
  static hangLoad = false;
  static hangOn: ((i: number) => boolean) | undefined;
  static reset() {
    FakeGraderWorker.instances = [];
    FakeGraderWorker.loads = [];
    FakeGraderWorker.hangLoad = false;
    FakeGraderWorker.hangOn = undefined;
  }
  onmessage: ((e: MessageEvent<unknown>) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  terminated = false;
  private handle = createGrader((msg: FromGrader) => {
    const data = structuredClone(msg);
    void Promise.resolve().then(() => {
      if (!this.terminated) this.onmessage?.({ data } as MessageEvent<unknown>);
    });
  });
  constructor() {
    FakeGraderWorker.instances.push(this);
  }
  postMessage(msg: ToGrader) {
    if (this.terminated) return;
    if (msg.type === 'load') {
      FakeGraderWorker.loads.push(msg.code);
      if (FakeGraderWorker.hangLoad) return;
    }
    if (msg.type === 'case' && FakeGraderWorker.hangOn?.(msg.i)) return;
    this.handle(structuredClone(msg));
  }
  terminate() {
    this.terminated = true;
  }
}
```

- [ ] **Step 5: Write the failing runner tests**

Create `src/__tests__/gradeRun.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Grader } from '../types';
import { buildCases } from '../lib/grade';
import { LOAD_LIMIT_MS, gradeRun } from '../lib/gradeRun';
import { FakeGraderWorker } from './helpers';

const grader: Grader = {
  fn: 'solution',
  reference: (A: number[]) => [...A].sort((x, y) => x - y),
  cases: [
    { name: 'a', kind: 'example', args: [[3, 1, 2]] },
    { name: 'b', kind: 'correctness', args: [[2, 1]] },
    { name: 'c', kind: 'performance', limitMs: 100, args: [[1]] },
  ],
};
const cases = buildCases(grader, 'algo-900');
const SORT = 'function solution(A: number[]) { return [...A].sort((x, y) => x - y); }';

beforeEach(() => {
  FakeGraderWorker.reset();
  vi.stubGlobal('Worker', FakeGraderWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const run = (code: string, extra: Partial<Parameters<typeof gradeRun>[3]> = {}) => {
  const onDone = vi.fn();
  const onLoadError = vi.fn();
  const cancel = gradeRun(code, 'solution', cases, { onDone, onLoadError, ...extra });
  return { onDone, onLoadError, cancel };
};

describe('gradeRun', () => {
  test('a correct solution passes every case, in order, on one worker', async () => {
    const { onDone } = run(SORT);
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0]![0].map((r: { status: string }) => r.status)).toEqual(['pass', 'pass', 'pass']);
    expect(FakeGraderWorker.instances).toHaveLength(1);
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
  });

  test('a solution that sorts its input in place is judged against untouched args', async () => {
    const { onDone } = run('function solution(A: number[]) { return A.sort((x, y) => x - y); }');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0]![0].every((r: { status: string }) => r.status === 'pass')).toBe(true);
  });

  test('an arrow-function solution with a helper loads', async () => {
    const { onDone } = run('const by = (x: number, y: number) => x - y;\nconst solution = (A: number[]) => [...A].sort(by);');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onDone.mock.calls[0]![0].every((r: { status: string }) => r.status === 'pass')).toBe(true);
  });

  test('a throw is an error result, not the end of the run', async () => {
    const { onDone } = run('function solution(A: number[]) { if (A.length === 2) throw new RangeError("boom"); return [...A].sort((x, y) => x - y); }');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const [a, b, c] = onDone.mock.calls[0]![0];
    expect([a.status, b.status, b.detail, c.status]).toEqual(['pass', 'error', 'RangeError: boom', 'pass']);
  });

  test('a missing function is one load error', async () => {
    const { onDone, onLoadError } = run('function other() {}');
    await vi.waitFor(() => expect(onLoadError).toHaveBeenCalledWith('Define a function named solution.'));
    expect(onDone).not.toHaveBeenCalled();
  });

  test('a case past its limit is a timeout; the worker is replaced and the run goes on', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    FakeGraderWorker.hangOn = (i) => i === 1;
    const { onDone } = run(SORT);
    await vi.advanceTimersByTimeAsync(2000);
    expect(onDone).toHaveBeenCalled();
    expect(onDone.mock.calls[0]![0].map((r: { status: string }) => r.status)).toEqual(['pass', 'timeout', 'pass']);
    expect(FakeGraderWorker.instances).toHaveLength(2);
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
  });

  test('a pad that never finishes loading ends with a load error, not a spinner', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    FakeGraderWorker.hangLoad = true;
    const { onDone, onLoadError } = run(SORT);
    await vi.advanceTimersByTimeAsync(LOAD_LIMIT_MS + 1);
    expect(onLoadError).toHaveBeenCalledWith(expect.stringMatching(/did not finish loading/));
    expect(onDone).not.toHaveBeenCalled();
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
  });

  test('cancel terminates the worker and nothing is reported afterwards', async () => {
    const onResult = vi.fn();
    const { onDone, cancel } = run(SORT, { onResult });
    cancel();
    await new Promise((r) => setTimeout(r, 20));
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
    expect(onResult).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
```

Console forwarding lives in `grader.ts`, which the in-process fake skips by design. It's checked by hand in Task 10 Step 2: Run examples with a `console.log` shows the line, and Submit doesn't.

- [ ] **Step 6: Run them to confirm they fail**

Run: `npx vitest run src/__tests__/gradeRun.test.ts`
Expected: FAIL, `Failed to resolve import "../lib/gradeRun"`.

- [ ] **Step 7: Implement `src/lib/gradeRun.ts`**

```ts
import type { FromGrader, LogLevel, ToGrader } from '../sandbox/protocol';
import { judge, type BuiltCase, type CaseResult } from './grade';

// A pad whose top level never returns (`while (true)` outside the function) would otherwise
// leave the run waiting on `loaded` forever.
export const LOAD_LIMIT_MS = 3000;

export interface GradeCallbacks {
  onDone: (results: CaseResult[]) => void;
  /** The pad did not compile, did not define the function, or did not finish loading. */
  onLoadError: (text: string) => void;
  onResult?: (result: CaseResult) => void;
  onLog?: (level: LogLevel, text: string) => void;
  /** Forward the pad's console (Run examples) instead of muting it (Submit). */
  console?: boolean;
}

// Drives src/sandbox/grader.ts one case at a time. The timer lives here, on the page's
// thread, because a synchronous O(N²) loop inside the worker cannot be interrupted from
// inside it: on timeout the worker is terminated, the case recorded as a timeout, and a fresh
// worker loads the pad again for the next case. Returns a cancel function.
export function gradeRun(code: string, fn: string, cases: BuiltCase[], cb: GradeCallbacks): () => void {
  let worker: Worker | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let i = 0;
  let stopped = false;
  const results: CaseResult[] = [];

  const kill = () => {
    clearTimeout(timer);
    worker?.terminate();
    worker = null;
  };
  const fail = (text: string) => {
    stopped = true;
    kill();
    cb.onLoadError(text);
  };
  const record = (result: CaseResult) => {
    results.push(result);
    cb.onResult?.(result);
    i++;
    next();
  };

  const start = () => {
    const w = new Worker(new URL('../sandbox/grader.ts', import.meta.url), { type: 'module' });
    worker = w;
    w.onmessage = (e: MessageEvent<unknown>) => {
      // A terminated worker can still have a message in flight; only the live one counts.
      if (stopped || w !== worker) return;
      const msg = e.data as { type?: unknown } | null;
      if (typeof msg !== 'object' || msg === null) return;
      if (msg.type === 'loaded') {
        clearTimeout(timer);
        next();
      } else if (msg.type === 'load-error') {
        fail(String((msg as Extract<FromGrader, { type: 'load-error' }>).text));
      } else if (msg.type === 'log') {
        const log = msg as Extract<FromGrader, { type: 'log' }>;
        cb.onLog?.(log.level, String(log.text));
      } else if (msg.type === 'result') {
        const r = msg as Extract<FromGrader, { type: 'result' }>;
        if (r.i !== i) return;
        clearTimeout(timer);
        record(judge(cases[i]!, r.ok ? { value: r.value, ms: r.ms } : { error: String(r.error), ms: r.ms }));
      }
    };
    w.onerror = () => fail('The grader did not start — check the browser console.');
    timer = setTimeout(
      () => fail(`Your code did not finish loading within ${LOAD_LIMIT_MS / 1000}s — is something running at the top level?`),
      LOAD_LIMIT_MS,
    );
    w.postMessage({ type: 'load', code, fn, console: cb.console ?? false } satisfies ToGrader);
  };

  const next = () => {
    if (stopped) return;
    if (i >= cases.length) {
      stopped = true;
      kill();
      cb.onDone(results);
      return;
    }
    if (!worker) {
      start();
      return;
    }
    const c = cases[i]!;
    timer = setTimeout(() => {
      kill();
      record(judge(c, 'timeout'));
    }, c.limitMs);
    worker.postMessage({ type: 'case', i, args: c.args } satisfies ToGrader);
  };

  next();
  return () => {
    stopped = true;
    kill();
  };
}
```

- [ ] **Step 8: Run the tests to confirm they pass**

Run: `npx vitest run src/__tests__/gradeRun.test.ts && npm run typecheck`
Expected: PASS.

---

### Task 4: Run examples, Submit and the report in the practice card

**Files:**
- Create: `src/components/GradeReport.tsx`
- Modify: `src/components/ScratchPad.tsx`, `src/components/QuestionCard.tsx`
- Test: `src/__tests__/ScratchPad.test.tsx`, `src/__tests__/QuestionCard.test.tsx`

**Interfaces:**
- Consumes: `buildCases`, `score`, `CaseResult`, `Score` (Task 1); `gradeRun` (Task 3); `FakeGraderWorker` (Task 3).
- Produces:
  - `GradeReport({ results }: { results: CaseResult[] })`, rendered as `<section aria-label="Test report">`.
  - `ScratchPad` gains three props: `draftField?: string` (default `'scratch'`), `submit?: boolean` (default `true`) and `onGraded?: (s: Score) => void`.

- [ ] **Step 1: Write the failing ScratchPad tests**

Append to `src/__tests__/ScratchPad.test.tsx`. Add `FakeGraderWorker` to the imports from `./helpers`.

```ts
const algoQ: Question = {
  id: 'algo-900', round: 'algo', category: 'Arrays & hashing', scratch: true,
  question: 'Sum', statement: 'Return the sum of A.',
  code: 'function solution(A: number[]): number {\n  return 0;\n}',
  grader: {
    fn: 'solution',
    reference: (A: number[]) => A.reduce((s, v) => s + v, 0),
    cases: [
      { name: 'example', kind: 'example', args: [[1, 2]], expected: 3 },
      { name: 'empty', kind: 'correctness', args: [[]], expected: 0 },
      { name: 'large', kind: 'performance', gen: () => [[5, 5]] },
    ],
  },
  answer: ['a'], keyPoints: ['O(N)'],
};
const editor = () => screen.getByRole('textbox', { name: /scratch editor/i });

describe('ScratchPad grader', () => {
  beforeEach(() => {
    FakeGraderWorker.reset();
    vi.stubGlobal('Worker', FakeGraderWorker);
  });
  afterEach(() => vi.unstubAllGlobals());

  test('a graded pad offers Run examples and Submit, and mounts no preview frame', () => {
    render(<ScratchPad question={algoQ} />);
    expect(screen.getByRole('button', { name: /run examples/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^submit$/i })).toBeInTheDocument();
    expect(screen.queryByTitle('Preview')).not.toBeInTheDocument();
  });

  test('Run examples reports only the examples, with expected vs got', async () => {
    render(<ScratchPad question={algoQ} />);
    fireEvent.click(screen.getByRole('button', { name: /run examples/i }));
    expect(await screen.findByText('✗ example: expected 3, got 0')).toBeInTheDocument();
    expect(screen.queryByText(/empty/)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Test report' })).not.toBeInTheDocument();
  });

  test('Submit grades every case and calls onGraded with the score', async () => {
    const onGraded = vi.fn();
    render(<ScratchPad question={algoQ} onGraded={onGraded} />);
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    const report = await screen.findByRole('region', { name: 'Test report' });
    expect(report).toHaveTextContent('Correctness 50% · Performance 0% · Total 33% (1/3)');
    expect(onGraded).toHaveBeenCalledWith(expect.objectContaining({ passed: 1, count: 3 }));
  });

  test('a correct solution scores 100%', async () => {
    render(<ScratchPad question={{ ...algoQ, id: 'algo-901' }} />);
    fireEvent.change(editor(), { target: { value: 'function solution(A: number[]) { return A.reduce((s, v) => s + v, 0); }' } });
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    expect(await screen.findByRole('region', { name: 'Test report' })).toHaveTextContent('Total 100% (3/3)');
  });

  test('Stop mid-grade terminates the worker and shows no report', async () => {
    FakeGraderWorker.hangOn = () => true;
    render(<ScratchPad question={algoQ} />);
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    await vi.waitFor(() => expect(FakeGraderWorker.loads).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(screen.queryByRole('region', { name: 'Test report' })).not.toBeInTheDocument();
  });

  test('a second Run cancels the first, and unmount cancels whatever is running', async () => {
    FakeGraderWorker.hangOn = () => true;
    const { unmount } = render(<ScratchPad question={algoQ} />);
    fireEvent.click(screen.getByRole('button', { name: /run examples/i }));
    fireEvent.click(screen.getByRole('button', { name: /run examples/i }));
    expect(FakeGraderWorker.instances[0]!.terminated).toBe(true);
    unmount();
    expect(FakeGraderWorker.instances[1]!.terminated).toBe(true);
  });

  test('submit={false} hides Submit (the timed test grades at the end)', () => {
    render(<ScratchPad question={algoQ} submit={false} />);
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();
  });

  test('draftField keeps a separate draft per field', () => {
    localStorage.setItem('interview-prep:drafts', JSON.stringify({ 'algo-900:test': { text: 'TEST DRAFT', savedAt: 1 } }));
    render(<ScratchPad question={algoQ} draftField="test" />);
    expect(editor()).toHaveValue('TEST DRAFT');
  });
});
```

Add to `src/__tests__/QuestionCard.test.tsx` (reusing the same `algoQ` fixture, copied in, and the same `beforeEach` stub of `Worker`):

```ts
test('an algo card shows its statement and suggests a rating from the grade', async () => {
  render(<QuestionCard question={algoQ} revealed={false} note="" onReveal={() => {}} onNote={() => {}} onRate={() => {}} />);
  expect(screen.getByText('Return the sum of A.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
  await screen.findByRole('region', { name: 'Test report' });
});

test('after a Submit the suggestion line counts tests, not key points', async () => {
  const { rerender } = render(<QuestionCard question={algoQ} revealed={false} note="" onReveal={() => {}} onNote={() => {}} onRate={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
  await screen.findByRole('region', { name: 'Test report' });
  rerender(<QuestionCard question={algoQ} revealed note="" onReveal={() => {}} onNote={() => {}} onRate={() => {}} />);
  expect(screen.getByText(/1\/3 tests passed · suggested: Weak/)).toBeInTheDocument();
});
```

The second test needs the pad to stay mounted across the reveal. It does: `ScratchPad` renders above the `revealed` branch.

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run src/__tests__/ScratchPad.test.tsx src/__tests__/QuestionCard.test.tsx`
Expected: FAIL, no "Run examples" button.

- [ ] **Step 3: Create `src/components/GradeReport.tsx`**

```tsx
import { score, type CaseResult, type CaseStatus } from '../lib/grade';

const ICON: Record<CaseStatus, string> = { pass: '✓', fail: '✗', error: '✗', timeout: '⏱' };
const warnText = 'text-amber-700 dark:text-amber-400';

// Codility's report shape: the two scores up top, then every case, failing ones opened up
// with what went in, what was expected, and what came back.
export function GradeReport({ results }: { results: CaseResult[] }) {
  const s = score(results);
  return (
    <section aria-label="Test report" className="mt-2 rounded border border-zinc-200 p-3 text-xs dark:border-zinc-700">
      <p className="mb-2 text-sm font-medium">
        Correctness {s.correctness}% · Performance {s.performance}% · Total {s.total}% ({s.passed}/{s.count})
      </p>
      <ul className="space-y-1 font-mono">
        {results.map((r, i) => (
          <li key={i} className={r.status === 'pass' ? undefined : warnText}>
            {ICON[r.status]} {r.kind} · {r.name}
            {r.ms !== undefined && ` (${Math.round(r.ms)}ms)`}
            {r.status !== 'pass' && (
              <div className="whitespace-pre-wrap break-all pl-4 text-zinc-600 dark:text-zinc-400">
                {`input:    ${r.input}\nexpected: ${r.expected}\n${r.status === 'fail' ? `got:      ${r.got}` : r.detail}`}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Wire the grader into `src/components/ScratchPad.tsx`**

Imports:
```ts
import type { CaseKind, Question } from '../types';
import { buildCases, score, type CaseResult, type Score } from '../lib/grade';
import { gradeRun } from '../lib/gradeRun';
import { GradeReport } from './GradeReport';
```

Module-level, next to `append`:
```ts
const EXAMPLES: ReadonlySet<CaseKind> = new Set(['example']);
const exampleLine = (r: CaseResult): Line =>
  r.status === 'pass'
    ? { level: 'log', text: `✓ ${r.name} (${Math.round(r.ms ?? 0)}ms)` }
    : { level: 'warn', text: `✗ ${r.name}: ${r.status === 'fail' ? `expected ${r.expected}, got ${r.got}` : r.detail}` };
```

Signature and draft:
```ts
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
```

New state, after `runRef`:
```ts
  const cancelGrade = useRef<(() => void) | null>(null);
  const [report, setReport] = useState<CaseResult[] | null>(null);
```

The unmount effect becomes:
```ts
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    workerRef.current?.terminate();
    cancelGrade.current?.();
  }, []);
```

The grader run, defined before `run`:
```ts
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
```

`run` and `stop`:
```ts
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
```

JSX changes:
- The Run button text becomes `{grader ? 'Run examples' : 'Run'}`.
- After the Stop button add:
  ```tsx
  {grader && submit && (
    <button type="button" onClick={() => runGrader(true)} className={button}>Submit</button>
  )}
  ```
- The status span shows `'Grading…'` while running a graded pad, and `'Ran — no output'` only when there's no report either:
  ```tsx
  {status === 'running' ? (grader ? 'Grading…' : 'Running…') : status === 'done' && lines.length === 0 && !report ? 'Ran — no output' : ''}
  ```
- After the `role="log"` div: `{report && <GradeReport results={report} />}`.
- The iframe condition becomes `{!inWorker && !grader && (`.

- [ ] **Step 5: Show the statement and the grade-based suggestion in `src/components/QuestionCard.tsx`**

- Import `type Score` from `'../lib/grade'`.
- After `const checkedSet = …`:
  ```ts
  // A Submit outranks the self-ticked key points: the tests already said what passed.
  const [graded, setGraded] = useState<Score | null>(null);
  const suggested = graded
    ? suggestedRating(graded.passed, graded.count)
    : suggestedRating(checkedSet.size, question.keyPoints.length);
  ```
  (This replaces the existing `const suggested = …` line.)
- Under the `<h2>`:
  ```tsx
  {question.statement && (
    <pre className="mb-4 max-w-prose whitespace-pre-wrap rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800">{question.statement}</pre>
  )}
  ```
- Change `<ScratchPad key={question.id} question={question} shortcuts={shortcuts} />` to add `onGraded={setGraded}`.
- Change the suggestion line text to:
  ```tsx
  {graded ? `${graded.passed}/${graded.count} tests passed` : `${checkedSet.size}/${question.keyPoints.length} key points hit`} · suggested: {RATINGS.find((r) => r.value === suggested)!.label}
  ```

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `npx vitest run src/__tests__/ScratchPad.test.tsx src/__tests__/QuestionCard.test.tsx && npm run typecheck && npm run lint`
Expected: PASS. The existing ScratchPad tests still pass because the console-runner paths are unchanged.

---

### Task 5: Content, Prefix sums · Two pointers & sliding window · Sorting (algo-004…012)

**Files:**
- Modify: `src/data/algo.ts` (append to `algo`)
- Test: `src/__tests__/data.test.ts` (floor)

**Interfaces:**
- Consumes: the helpers at the top of `src/data/algo.ts` (`N`, `int`, `ints`, `range`, `shuffle`, `starter`) and the prose recipe from Task 2 Step 4.

- [ ] **Step 1: Raise the floor to fail first**

In `data.test.ts`'s `min` record set `algo: 12`. Run `npx vitest run src/__tests__/data.test.ts`.
Expected: FAIL, `algo` has 3, needs 12.

- [ ] **Step 2: Add the nine tasks**

Each entry follows the shape of `algo-001` (`round: 'algo'`, `scratch: true`, `grader.fn: 'solution'`). Write the prose with the recipe. The algorithmic content:

**algo-004 · Prefix sums · "Count the pairs of cars passing each other."**
- `starter('A: number[]', 'number', '0')`. A[i] is 0 (travelling east) or 1 (travelling west). Count pairs (P, Q) with P < Q, A[P] = 0, A[Q] = 1. Return −1 if the count exceeds 1,000,000,000. N in [1..100,000].
- Reference:
  ```ts
  reference: (A: number[]) => {
    let east = 0, pairs = 0;
    for (const v of A) {
      if (v === 0) east++;
      else if ((pairs += east) > 1e9) return -1;
    }
    return pairs;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[0, 1, 0, 1, 1]], expected: 5 },
  { name: 'single car', kind: 'correctness', args: [[0]], expected: 0 },
  { name: 'all west', kind: 'correctness', args: [[1, 1, 1]], expected: 0 },
  { name: 'all east', kind: 'correctness', args: [[0, 0, 0]], expected: 0 },
  { name: 'west then east', kind: 'correctness', args: [[1, 0]], expected: 0 },
  { name: 'east then west', kind: 'correctness', args: [[0, 1]], expected: 1 },
  { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, 0, 1)] },
  { name: 'alternating, over 10^9 pairs', kind: 'performance', gen: () => [range(N).map((i) => i % 2)] },
  ```
- Talk-track: the double loop is O(N²). Instead, a running count of eastbound cars is added at every westbound one: O(N), O(1). Mention the overflow guard, since alternating input gives 1.25 × 10⁹. Follow-ups: count from the right instead; what if cars had speeds?

**algo-005 · Prefix sums · "Answer minimum-impact queries over a DNA string."**
- `starter('S: string, P: number[], Q: number[]', 'number[]', '[]')`. S is over A, C, G, T with impacts 1, 2, 3, 4. For each k, return the minimum impact in S[P[k]..Q[k]] inclusive. N in [1..100,000], M in [1..50,000], 0 ≤ P[k] ≤ Q[k] < N.
- Reference:
  ```ts
  reference: (S: string, P: number[], Q: number[]) => {
    const n = S.length;
    const counts = ['A', 'C', 'G'].map((ch) => {
      const c = new Int32Array(n + 1);
      for (let i = 0; i < n; i++) c[i + 1] = c[i]! + (S[i] === ch ? 1 : 0);
      return c;
    });
    return P.map((p, k) => {
      const q = Q[k]!;
      const t = counts.findIndex((c) => c[q + 1]! - c[p]! > 0);
      return t === -1 ? 4 : t + 1;
    });
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: ['CAGCCTA', [2, 5, 0], [4, 5, 6]], expected: [2, 4, 1] },
  { name: 'single T', kind: 'correctness', args: ['T', [0], [0]], expected: [4] },
  { name: 'single A', kind: 'correctness', args: ['A', [0], [0]], expected: [1] },
  { name: 'all G', kind: 'correctness', args: ['GGGG', [0, 1], [3, 1]], expected: [3, 3] },
  { name: 'A only at the last index', kind: 'correctness', args: ['TTTA', [0, 3], [2, 3]], expected: [4, 1] },
  { name: 'random string, random ranges', kind: 'performance', gen: (rng) => {
    const S = Array.from({ length: N }, () => 'ACGT'[int(rng, 0, 3)]).join('');
    const P: number[] = [], Q: number[] = [];
    for (let k = 0; k < 50_000; k++) { const a = int(rng, 0, N - 1), b = int(rng, 0, N - 1); P.push(Math.min(a, b)); Q.push(Math.max(a, b)); }
    return [S, P, Q];
  } },
  { name: 'all T, every query the whole string', kind: 'performance', gen: () => ['T'.repeat(N), Array<number>(50_000).fill(0), Array<number>(50_000).fill(N - 1)] },
  ```
- Talk-track: scanning each range is O(N·M), up to 5 × 10⁹, and the all-T case defeats early exit. Prefix counts per nucleotide give O(N + M) time and O(N) space. The trap is the inclusive range: `c[q + 1] - c[p]`. Follow-ups: what if S changed between queries (Fenwick tree); why only three prefix arrays?

**algo-006 · Prefix sums · "Find where the slice with the minimal average starts."**
- `starter('A: number[]', 'number', '0')`. A slice (P, Q), P < Q, has average sum(A[P..Q]) / (Q − P + 1). Return the smallest starting index of a slice with the minimal average. N in [2..100,000], elements in [−10,000..10,000].
- Reference (it only needs slices of length 2 and 3, since any longer slice splits into those without raising its minimum):
  ```ts
  reference: (A: number[]) => {
    let best = 0, bestAvg = Infinity;
    for (let i = 0; i + 1 < A.length; i++) {
      const two = (A[i]! + A[i + 1]!) / 2;
      if (two < bestAvg) { bestAvg = two; best = i; }
      if (i + 2 < A.length) {
        const three = (A[i]! + A[i + 1]! + A[i + 2]!) / 3;
        if (three < bestAvg) { bestAvg = three; best = i; }
      }
    }
    return best;
  },
  ```
- Cases (leave out `expected` where marked; the reference computes it):
  ```ts
  { name: 'example', kind: 'example', args: [[4, 2, 2, 5, 1, 5, 8]], expected: 1 },
  { name: 'two elements', kind: 'correctness', args: [[1, 2]], expected: 0 },
  { name: 'all equal', kind: 'correctness', args: [[5, 5, 5, 5]], expected: 0 },
  { name: 'all negative', kind: 'correctness', args: [[-3, -5, -8, -4, -10]] },
  { name: 'length-three slice wins', kind: 'correctness', args: [[10, 10, -10, 10, -10]] },
  { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1e4, 1e4)] },
  { name: 'ascending', kind: 'performance', gen: () => [range(N, -50_000)] },
  ```
- Talk-track: all slices with prefix sums is O(N²). The insight is that a minimal-average slice of length ≥ 4 splits into pieces of length 2 and 3, one of which averages no more, so checking those is O(N), O(1). Ties go to the earliest index; say why float ties are exact here. Follow-ups: prove the 2-or-3 claim; return the slice length too.

**algo-007 · Two pointers & sliding window · "Count pairs in a sorted array whose sum is at most T."**
- `starter('A: number[], T: number', 'number', '0')`. A is sorted ascending. Count index pairs i < j with A[i] + A[j] ≤ T. N in [0..100,000], elements in [−10⁹..10⁹], T in [−2·10⁹..2·10⁹].
- Reference:
  ```ts
  reference: (A: number[], T: number) => {
    let i = 0, j = A.length - 1, count = 0;
    while (i < j) {
      if (A[i]! + A[j]! <= T) { count += j - i; i++; }
      else j--;
    }
    return count;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[1, 2, 3, 4, 5], 6], expected: 6 },
  { name: 'empty', kind: 'correctness', args: [[], 0], expected: 0 },
  { name: 'single', kind: 'correctness', args: [[5], 10], expected: 0 },
  { name: 'all pairs fit', kind: 'correctness', args: [[1, 1, 1], 2], expected: 3 },
  { name: 'no pair fits', kind: 'correctness', args: [[1, 2, 3], 0], expected: 0 },
  { name: 'negatives', kind: 'correctness', args: [[-5, -1, 0, 3], -2], expected: 3 },
  { name: 'random sorted', kind: 'performance', gen: (rng) => [ints(rng, N, -1e9, 1e9).sort((a, b) => a - b), int(rng, -1e9, 1e9)] },
  { name: 'every pair fits', kind: 'performance', gen: () => [range(N), 2 * N] },
  ```
- Talk-track: the double loop is O(N²). Binary search per i is O(N log N). Two pointers are O(N): when A[i] + A[j] fits, every j' in (i, j] fits too, so add j − i. Note the count can reach ~5 × 10⁹, still exact in a double. Follow-ups: count pairs exactly equal to T with duplicates; the same on an unsorted array.

**algo-008 · Two pointers & sliding window · "Find the longest substring without a repeated character."**
- `starter('S: string', 'number', '0')`. N in [0..100,000]. Characters are any UTF-16 code units.
- Reference:
  ```ts
  reference: (S: string) => {
    const last = new Map<string, number>();
    let start = 0, best = 0;
    for (let i = 0; i < S.length; i++) {
      const seen = last.get(S[i]!);
      if (seen !== undefined && seen >= start) start = seen + 1;
      last.set(S[i]!, i);
      best = Math.max(best, i - start + 1);
    }
    return best;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: ['abcabcbb'], expected: 3 },
  { name: 'empty', kind: 'correctness', args: [''], expected: 0 },
  { name: 'one repeated letter', kind: 'correctness', args: ['aaaa'], expected: 1 },
  { name: 'repeat inside the window and before it', kind: 'correctness', args: ['abba'], expected: 2 },
  { name: 'answer in the middle', kind: 'correctness', args: ['pwwkew'], expected: 3 },
  { name: 'all distinct', kind: 'correctness', args: ['abcdef'], expected: 6 },
  { name: 'random letters', kind: 'performance', gen: (rng) => [Array.from({ length: N }, () => String.fromCharCode(97 + int(rng, 0, 25))).join('')] },
  { name: '20,000-character alphabet', kind: 'performance', gen: () => [Array.from({ length: N }, (_, i) => String.fromCharCode(0x4e00 + (i % 20_000))).join('')] },
  ```
- Talk-track: restarting a scan from every start is O(N·window), and the wide alphabet makes the window 20,000. A sliding window with last-seen indexes is O(N) time, O(alphabet) space. The `"abba"` trap is to only move `start` forward. Follow-ups: return the substring itself; allow at most K distinct characters.

**algo-009 · Two pointers & sliding window · "Find the shortest subarray whose sum reaches S."**
- `starter('A: number[], S: number', 'number', '0')`. A holds positive integers. Return the minimal length of a contiguous subarray with sum ≥ S, or 0 if none exists. N in [0..100,000], A[i] in [1..10,000], S in [1..10⁹].
- Reference:
  ```ts
  reference: (A: number[], S: number) => {
    let lo = 0, sum = 0, best = Infinity;
    for (let hi = 0; hi < A.length; hi++) {
      sum += A[hi]!;
      while (sum >= S) { best = Math.min(best, hi - lo + 1); sum -= A[lo]!; lo++; }
    }
    return best === Infinity ? 0 : best;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[2, 3, 1, 2, 4, 3], 7], expected: 2 },
  { name: 'empty', kind: 'correctness', args: [[], 1], expected: 0 },
  { name: 'never reaches S', kind: 'correctness', args: [[1, 1, 1], 10], expected: 0 },
  { name: 'single element exactly S', kind: 'correctness', args: [[5], 5], expected: 1 },
  { name: 'needs the whole array', kind: 'correctness', args: [[1, 2, 3], 6], expected: 3 },
  { name: 'one element alone suffices', kind: 'correctness', args: [[1, 4, 4], 4], expected: 1 },
  { name: 'wide window', kind: 'performance', gen: (rng) => [ints(rng, N, 1, 1000), 25_000_000] },
  { name: 'S above the total', kind: 'performance', gen: (rng) => [ints(rng, N, 1, 1e4), 1e9] },
  ```
- Talk-track: every start extended until the sum reaches S is O(N²) for wide windows. Because values are positive, the window can shrink from the left, so each index enters and leaves once: O(N), O(1). With negatives this breaks; say so. Follow-ups: what if values can be negative (monotonic deque on prefix sums); return the subarray.

**algo-010 · Sorting · "Count the distinct values in an array."**
- `starter('A: number[]', 'number', '0')`. N in [0..100,000], elements in [−1,000,000..1,000,000].
- Reference: `reference: (A: number[]) => new Set(A).size,`
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[2, 1, 1, 2, 3, 1]], expected: 3 },
  { name: 'empty', kind: 'correctness', args: [[]], expected: 0 },
  { name: 'single', kind: 'correctness', args: [[7]], expected: 1 },
  { name: 'negatives', kind: 'correctness', args: [[-1, 1, -1]], expected: 2 },
  { name: 'all the same', kind: 'correctness', args: [[0, 0, 0]], expected: 1 },
  { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1e6, 1e6)] },
  { name: 'all distinct', kind: 'performance', gen: (rng) => [shuffle(range(N), rng)] },
  ```
- Talk-track: `indexOf` per element is O(N²). Sorting then counting changes is O(N log N) with O(1) extra space. A Set is O(N) time and space. Name the trade-off. Follow-ups: values up to 10¹² in a stream with bounded memory (HyperLogLog, at a high level); why does `sort()` without a comparator break this for negatives?

**algo-011 · Sorting · "Find the maximal product of any three elements."**
- `starter('A: number[]', 'number', '0')`. N in [3..100,000], elements in [−1,000..1,000].
- Reference:
  ```ts
  reference: (A: number[]) => {
    const s = [...A].sort((a, b) => a - b);
    const n = s.length;
    return Math.max(s[n - 1]! * s[n - 2]! * s[n - 3]!, s[0]! * s[1]! * s[n - 1]!);
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[-3, 1, 2, -2, 5, 6]], expected: 60 },
  { name: 'exactly three', kind: 'correctness', args: [[1, 2, 3]], expected: 6 },
  { name: 'all negative', kind: 'correctness', args: [[-5, -4, -3, -2]], expected: -24 },
  { name: 'two big negatives', kind: 'correctness', args: [[-10, -10, 1, 3, 2]], expected: 300 },
  { name: 'zeros', kind: 'correctness', args: [[0, 0, 0]], expected: 0 },
  { name: 'extremes', kind: 'correctness', args: [[-1000, -1000, 1000]], expected: 1e9 },
  { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1000, 1000)] },
  ```
- Talk-track: all triples is O(N³). Sorting is O(N log N), and the answer is either the top three or the bottom two times the top one. A single pass tracking five values is O(N). Follow-ups: do it in one pass; the maximal product of K elements.

**algo-012 · Sorting · "Count intersecting pairs of discs."**
- `starter('A: number[]', 'number', '0')`. Disc i is centred at (i, 0) with radius A[i]. Count pairs of discs with at least one common point. Return −1 if there are more than 10,000,000. N in [0..100,000], A[i] in [0..2,147,483,647].
- Reference:
  ```ts
  reference: (A: number[]) => {
    const n = A.length;
    const starts = A.map((r, i) => i - r).sort((a, b) => a - b);
    const ends = A.map((r, i) => i + r).sort((a, b) => a - b);
    let count = 0, j = 0;
    for (let i = 0; i < n; i++) {
      while (j < n && starts[j]! <= ends[i]!) j++;
      count += j - i - 1;
      if (count > 1e7) return -1;
    }
    return count;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[1, 5, 2, 1, 4, 0]], expected: 11 },
  { name: 'empty', kind: 'correctness', args: [[]], expected: 0 },
  { name: 'single disc', kind: 'correctness', args: [[0]], expected: 0 },
  { name: 'points only', kind: 'correctness', args: [[0, 0, 0]], expected: 0 },
  { name: 'touching', kind: 'correctness', args: [[1, 1]], expected: 1 },
  { name: 'touching at a point', kind: 'correctness', args: [[1, 0, 0]], expected: 1 },
  { name: 'radii past 32-bit sums', kind: 'correctness', args: [[2147483647, 0, 2147483647]], expected: 3 },
  { name: 'small radii', kind: 'performance', gen: (rng) => [ints(rng, N, 0, 10)] },
  { name: 'huge overlap', kind: 'performance', gen: () => [Array<number>(N).fill(1e6)] },
  ```
- Talk-track: checking every pair is O(N²). Turn the discs into intervals, sort starts and ends, then sweep. For each end, the number of starts ≤ it, minus the discs already counted, minus itself: O(N log N). The trap is that i + A[i] overflows 32 bits in other languages but not in JS doubles. Follow-ups: why `j - i - 1`; the count of discs covering a given point.

- [ ] **Step 3: Run the data tests to confirm they pass**

Run: `npx vitest run src/__tests__/data.test.ts && npm run typecheck`
Expected: PASS. A failure in `the reference returns every hand-written expected value` means the hand-written value or the reference is wrong. Work the case by hand before changing either.

---

### Task 6: Timed test tab

**Files:**
- Modify: `src/lib/lap.ts` (timed-test store + `clearAllLaps`)
- Create: `src/components/TimedTest.tsx`
- Modify: `src/components/RoundView.tsx`
- Test: `src/__tests__/TimedTest.test.tsx`, `src/__tests__/RoundView.test.tsx`

**Interfaces:**
- Consumes:
  - `ScratchPad` with `draftField="test"` and `submit={false}` (Task 4).
  - `GradeReport` (Task 4).
  - `gradeRun` (Task 3).
  - `buildCases` (Task 1).
  - `orderQueue(questions, progress, now, random)` from `src/lib/queue.ts`.
  - `useQuestionTimer({ targetSeconds, strictMode, revealed, onAutoReveal, startedAt })`.
  - `readDraft`, `clearDraft`, `draftKey` from `src/lib/drafts.ts`.
  - `RatingRadios({ rating, onRate })`.
- Produces:
  - `interface TimedTestState { questionIds: string[]; startedAt: number; submitted: boolean }`, plus `readTimedTest()`, `writeTimedTest(s)` and `clearTimedTest()` in `src/lib/lap.ts`.
  - `TEST_TASKS = 3`, `TEST_SECONDS = 5400`.
  - `drawTest(questions, progress, random?)`.
  - `TimedTest({ state, dispatch, role })`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/TimedTest.test.tsx`:

```tsx
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useReducer } from 'react';
import { EMPTY, FakeGraderWorker } from './helpers';
import { reducer } from '../hooks/useAppState';
import { forRole } from '../data';
import { readTimedTest, writeTimedTest } from '../lib/lap';
import { TEST_SECONDS, TimedTest, drawTest } from '../components/TimedTest';

const pool = forRole('staff').byRound('algo');

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <TimedTest state={state} dispatch={dispatch} role="staff" />;
}

beforeEach(() => {
  localStorage.clear();
  FakeGraderWorker.reset();
  vi.stubGlobal('Worker', FakeGraderWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('drawTest', () => {
  test('draws three tasks from three different categories', () => {
    const tasks = drawTest(pool, {}, () => 0);
    expect(tasks).toHaveLength(3);
    expect(new Set(tasks.map((q) => q.category)).size).toBe(3);
  });

  test('weak tasks come first', () => {
    const weak = pool[pool.length - 1]!;
    const tasks = drawTest(pool, { [weak.id]: { rating: 1, seen: 1, lastSeen: 1 } }, () => 0);
    expect(tasks[0]!.id).toBe(weak.id);
  });
});

describe('TimedTest', () => {
  test('Start test draws three tasks with a switcher, a countdown, and no per-task Submit', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    for (const n of [1, 2, 3]) expect(screen.getByRole('button', { name: `Task ${n}` })).toBeInTheDocument();
    expect(await screen.findByRole('timer')).toHaveTextContent(/Time left: (90:00|89:5\d)/);
    expect(screen.queryByRole('button', { name: /^submit$/i })).not.toBeInTheDocument();
    expect(readTimedTest()?.questionIds).toHaveLength(3);
  });

  test('a reload resumes the same tasks', () => {
    const ids = drawTest(pool, {}, () => 0).map((q) => q.id);
    writeTimedTest({ questionIds: ids, startedAt: Date.now() - 60_000, submitted: false });
    render(<Harness />);
    expect(screen.getByRole('heading', { name: pool.find((q) => q.id === ids[0])!.question })).toBeInTheDocument();
  });

  test('a session past twice its length is dropped', () => {
    writeTimedTest({ questionIds: drawTest(pool, {}, () => 0).map((q) => q.id), startedAt: Date.now() - 2 * TEST_SECONDS * 1000 - 1, submitted: false });
    render(<Harness />);
    expect(screen.getByRole('button', { name: /start test/i })).toBeInTheDocument();
  });

  test('Submit test grades all three and offers ratings', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit test/i }));
    expect(await screen.findAllByRole('region', { name: 'Test report' }, { timeout: 5000 })).toHaveLength(3);
    expect(screen.getAllByRole('radiogroup')).toHaveLength(3);
    expect(readTimedTest()?.submitted).toBe(true);
  });

  test('the clock running out submits, including code typed under 300ms before it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    const ids = drawTest(pool, {}, () => 0).map((q) => q.id);
    writeTimedTest({ questionIds: ids, startedAt: Date.now() - TEST_SECONDS * 1000 + 1000, submitted: false });
    render(<Harness />);
    act(() => { vi.advanceTimersByTime(800); });
    fireEvent.change(screen.getByRole('textbox', { name: /scratch editor/i }), { target: { value: '// LAST SECOND\nfunction solution() { return 0; }' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(readTimedTest()?.submitted).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(FakeGraderWorker.loads[0]).toContain('// LAST SECOND');
  });

  test('New test clears the session and the test drafts', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /scratch editor/i }), { target: { value: 'draft' } });
    fireEvent.click(screen.getByRole('button', { name: /submit test/i }));
    fireEvent.click(await screen.findByRole('button', { name: /new test/i }));
    expect(readTimedTest()).toBeUndefined();
    expect(localStorage.getItem('interview-prep:drafts') ?? '').not.toContain(':test');
  });
});
```

In `src/__tests__/RoundView.test.tsx`, add next to the 45-min-prompt test:

```tsx
  test('the algorithms round gets a third "Timed test" tab; design does not', () => {
    function RoundHarness({ roundId }: { roundId: 'algo' | 'design' }) {
      const [state, dispatch] = useReducer(reducer, EMPTY);
      return <RoundView roundId={roundId} state={state} dispatch={dispatch} strictMode={false} role="staff" />;
    }
    const { unmount } = render(<RoundHarness roundId="design" />);
    expect(screen.queryByRole('tab', { name: /timed test/i })).not.toBeInTheDocument();
    unmount();
    render(<RoundHarness roundId="algo" />);
    expect(screen.getByRole('tab', { name: /timed test/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /45-min prompt/i })).not.toBeInTheDocument();
  });
```

(`RatingRadios` renders `role="radiogroup"`, so the `getAllByRole('radiogroup')` count in the TimedTest test is correct as written.)

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run src/__tests__/TimedTest.test.tsx src/__tests__/RoundView.test.tsx`
Expected: FAIL, `Failed to resolve import "../components/TimedTest"`.

- [ ] **Step 3: Add the store to `src/lib/lap.ts`**

After the design-session block:

```ts
// The timed test in progress: which three tasks, when its 90 minutes started, whether it
// has been handed in. Same class as the design session — a position, not prep data — and
// for the same reason: a reload mid-test must come back to the same tasks and clock.
// Results are not stored; once submitted, they are re-graded from the test drafts.
const TIMED_KEY = 'interview-prep:timed-test';

export interface TimedTestState { questionIds: string[]; startedAt: number; submitted: boolean }

const parseTimedTest = (_key: string, v: unknown): TimedTestState | undefined => {
  if (typeof v !== 'object' || v === null) return undefined;
  const s = v as Record<string, unknown>;
  if (!isStringArray(s.questionIds) || typeof s.startedAt !== 'number' || typeof s.submitted !== 'boolean') return undefined;
  return { questionIds: s.questionIds, startedAt: s.startedAt, submitted: s.submitted };
};

const timedStore = keyedStore<TimedTestState>(TIMED_KEY, parseTimedTest);

export const readTimedTest = (): TimedTestState | undefined => timedStore.read('current');

export function writeTimedTest(session: TimedTestState): void {
  timedStore.write('current', session);
}

export function clearTimedTest(): void {
  timedStore.clear();
}
```

In `clearAllLaps()`, add `timedStore.clear();` and extend the comment: "The timed test likewise."

- [ ] **Step 4: Create `src/components/TimedTest.tsx`**

```tsx
import { useEffect, useMemo, useState, type Dispatch } from 'react';
import type { Persisted, Progress, Question, RoleId } from '../types';
import type { Action } from '../hooks/useAppState';
import { forRole } from '../data';
import { orderQueue } from '../lib/queue';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { clearDraft, draftKey, readDraft } from '../lib/drafts';
import { clearTimedTest, readTimedTest, writeTimedTest, type TimedTestState } from '../lib/lap';
import { buildCases, type CaseResult } from '../lib/grade';
import { gradeRun } from '../lib/gradeRun';
import { formatTime } from '../lib/format';
import { ScratchPad } from './ScratchPad';
import { GradeReport } from './GradeReport';
import { RatingRadios } from './RatingRadios';

export const TEST_TASKS = 3;
export const TEST_SECONDS = 90 * 60;
// Past twice its length a test was abandoned, not paused.
const RESUMABLE_MS = 2 * TEST_SECONDS * 1000;
// Its own draft slot: a test starts from the blank starter, not from your practice pad.
const DRAFT_FIELD = 'test';

const primary = 'rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300';
const secondary = 'rounded border border-zinc-300 px-3 py-1 text-sm hover:border-emerald-500 dark:border-zinc-700';

/** Weakest first, one task per category — a real Codility test mixes topics. */
export function drawTest(questions: Question[], progress: Progress, random: () => number = Math.random): Question[] {
  const picked: Question[] = [];
  const categories = new Set<string>();
  for (const q of orderQueue(questions, progress, Date.now(), random)) {
    if (categories.has(q.category)) continue;
    picked.push(q);
    categories.add(q.category);
    if (picked.length === TEST_TASKS) break;
  }
  return picked;
}

const clearTestDrafts = (ids: string[]) => {
  for (const id of ids) clearDraft(draftKey(id, DRAFT_FIELD));
};

export function TimedTest({ state, dispatch, role }: { state: Persisted; dispatch: Dispatch<Action>; role: RoleId }) {
  const pool = forRole(role).byRound('algo');
  const [session, setSession] = useState<TimedTestState | undefined>(() => {
    const saved = readTimedTest();
    if (saved && Date.now() - saved.startedAt < RESUMABLE_MS && saved.questionIds.every((id) => pool.some((q) => q.id === id))) return saved;
    if (saved) clearTimedTest();
    return undefined;
  });
  const save = (next: TimedTestState | undefined) => {
    if (next) writeTimedTest(next);
    else clearTimedTest();
    setSession(next);
  };

  if (!session) {
    return (
      <article className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-medium">Timed test</h2>
        <p className="mb-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          Three tasks from three different categories, one 90-minute clock. Run examples as often as you like; the hidden
          tests run when you submit or when the clock reaches zero.
        </p>
        <button
          type="button"
          className={primary}
          onClick={() => {
            const ids = drawTest(pool, state.progress).map((q) => q.id);
            clearTestDrafts(ids);
            save({ questionIds: ids, startedAt: Date.now(), submitted: false });
          }}
        >
          Start test
        </button>
      </article>
    );
  }
  return (
    <TestSession
      key={session.startedAt}
      session={session}
      pool={pool}
      state={state}
      dispatch={dispatch}
      onSubmit={() => save({ ...session, submitted: true })}
      onNew={() => {
        clearTestDrafts(session.questionIds);
        save(undefined);
      }}
    />
  );
}

type Report = { results: CaseResult[] } | { error: string };

function TestSession({
  session, pool, state, dispatch, onSubmit, onNew,
}: {
  session: TimedTestState; pool: Question[]; state: Persisted; dispatch: Dispatch<Action>;
  onSubmit: () => void; onNew: () => void;
}) {
  // Memoised so the grading effect below does not restart (and cancel itself) on every
  // re-render its own results cause.
  const tasks = useMemo(() => session.questionIds.map((id) => pool.find((q) => q.id === id)!), [pool, session.questionIds]);
  const [active, setActive] = useState(0);
  const [reports, setReports] = useState<Record<string, Report>>({});

  // Codility hands the test in at zero, so this one auto-submits — on a resumed session
  // whose deadline already passed, immediately.
  const { remainingMs } = useQuestionTimer({
    targetSeconds: TEST_SECONDS, strictMode: true, revealed: session.submitted, onAutoReveal: onSubmit, startedAt: session.startedAt,
  });

  // Runs after the pads unmount on submit, and unmounting flushes their debounced drafts,
  // so the last keystrokes before an auto-submit are in what gets graded. One task at a
  // time: three workers racing each other would skew the timings the limits judge.
  useEffect(() => {
    if (!session.submitted) return;
    let alive = true;
    let cancel = () => {};
    const gradeFrom = (k: number) => {
      const q = tasks[k];
      if (!alive || !q) return;
      const settle = (report: Report) => {
        setReports((r) => ({ ...r, [q.id]: report }));
        gradeFrom(k + 1);
      };
      cancel = gradeRun(readDraft(draftKey(q.id, DRAFT_FIELD)) ?? q.code ?? '', q.grader!.fn, buildCases(q.grader!, q.id), {
        onDone: (results) => settle({ results }),
        onLoadError: (error) => settle({ error }),
      });
    };
    gradeFrom(0);
    return () => {
      alive = false;
      cancel();
    };
  }, [session.submitted, tasks]);

  if (!session.submitted) {
    const q = tasks[active]!;
    return (
      <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Tasks" className="flex gap-2">
            {tasks.map((t, i) => (
              <button key={t.id} type="button" aria-pressed={i === active} onClick={() => setActive(i)} className={i === active ? `${secondary} border-emerald-500` : secondary}>
                Task {i + 1}
              </button>
            ))}
          </div>
          {remainingMs !== null && (
            <p role="timer" aria-live="off" className="text-xs text-zinc-500 dark:text-zinc-400">Time left: {formatTime(remainingMs)}</p>
          )}
        </div>
        <h2 className="mb-2 text-lg font-medium">{q.question}</h2>
        <pre className="mb-4 max-w-prose whitespace-pre-wrap rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800">{q.statement}</pre>
        <ScratchPad key={q.id} question={q} draftField={DRAFT_FIELD} submit={false} />
        <button type="button" onClick={onSubmit} className={primary}>Submit test</button>
      </article>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((q, i) => {
        const report = reports[q.id];
        return (
          <article key={q.id} className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-2 text-lg font-medium">Task {i + 1}: {q.question}</h2>
            {report === undefined ? (
              <p role="status">Grading…</p>
            ) : 'error' in report ? (
              <p role="alert" className="text-amber-700 dark:text-amber-400">✗ {report.error}</p>
            ) : (
              <GradeReport results={report.results} />
            )}
            <details className="my-3">
              <summary className="cursor-pointer font-semibold">Model answer</summary>
              <div className="mt-2 max-w-prose space-y-2">
                {q.answer.map((p, j) => <p key={j}>{p}</p>)}
                <ul className="list-disc pl-5">{q.keyPoints.map((k, j) => <li key={j}>{k}</li>)}</ul>
              </div>
            </details>
            <RatingRadios rating={state.progress[q.id]?.rating} onRate={(r) => dispatch({ type: 'rate', id: q.id, rating: r, now: Date.now() })} />
          </article>
        );
      })}
      <button type="button" onClick={onNew} className={primary}>New test</button>
    </div>
  );
}
```

- [ ] **Step 5: Add the tab in `src/components/RoundView.tsx`**

```ts
import { TimedTest } from './TimedTest';
// …
type Tab = 'practice' | 'browse' | 'design-prompt' | 'timed-test';
const TAB_LABEL: Record<Tab, string> = { practice: 'Practice', browse: 'Browse', 'design-prompt': '45-min prompt', 'timed-test': 'Timed test' };
// …
const TABS: Tab[] =
  roundId === 'design' ? ['practice', 'browse', 'design-prompt'] :
  roundId === 'algo' ? ['practice', 'browse', 'timed-test'] :
  ['practice', 'browse'];
// … in the tabpanel:
{tab === 'timed-test' && <TimedTest state={state} dispatch={dispatch} role={role} />}
```

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `npx vitest run src/__tests__/TimedTest.test.tsx src/__tests__/RoundView.test.tsx && npm run typecheck && npm run lint`
Expected: PASS. If the auto-submit test shows the draft missing from `FakeGraderWorker.loads[0]`, the unmount flush ran after the grading effect. Fix it by having `gradeFrom(0)` start in a `setTimeout(…, 0)` inside the effect (and clear it in cleanup), and note why in the comment. Don't paper over it in the test.

---

### Task 7: Content, Stacks & queues · Binary search (algo-013…018)

**Files:**
- Modify: `src/data/algo.ts`, `src/__tests__/data.test.ts` (floor `algo: 18`)

- [ ] **Step 1: Raise the floor to `algo: 18` and confirm the data test fails**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: FAIL on the `algo` floor.

- [ ] **Step 2: Add the six tasks** (same shape and prose recipe as Task 2 Step 4)

**algo-013 · Stacks & queues · "Check whether a string of brackets is properly nested."**
- `starter('S: string', 'number', '0')`. S consists of `()[]{}`. Return 1 if properly nested, else 0. The empty string is nested. N in [0..200,000].
- Reference:
  ```ts
  reference: (S: string) => {
    const open: string[] = [];
    const pair: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    for (const c of S) {
      if (c in pair) { if (open.pop() !== pair[c]) return 0; }
      else open.push(c);
    }
    return open.length === 0 ? 1 : 0;
  },
  ```
- Cases:
  ```ts
  { name: 'example: nested', kind: 'example', args: ['{[()()]}'], expected: 1 },
  { name: 'example: crossed', kind: 'example', args: ['([)()]'], expected: 0 },
  { name: 'empty', kind: 'correctness', args: [''], expected: 1 },
  { name: 'single opener', kind: 'correctness', args: ['('], expected: 0 },
  { name: 'single closer', kind: 'correctness', args: [')'], expected: 0 },
  { name: 'wrong closer', kind: 'correctness', args: ['(]'], expected: 0 },
  { name: 'closer first', kind: 'correctness', args: ['}{'], expected: 0 },
  { name: 'siblings', kind: 'correctness', args: ['((()))[]{}'], expected: 1 },
  { name: 'deep nesting', kind: 'performance', gen: () => ['('.repeat(N) + ')'.repeat(N)] },
  { name: 'deep mixed nesting', kind: 'performance', gen: () => ['{[('.repeat(33_333) + ')]}'.repeat(33_333)] },
  { name: 'one closer short', kind: 'performance', gen: () => ['('.repeat(N) + ')'.repeat(N - 1)] },
  ```
- Talk-track: repeatedly deleting `()` pairs is O(N²) on deep nesting. A stack of openers is O(N) time and O(N) space. The traps are a closer on an empty stack and leftover openers. Follow-ups: only one bracket type in O(1) space (a counter); report the first bad index.

**algo-014 · Stacks & queues · "Count the fish that stay alive."**
- `starter('A: number[], B: number[]', 'number', '0')`. Fish i has a distinct size A[i] and direction B[i]: 0 means upstream (towards index 0), 1 means downstream. When a downstream fish meets an upstream one ahead of it, the bigger eats the smaller. Return the number of survivors. N in [1..100,000].
- Reference:
  ```ts
  reference: (A: number[], B: number[]) => {
    const down: number[] = [];
    let survivors = 0;
    for (let i = 0; i < A.length; i++) {
      if (B[i] === 1) { down.push(A[i]!); continue; }
      while (down.length > 0 && down[down.length - 1]! < A[i]!) down.pop();
      if (down.length === 0) survivors++;
    }
    return survivors + down.length;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[4, 3, 2, 1, 5], [0, 1, 0, 0, 0]], expected: 2 },
  { name: 'single fish', kind: 'correctness', args: [[5], [1]], expected: 1 },
  { name: 'all upstream', kind: 'correctness', args: [[1, 2, 3], [0, 0, 0]], expected: 3 },
  { name: 'all downstream', kind: 'correctness', args: [[1, 2, 3], [1, 1, 1]], expected: 3 },
  { name: 'upstream fish wins', kind: 'correctness', args: [[1, 2], [1, 0]], expected: 1 },
  { name: 'downstream fish wins', kind: 'correctness', args: [[2, 1], [1, 0]], expected: 1 },
  { name: 'random', kind: 'performance', gen: (rng) => [shuffle(range(N), rng), ints(rng, N, 0, 1)] },
  { name: 'every upstream fish meets every downstream one', kind: 'performance', gen: () => [range(N), range(N).map((i) => (i < N / 2 ? 1 : 0))] },
  ```
- Talk-track: simulating meetings is O(N²). A stack of downstream fish that upstream fish fight through is O(N), since each fish is pushed and popped at most once. Follow-ups: fish with equal sizes; return which fish survive.

**algo-015 · Stacks & queues · "Count the minimum number of rectangular blocks to build a wall."**
- `starter('H: number[]', 'number', '0')`. H[i] is the wall's height on segment i. Blocks are rectangles. Return the minimum count. N in [1..100,000], H[i] in [1..10⁹].
- Reference:
  ```ts
  reference: (H: number[]) => {
    const stack: number[] = [];
    let blocks = 0;
    for (const h of H) {
      while (stack.length > 0 && stack[stack.length - 1]! > h) stack.pop();
      if (stack.length === 0 || stack[stack.length - 1]! < h) { stack.push(h); blocks++; }
    }
    return blocks;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[8, 8, 5, 7, 9, 8, 7, 4, 8]], expected: 7 },
  { name: 'single segment', kind: 'correctness', args: [[5]], expected: 1 },
  { name: 'increasing', kind: 'correctness', args: [[1, 2, 3]], expected: 3 },
  { name: 'decreasing', kind: 'correctness', args: [[3, 2, 1]], expected: 3 },
  { name: 'flat', kind: 'correctness', args: [[2, 2, 2]], expected: 1 },
  { name: 'returning to an open height', kind: 'correctness', args: [[1, 2, 1, 2]], expected: 3 },
  { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, 1, 1e9)] },
  { name: 'sawtooth', kind: 'performance', gen: () => [range(N).map((i) => (i % 1000) + 1)] },
  { name: 'staircase', kind: 'performance', gen: () => [range(N, 1)] },
  ```
- Talk-track: recursively splitting at the minimum is O(N²) and overflows the stack on a staircase. A stack of open heights is O(N): pop taller ones, reuse an equal one, push and count a new one. Follow-ups: return the blocks themselves; what if blocks could also span vertically?

**algo-016 · Binary search · "Answer lower-bound queries on a sorted array."**
- `starter('A: number[], X: number[]', 'number[]', '[]')`. A is sorted ascending. For each X[k], return the first index i with A[i] ≥ X[k], or N if there is none. N in [0..100,000], M in [1..100,000], values in [−10⁹..10⁹].
- Reference:
  ```ts
  reference: (A: number[], X: number[]) =>
    X.map((x) => {
      let lo = 0, hi = A.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (A[mid]! < x) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }),
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[1, 3, 3, 5, 8], [3, 4, 0, 9]], expected: [1, 3, 0, 5] },
  { name: 'empty array', kind: 'correctness', args: [[], [5]], expected: [0] },
  { name: 'equal to the only element', kind: 'correctness', args: [[2], [2]], expected: [0] },
  { name: 'above the only element', kind: 'correctness', args: [[2], [3]], expected: [1] },
  { name: 'first of the duplicates', kind: 'correctness', args: [[1, 1, 1], [1]], expected: [0] },
  { name: 'negatives', kind: 'correctness', args: [[-5, -3, 0], [-4, -10, 1]], expected: [1, 0, 3] },
  { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1e9, 1e9).sort((a, b) => a - b), ints(rng, N, -1e9, 1e9)] },
  { name: 'every query past the end', kind: 'performance', gen: () => [range(N), Array<number>(N).fill(N)] },
  ```
- Talk-track: a linear scan per query is O(N·M) = 10¹⁰. Binary search is O(M log N). The traps are `hi = A.length` (not `length − 1`) and `<` versus `≤` for lower versus upper bound. Mention `(lo + hi) >> 1` and its 2³¹ ceiling. Follow-ups: upper bound / count of x; sorting the queries for an O(N + M) two-pointer.

**algo-017 · Binary search · "Split an array into K blocks minimising the largest block sum."**
- `starter('K: number, A: number[]', 'number', '0')`. Split A into at most K contiguous, possibly empty blocks. Return the minimal possible largest block sum. N, K in [1..100,000], A[i] in [0..10,000].
- Reference:
  ```ts
  reference: (K: number, A: number[]) => {
    const blocksFor = (cap: number) => {
      let blocks = 1, sum = 0;
      for (const v of A) {
        if (sum + v > cap) { blocks++; sum = v; }
        else sum += v;
      }
      return blocks;
    };
    let lo = A.reduce((m, v) => Math.max(m, v), 0), hi = A.reduce((s, v) => s + v, 0);
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (blocksFor(mid) <= K) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [3, [2, 1, 5, 1, 2, 2, 2]], expected: 6 },
  { name: 'one block', kind: 'correctness', args: [1, [1, 2, 3]], expected: 6 },
  { name: 'more blocks than elements', kind: 'correctness', args: [5, [1, 2, 3]], expected: 3 },
  { name: 'all zeros', kind: 'correctness', args: [2, [0, 0, 0]], expected: 0 },
  { name: 'single max element', kind: 'correctness', args: [1, [10_000]], expected: 10_000 },
  { name: 'random, small K', kind: 'performance', gen: (rng) => [int(rng, 1, 100), ints(rng, N, 0, 1e4)] },
  { name: 'K = N', kind: 'performance', gen: (rng) => [N, ints(rng, N, 0, 1e4)] },
  ```
- Talk-track: DP over split points is O(N²·K). Binary search on the answer between max(A) and sum(A), with a greedy O(N) feasibility check, is O(N log sum). Name the monotonicity that makes it valid. Follow-ups: return the split points; why not use `Math.max(...A)` (argument limits).

**algo-018 · Binary search · "Find the fewest nails that pin every plank."**
- `starter('A: number[], B: number[], C: number[]', 'number', '-1')`. Plank i spans [A[i], B[i]]. Nails C[j] are used in order. Return the minimum count of leading nails such that every plank contains at least one nail, or −1. N, M in [1..100,000], positions in [1..200,000], A[i] ≤ B[i].
- Reference:
  ```ts
  reference: (A: number[], B: number[], C: number[]) => {
    let max = 0;
    for (const xs of [A, B, C]) for (const v of xs) if (v > max) max = v;
    const allNailed = (k: number) => {
      const prefix = new Int32Array(max + 1);
      for (let j = 0; j < k; j++) prefix[C[j]!] = 1;
      for (let p = 1; p <= max; p++) prefix[p] = prefix[p]! + prefix[p - 1]!;
      return A.every((a, i) => prefix[B[i]!]! - prefix[a - 1]! > 0);
    };
    let lo = 1, hi = C.length, answer = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (allNailed(mid)) { answer = mid; hi = mid - 1; }
      else lo = mid + 1;
    }
    return answer;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[1, 4, 5, 8], [4, 5, 9, 10], [4, 6, 7, 10, 2]], expected: 4 },
  { name: 'one plank, one nail', kind: 'correctness', args: [[1], [1], [1]], expected: 1 },
  { name: 'nail misses', kind: 'correctness', args: [[1], [1], [2]], expected: -1 },
  { name: 'nail on the endpoint', kind: 'correctness', args: [[2], [3], [3]], expected: 1 },
  { name: 'needs both nails', kind: 'correctness', args: [[1, 5], [2, 6], [5, 1]], expected: 2 },
  { name: 'random planks and nails', kind: 'performance', gen: (rng) => {
    const A = ints(rng, N, 1, 199_000);
    return [A, A.map((a) => Math.min(200_000, a + int(rng, 0, 1000))), ints(rng, N, 1, 200_000)];
  } },
  ```
- Talk-track: for each plank, scanning nails in order is O(N·M). Binary search on the nail count, with a prefix-count of nailed positions per check, is O((N + M + max) log M). The traps are inclusive endpoints and `prefix[a − 1]`. Follow-ups: the O((N + M) log M) per-plank approach (earliest nail in range via sorted nails + a range-minimum structure); return which planks block a smaller answer.

- [ ] **Step 3: Run the data tests to confirm they pass**

Run: `npx vitest run src/__tests__/data.test.ts && npm run typecheck`
Expected: PASS.

---

### Task 8: Content, Greedy · Dynamic programming (algo-019…024) and the final floor

**Files:**
- Modify: `src/data/algo.ts`, `src/__tests__/data.test.ts`

- [ ] **Step 1: Raise the floor to fail first**

Set `algo: 24` in `min`. Add to the `algorithms round` describe:

```ts
  test('every category has exactly three tasks', () => {
    const byCategory = new Map<string, number>();
    for (const q of algo) byCategory.set(q.category, (byCategory.get(q.category) ?? 0) + 1);
    expect([...byCategory.entries()]).toEqual([
      ['Arrays & hashing', 3], ['Prefix sums', 3], ['Two pointers & sliding window', 3], ['Sorting', 3],
      ['Stacks & queues', 3], ['Binary search', 3], ['Greedy', 3], ['Dynamic programming', 3],
    ]);
  });
```

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: FAIL (the floor, and the category list is missing Greedy / Dynamic programming).

- [ ] **Step 2: Add the six tasks** (same shape and prose recipe)

**algo-019 · Greedy · "Find the maximal profit from one buy and one later sell."**
- `starter('A: number[]', 'number', '0')`. A[i] is the price on day i. Return the maximal profit from buying on one day and selling on a later one, or 0. N in [0..100,000], prices in [0..200,000].
- Reference:
  ```ts
  reference: (A: number[]) => {
    let min = Infinity, best = 0;
    for (const p of A) { min = Math.min(min, p); best = Math.max(best, p - min); }
    return best;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[23171, 21011, 21123, 21366, 21013, 21367]], expected: 356 },
  { name: 'empty', kind: 'correctness', args: [[]], expected: 0 },
  { name: 'single day', kind: 'correctness', args: [[5]], expected: 0 },
  { name: 'falling prices', kind: 'correctness', args: [[5, 4, 3]], expected: 0 },
  { name: 'two days up', kind: 'correctness', args: [[1, 2]], expected: 1 },
  { name: 'minimum after the maximum', kind: 'correctness', args: [[3, 8, 1, 4]], expected: 5 },
  { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, 0, 2e5)] },
  { name: 'falling', kind: 'performance', gen: () => [range(N).map((i) => N - i)] },
  ```
- Talk-track: every buy/sell pair is O(N²). Tracking the running minimum is O(N), O(1). It's Kadane on day-to-day differences, so mention that link. Follow-ups: unlimited transactions; at most two transactions.

**algo-020 · Greedy · "Count the ropes of length at least K after tying neighbours."**
- `starter('K: number, A: number[]', 'number', '0')`. Tie adjacent ropes left to right into ropes of length ≥ K. Return the maximal number of such ropes. N in [1..100,000], A[i] and K in [1..10⁹].
- Reference:
  ```ts
  reference: (K: number, A: number[]) => {
    let count = 0, length = 0;
    for (const a of A) {
      length += a;
      if (length >= K) { count++; length = 0; }
    }
    return count;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [4, [1, 2, 3, 4, 1, 1, 3]], expected: 3 },
  { name: 'never long enough', kind: 'correctness', args: [10, [1, 2]], expected: 0 },
  { name: 'every rope already long', kind: 'correctness', args: [1, [5, 5, 5]], expected: 3 },
  { name: 'values at 10^9', kind: 'correctness', args: [1e9, [1e9, 1e9]], expected: 2 },
  { name: 'leftover at the end', kind: 'correctness', args: [3, [2, 2, 1]], expected: 1 },
  { name: 'random', kind: 'performance', gen: (rng) => [int(rng, 1, 1e6), ints(rng, N, 1, 1e4)] },
  ```
- Talk-track: the greedy is optimal because closing a rope as soon as it reaches K never hurts the remainder (exchange argument). It's O(N), O(1). Say out loud why "longest first" or "re-summing windows" is unnecessary. Follow-ups: ropes in a circle; minimise the leftover instead.

**algo-021 · Greedy · "Count the most non-overlapping segments."**
- `starter('A: number[], B: number[]', 'number', '0')`. Segment i is [A[i], B[i]]. Segments are sorted by end (B ascending). Two segments overlap if they share a point. Return the size of the largest set of pairwise non-overlapping segments. N in [0..100,000], values in [0..2·10⁹].
- Reference:
  ```ts
  reference: (A: number[], B: number[]) => {
    let count = 0, end = -Infinity;
    for (let i = 0; i < A.length; i++) {
      if (A[i]! > end) { count++; end = B[i]!; }
    }
    return count;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[1, 3, 7, 9, 9], [5, 6, 8, 9, 10]], expected: 3 },
  { name: 'empty', kind: 'correctness', args: [[], []], expected: 0 },
  { name: 'single', kind: 'correctness', args: [[1], [2]], expected: 1 },
  { name: 'touching counts as overlap', kind: 'correctness', args: [[1, 2], [2, 3]], expected: 1 },
  { name: 'all separate', kind: 'correctness', args: [[1, 3, 5], [2, 4, 6]], expected: 3 },
  { name: 'all overlapping', kind: 'correctness', args: [[1, 1, 1], [5, 6, 7]], expected: 1 },
  { name: 'random', kind: 'performance', gen: (rng) => {
    const segs = Array.from({ length: N }, () => { const a = int(rng, 0, 1e9); return [a, a + int(rng, 0, 1e5)] as const; }).sort((x, y) => x[1] - y[1]);
    return [segs.map((s) => s[0]), segs.map((s) => s[1])];
  } },
  ```
- Talk-track: DP over earlier segments is O(N²). Greedy by earliest end is O(N) given the sort (O(N log N) without it). Name the exchange argument. Follow-ups: weighted segments (DP + binary search); the minimum number of points that stab every segment.

**algo-022 · Dynamic programming · "Find the maximal sum of a non-empty slice."**
- `starter('A: number[]', 'number', '0')`. N in [1..100,000], elements in [−1,000,000..1,000,000].
- Reference:
  ```ts
  reference: (A: number[]) => {
    let best = A[0]!, here = 0;
    for (const v of A) { here = Math.max(v, here + v); best = Math.max(best, here); }
    return best;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[3, 2, -6, 4, 0]], expected: 5 },
  { name: 'single negative', kind: 'correctness', args: [[-5]], expected: -5 },
  { name: 'all negative', kind: 'correctness', args: [[-3, -1, -2]], expected: -1 },
  { name: 'all positive', kind: 'correctness', args: [[1, 2, 3]], expected: 6 },
  { name: 'restart beats carry', kind: 'correctness', args: [[5, -10, 6]], expected: 6 },
  { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1e6, 1e6)] },
  ```
- Talk-track: every slice is O(N²) even with prefix sums. Kadane: the best slice ending here either extends the previous one or restarts: O(N), O(1). The trap is starting `best` at 0, which breaks all-negative input. Follow-ups: return the slice bounds; the maximal circular slice.

**algo-023 · Dynamic programming · "Find the fewest coins that make an amount."**
- `starter('coins: number[], amount: number', 'number', '-1')`. Distinct denominations, unlimited supply. Return the minimum number of coins summing to `amount`, or −1. K in [1..10], coins in [1..10,000], amount in [0..100,000].
- Reference:
  ```ts
  reference: (coins: number[], amount: number) => {
    const dp = new Array<number>(amount + 1).fill(Infinity);
    dp[0] = 0;
    for (let a = 1; a <= amount; a++) {
      for (const c of coins) if (c <= a && dp[a - c]! + 1 < dp[a]!) dp[a] = dp[a - c]! + 1;
    }
    return dp[amount] === Infinity ? -1 : dp[amount]!;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[1, 2, 5], 11], expected: 3 },
  { name: 'impossible', kind: 'correctness', args: [[2], 3], expected: -1 },
  { name: 'zero amount', kind: 'correctness', args: [[1], 0], expected: 0 },
  { name: 'greedy is wrong', kind: 'correctness', args: [[1, 3, 4], 6], expected: 2 },
  { name: 'one denomination', kind: 'correctness', args: [[7], 14], expected: 2 },
  { name: 'coin larger than the amount', kind: 'correctness', args: [[5, 10], 1], expected: -1 },
  { name: 'large amount, primes', kind: 'performance', gen: () => [[7, 11, 13, 17, 19, 23], 99_999] },
  { name: 'large impossible amount', kind: 'performance', gen: () => [[2], 99_999] },
  ```
- Talk-track: plain recursion is exponential, and greedy fails on [1, 3, 4] → 6. Bottom-up DP over amounts is O(amount · K) time and O(amount) space. Name the recurrence. Follow-ups: count the number of ways instead; reconstruct which coins.

**algo-024 · Dynamic programming · "Maximise the score of a die-rolling board game."**
- `starter('A: number[]', 'number', '0')`. Start on square 0 and finish on square N − 1. Each move advances 1 to 6 squares. The score is the sum of the squares visited. Return the maximal score. N in [2..100,000], A[i] in [−10,000..10,000].
- Reference:
  ```ts
  reference: (A: number[]) => {
    const dp = [A[0]!];
    for (let i = 1; i < A.length; i++) {
      let best = -Infinity;
      for (let d = 1; d <= 6 && i - d >= 0; d++) best = Math.max(best, dp[i - d]!);
      dp.push(best + A[i]!);
    }
    return dp[A.length - 1]!;
  },
  ```
- Cases:
  ```ts
  { name: 'example', kind: 'example', args: [[1, -2, 0, 9, -1, -2]], expected: 8 },
  { name: 'two squares', kind: 'correctness', args: [[1, 2]], expected: 3 },
  { name: 'both negative', kind: 'correctness', args: [[-1, -1]], expected: -2 },
  { name: 'jump the whole bad stretch', kind: 'correctness', args: [[5, -1, -1, -1, -1, -1, -1, 10]] },
  { name: 'longer than one roll of bad squares', kind: 'correctness', args: [[0, -5, -5, -5, -5, -5, -5, -5, 0]] },
  { name: 'random', kind: 'performance', gen: (rng) => [ints(rng, N, -1e4, 1e4)] },
  ```
- Talk-track: recursion over every roll sequence is exponential. DP where each square takes the best of the previous six is O(6N) = O(N), and O(1) space with a ring of six. Follow-ups: the path itself; a die with K faces (sliding-window maximum).

- [ ] **Step 3: Run the data tests to confirm they pass**

Run: `npx vitest run src/__tests__/data.test.ts && npm run typecheck`
Expected: PASS.

---

### Task 9: Mock presets, docs and the real-browser check

**Files:**
- Modify: `src/components/MockSession.tsx:20,25`, `src/__tests__/MockSession.test.tsx`, `README.md`, `public/manifest.webmanifest`, `scripts/smoke.mjs`

- [ ] **Step 1: Update the preset compositions and their tests**

In `src/components/MockSession.tsx`:
- Full loop: `{ hr: 4, hm: 6, coding: 4, algo: 1, design: 3, case: 4, debrief: 4, hoe: 3, lead: 3, arch: 3, backend: 4 }`
- Technical: `{ hm: 8, coding: 6, algo: 2, design: 6, arch: 6, backend: 6 }`

Run: `npx vitest run src/__tests__/MockSession.test.tsx`
Expected: the totals the tests hardcode (e.g. "28 questions") are now +2 for Technical in roles with `algo`. Update each hardcoded count to the new total and re-run to PASS.

- [ ] **Step 2: Update the README and manifest**

- `README.md`:
  - Intro: "Ten rounds" → "Eleven rounds", "393 curated questions" → the new total (`node -e` it from `npx vitest`'s data, or count: old total + 24).
  - Roles table: add "algorithms" after "live coding" in Senior, Staff, Lead and both full-stack rows.
  - Rounds list: insert "4. Algorithms (Codility-style tasks with hidden correctness and performance tests, and a 90-minute timed test)" after Live coding, and renumber.
  - "Ways to drill": add a **Algorithms → Timed test** bullet next to the 45-min prompt bullet, describing the draw, the clock, auto-submit, and Run examples vs. hidden tests.
  - "Working a question": add a sentence on graded pads (Run examples, Submit, the report, the grade-based suggested rating).
  - Stack section: mention the grader worker next to the console-only worker.
- `public/manifest.webmanifest`: if its `description` enumerates rounds or counts, add the Algorithms round to match the README.

- [ ] **Step 3: Add the grader to the smoke check**

In `scripts/smoke.mjs`:

After the `workerAsset` lookup:
```js
const graderAsset = readdirSync(join(DIST, 'assets')).find((f) => /^grader-.*\.js$/.test(f));
if (!graderAsset) {
  console.error('No grader-*.js in dist/assets — the hidden-test runner did not build.');
  process.exit(1);
}
```

Next to `WORKER_CODE`:
```js
// Passing cars (algo-004) on the alternating 100,000-car input: the linear pass answers -1
// in milliseconds; the double loop is ~5·10^9 steps and must still be running at the limit.
const FAST_CODE = 'function solution(A: number[]): number { let e = 0, p = 0; for (const v of A) { if (v === 0) e++; else if ((p += e) > 1e9) return -1; } return p; }';
const SLOW_CODE = 'function solution(A: number[]): number { let p = 0; for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) if (A[i] === 0 && A[j] === 1) p++; return p > 1e9 ? -1 : p; }';
```

In the harness, before `await report();`:
```js
// 4. The grader worker: load, one case, answer — and a quadratic solution is still spinning
//    at the 1.5s limit, which is what lets the page call it a timeout.
try {
  const A = Array.from({ length: 100000 }, (_, i) => i % 2);
  const gradeOnce = (code) => new Promise((resolve) => {
    const w = new Worker('${BASE}assets/${graderAsset}', { type: 'module' });
    let t;
    w.onmessage = (e) => {
      if (e.data?.type === 'loaded') {
        t = setTimeout(() => { w.terminate(); resolve('timeout'); }, 1500);
        w.postMessage({ type: 'case', i: 0, args: [A] });
      }
      if (e.data?.type === 'load-error') { w.terminate(); resolve('load-error: ' + e.data.text); }
      if (e.data?.type === 'result') { clearTimeout(t); w.terminate(); resolve(e.data.ok ? e.data.value : 'error: ' + e.data.error); }
    };
    w.postMessage({ type: 'load', code, fn: 'solution', console: false });
  });
  const fast = await gradeOnce(${JSON.stringify(FAST_CODE)});
  results.graderPasses = fast === -1 ? true : 'got ' + JSON.stringify(fast);
  const slow = await gradeOnce(${JSON.stringify(SLOW_CODE)});
  results.graderTimesOut = slow === 'timeout' ? true : 'got ' + JSON.stringify(slow);
} catch (e) { results.graderPasses ??= String(e); results.graderTimesOut ??= String(e); }
```

Update the header comment's list of what the smoke check covers to include the grader worker.

- [ ] **Step 4: Run the smoke check**

Run: `npm run smoke`
Expected: `PASS` for appBoots, frameRun, workerRun, workerTerminates, graderPasses, graderTimesOut. If Zen isn't installed, set `SMOKE_BROWSER` to a Chromium or Firefox binary. If neither is available, say so in the final report instead of claiming it passed.

---

### Task 10: Verify end to end and commit once

- [ ] **Step 1: Full checks**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: all green; the build lists `assets/grader-*.js`.

- [ ] **Step 2: Drive the real app**

Start the dev server with `preview_start` (`.claude/launch.json` exists in the repo). Then:
1. Home → Algorithms round card shows for the Staff role, but not after switching the role to Frontend architect.
2. Algorithms → Practice: the statement is visible.
   - Run examples with the starter shows ✗ example lines.
   - Paste a correct solution, Submit → 100% report.
   - Paste an O(N²) solution, Submit → performance rows show ⏱ timed out after 1500ms.
   - Add a `console.log` inside the solution. Run examples shows the line; Submit doesn't.
3. Timed test tab:
   - Start test → three tasks, three categories, and the countdown ticks.
   - Reload → same tasks.
   - Submit test → three reports, with the model answer in `<details>` and ratings.
   - New test.
4. Check the console for errors with `read_console_messages`, and take a screenshot of the report for the summary.

- [ ] **Step 2b: Run the final review**

Dispatch a fresh reviewer, on the most capable model, over `git diff main...HEAD`, with this plan's Review Focus list as its checklist. Fix what it confirms.

- [ ] **Step 3: One commit**

```bash
git add -A
git commit -m "feat: add a Codility-style Algorithms round with a hidden-test grader and a 90-minute timed test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Push and open a PR only after Namit says so.
