# Algorithms round — Codility-style tasks with a hidden-test grader

Date: 2026-10-05 · Status: design approved in chat, awaiting spec review

## Why
Upcoming loops include Codility-style async tests (timed, auto-graded on hidden
correctness and performance tests, no interviewer) and live algorithmic pairing, on top
of the frontend live coding the app already covers. Today's scratch pads only print to a
console; nothing checks the code. The missing piece is a grader and a timed test that
mimics a real Codility sitting.

**Success:** about two tasks a day by pattern; after each Submit you see exactly which edge
case or scale case failed; weak tasks come back through the existing queue; a 3-task,
90-minute timed test rehearses pacing.

## Decisions (from brainstorming)
- Lives in this app, TypeScript/JavaScript only.
- New round `algo`, "Algorithms", in every loop that has Live coding (Senior, Staff,
  Lead, Senior full-stack, Staff full-stack), placed right after `coding`. Architect
  stays out.
- Feedback mirrors Codility: Run executes example cases only; Submit runs everything and
  reveals hidden case names, inputs, expected vs got.
- Timed test mode: 3 tasks, one 90-minute countdown, auto-submit at zero.
- Initial bank: 24 tasks, 3 per category across 8 categories.
- Approach A: tests are typed data, expected values come from a reference solution, a
  dedicated grader worker runs one case at a time with a per-case timeout.

## Data model (`src/types.ts`)
`Question` gains two optional fields, used only by `algo` questions:

```ts
export type CaseKind = 'example' | 'correctness' | 'performance';
export type AlgoCase = { name: string; kind: CaseKind; limitMs?: number } & (
  | { args: unknown[]; expected?: unknown }
  | { gen: (rng: () => number) => unknown[] }
);
export interface Grader {
  fn: string;                                 // function the pad must define, e.g. 'solution'
  reference: (...args: any[]) => unknown;
  cases: AlgoCase[];
}
// on Question:
statement?: string;   // full task text: task, examples, constraints (N range)
grader?: Grader;
```

- `question` stays a short heading; `statement` renders under it, `whitespace-pre-wrap`.
- `expected` absent → computed by `reference(...args)` at grade time. Generated cases
  never carry `expected`.
- `gen` receives a seeded RNG (mulberry32, seed derived from question id + case index), so
  the same case always produces the same input.

## Grader
### Pure logic — `src/lib/grade.ts`
- `buildCases(grader, questionId, kinds)` → `{ name, kind, limitMs, args, expected }[]`,
  running `gen` and `reference` on the main thread. Reference cost at N=100k is
  milliseconds.
- `same(a, b)` → `JSON.stringify(a) === JSON.stringify(b)`. Enough for algorithm outputs
  (numbers, strings, arrays, booleans).
- `preview(args)` → JSON truncated to ~120 chars (`[3,1,4,… 99,997 more]`).
- `score(results)` → `{ correctness, performance, total }` as percentages. Correctness =
  example + correctness cases; total = all cases.
- `DEFAULT_LIMIT_MS = 1500`. Ceiling: a slow machine could time out an O(n log n)
  solution; the per-case `limitMs` and this constant are the calibration knobs.
  O(n log n) at N=100k is ~20ms and O(n²) is ~10¹⁰ ops, so the gap is wide.
- `gradeRun(code, fn, cases, { onResult, spawn })`: the runner. It spawns the grader
  worker, posts the code once, then posts one case at a time and starts a timer per
  case. On timeout it terminates the worker, records `timeout`, respawns, and continues
  with the next case. It returns a cancel function (used on unmount / Stop).
  `spawn` is injectable so tests pass a fake Worker.

### Worker — `src/sandbox/grader.ts`
Protocol (added to `src/sandbox/protocol.ts`):

```ts
type ToGrader = { type: 'load'; code: string; fn: string; console: boolean } | { type: 'case'; i: number; args: unknown[] };
type FromGrader =
  | { type: 'loaded' } | { type: 'load-error'; text: string }
  | { type: 'result'; i: number; ok: true; value: unknown; ms: number }
  | { type: 'result'; i: number; ok: false; error: string; ms: number }
  | { type: 'log'; level: LogLevel; text: string };
```

- `load` compiles with the existing `compile()` and evaluates it so the named function
  sits on `globalThis`. A missing `fn` → `load-error`.
- `case` calls `fn(...args)` (args arrive as a structured-clone copy, so user mutation
  can't corrupt expected), times it with `performance.now()`, and posts the result. An
  unclonable return value is reported as an error.
- `console: true` (Run examples) forwards console output via `forwardConsole`;
  `console: false` (Submit) silences it, so a logging loop over 100k items can't flood
  the panel.
- Same-origin worker script, precached by the existing service-worker plugin, so grading
  works offline.

### Result per case
`{ name, kind, status: 'pass' | 'fail' | 'error' | 'timeout', ms?, input, expected, got?, error? }`

## UI
### Round
`{ id: 'algo', title: 'Algorithms', blurb: 'Codility-style tasks: hidden correctness and performance tests, timed.', targetSeconds: 1800 }`.
Strict mode behaves as on every other round.

### Practice / Browse — `QuestionCard` + `ScratchPad`
When `question.grader` is set:
- `statement` shows under the heading, before the pad.
- Run becomes **Run examples**: example cases plus console output, one pass/fail line
  each.
- **Submit** runs every case and renders a report (`GradeReport` component inside
  ScratchPad.tsx): correctness / performance / total, then one row per case, with
  failing rows showing input preview, expected, got / error / TIMEOUT, ms. Repeat
  Submits are allowed in practice.
- Reveal is unchanged: the model answer is the talk-track (brute force → optimal →
  complexity → edge cases), plus key points and follow-ups for live-pairing prep.
- After a Submit, the suggested rating comes from the grader total with the existing
  rule (all → Solid, under half → Weak, else OK) instead of from key-point hits.
- Stop cancels a running grade.

### Timed test tab — `src/components/TimedTest.tsx`
A third tab on the algo round ('Timed test'), modelled on `DesignSession`:
- **Start test** draws 3 tasks, weakest first via `nextQuestion`, from 3 distinct
  categories, and starts a single 90-minute countdown.
- A Task 1/2/3 switcher sits above the statement and pad. Run examples is available;
  Submit is not.
- **Submit test**, or the clock reaching zero, grades all three tasks in sequence.
- The results show the score and report per task, a *Show model answer* toggle, and
  `RatingRadios` per task. **New test** resets.
- The session `{ questionIds, startedAt }` is saved per device via `keyedStore`, as the
  design session is; a reload resumes it. Sessions older than 2× 90 minutes are
  dropped.
- Test drafts use `draftKey(id, 'test')`, separate from the practice pad, are cleared on
  New test, and start from the blank starter. They are working state, outside the
  backup, like the other drafts.

### Elsewhere
- `MockSession` presets: Technical `algo: 2`, Full loop `algo: 1`.
- Weak drill, Search, Print, export/import: no changes; ratings use the existing progress
  store.

## Content — `src/data/algo.ts`
24 tasks, ids `algo-001…024`, 3 per category (easy, medium, hard):

| Category | Example tasks |
|---|---|
| Arrays & hashing | smallest missing positive, odd occurrence, permutation check |
| Prefix sums | passing cars, min average slice, range counts |
| Two pointers & sliding window | longest substring without repeats, pair sum in sorted array, min window |
| Sorting | distinct values, max product of three, disc intersections |
| Stacks & queues | balanced brackets, fish, stone wall |
| Binary search | first bad version, min max-block split, nailing planks |
| Greedy | max profit, tie ropes, non-overlapping segments |
| Dynamic programming | number solitaire, min coins, max slice sum |

- Original statements in the Codility style; Codility's text is not copied.
- Each task has a TS starter `function solution(...)`, a reference, 2–3 examples, 5–8
  correctness edge cases (empty, single, extremes, duplicates, negatives, overflow-prone
  values) and 2–4 performance cases at the stated max N.
- `answer` stays within the live-coding round's 180s spoken budget (the 1800s target
  is coding time, not talking time).

## Testing
- `data.test.ts`:
  - The id regex includes `algo`, with a minimum count of 24.
  - Every algo question has `scratch`, `statement`, `grader`, and a starter defining
    `grader.fn`.
  - Every task has ≥1 example and ≥1 performance case.
  - The reference matches every explicit `expected`.
  - `gen` is deterministic for a fixed seed.
  - The word budget for `algo` answers uses 180s.
- `roles.test.ts`: `algo` comes right after `coding` in the five loops, and Architect
  doesn't have it.
- `grade.test.ts`: `same`, `preview`, `score`, `buildCases`; `gradeRun` with a fake
  Worker covering pass, fail, error, and timeout → terminate → respawn → next case,
  plus cancel.
- Component tests: Submit renders the report (fake runner); the Timed test tab covers
  draw (3 distinct categories), resume after reload, and auto-submit at zero (fake
  timers).
- `scripts/smoke.mjs`: a naive O(n²) submission times out on a performance case in a
  real browser; the reference scores 100%.

## Out of scope
- Python or other languages.
- Codility's per-group test scoring (a group passes only if all its cases pass).
- Score history per task: the rating is the record.
- Hiding the tests from the bundle: they're hidden in the UI, not secret, which is fine
  for a single-user app.
