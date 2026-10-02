# Full-stack Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Senior full-stack and Staff full-stack loops: the frontend Senior/Staff loops plus a new `backend` ("Backend & data") round with 38 questions, six of them runnable TS pads.

**Architecture:** The role catalogue (`src/data/roles.ts`) already drives everything role-scoped through `forRole()`. This plan adds one round to the catalogue, one data file, two role entries, `'fs-staff'` on the existing staff-scope tags, and a `backend` slice in the two mock presets. No component, hook, storage or sandbox logic changes.

**Tech Stack:** Vite 8, React 19, TypeScript, Vitest + Testing Library, Sucrase (sandbox compile).

**Spec:** `docs/superpowers/specs/2026-10-02-full-stack-roles-design.md`

## Global Constraints

- New role ids: `fs-senior` (title "Senior full-stack"), `fs-staff` (title "Staff full-stack"), appended after `architect`. `DEFAULT_ROLE` stays `'staff'`.
- New round id: `backend`, title "Backend & data", `targetSeconds: 180`, appended last in `ROUND_IDS` and `rounds`.
- Loops: `fs-senior` = hr, hm, coding, backend, design, case, debrief. `fs-staff` = the same plus hoe.
- Word budget per `backend` answer: `Math.round(180 / 60 * 130)` = **390 words** across `answer`. `deeper` is uncounted.
- Ids `backend-001` onward, regex `^(hr|hm|coding|design|case|debrief|hoe|lead|arch|backend)-\d{3}$`.
- Stack: answers and runnable code are Node + TypeScript; Go only in read-only `code` (no `scratch`) in the "Node & Go runtime" category.
- Runnable pads: `scratch: true`, starter `code`, no `preview`, no `needsDom`, no `node:` imports, no `require(`, no `document`/`window`. They run console-only in the existing Web Worker.
- Content rules: three-ish bullet spoken `answer`, `keyPoints`, `followUps`, `deeper` for probe material, `[bracket slots]` for the candidate's own stories, never nested brackets, no employer facts, no personal specifics.
- `MAX_LAPS` goes from 64 to 80.
- `STORY_CATEGORIES` unchanged.
- One commit at the end of the plan (user rule: never commit per step). Work on branch `feat/full-stack-roles`.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Staff full-stack must not lose the 23 staff-scope tagged questions.** Expected: `fs-staff` sees every question `staff` sees, plus `backend`. Pinned by the parity test in Task 3 Step 1.
2. **A `#backend` hash while a frontend role is active** (bookmark, shared link, role switched away). Expected: Home renders, same as `#hoe` under Senior. Pinned by the App test in Task 3 Step 1.
3. **A backend pad that throws on Run, or reaches for `node:`/`require`/the DOM**, which the Web Worker can't provide. Expected: every pad compiles with the sandbox's own `compile()` and runs to completion. Pinned by the pad-safety test in Task 2 Step 1.
4. **A stored `fs-staff` role surviving a reload.** Expected: decodes back to `fs-staff`, not the `staff` fallback. Pinned by the useRole test in Task 3 Step 1.
5. **Full-stack mock Full loop ordering.** Expected: backend questions after live coding and before system design, following the role's own round order. Pinned by the MockSession test in Task 3 Step 1.

---

### Task 0: Branch

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/full-stack-roles
```

---

### Task 1: `backend` round in the catalogue, lap cap

**Files:**
- Modify: `src/types.ts:1` (RoundId union)
- Create: `src/data/backend.ts` (empty array; content in Task 2)
- Modify: `src/data/index.ts` (imports, `ROUND_IDS`, `rounds`, `questions`)
- Modify: `src/lib/lap.ts:21-25` (`MAX_LAPS` and its comment)
- Test: `src/__tests__/data.test.ts` (`ID_RE`, floor table, one new assertion)

**Interfaces:**
- Produces: `RoundId` includes `'backend'`; `export const backend: Question[]` from `src/data/backend.ts`; a `rounds` entry `{ id: 'backend', title: 'Backend & data', ... targetSeconds: 180 }`; `MAX_LAPS = 80`.

- [ ] **Step 1: Write the failing test**

In `src/__tests__/data.test.ts`, change line 8:

```ts
const ID_RE = /^(hr|hm|coding|design|case|debrief|hoe|lead|arch|backend)-\d{3}$/;
```

Change the floor line inside `every round keeps at least its post-round-4 question count` (Task 2 raises `backend` to 36):

```ts
    const min: Record<RoundId, number> = { hr: 36, hm: 99, coding: 35, design: 30, case: 30, debrief: 32, hoe: 33, lead: 30, arch: 30, backend: 0 };
```

Add this test directly after `rounds cover every RoundId once`:

```ts
  test('the backend round is catalogued with the live-coding target', () => {
    const backend = rounds.find((r) => r.id === 'backend');
    expect(backend?.title).toBe('Backend & data');
    expect(backend?.targetSeconds).toBe(180);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: FAIL. `tsc`-level: `backend` is not a `RoundId` key in the floor record (vitest still runs); runtime: "the backend round is catalogued" fails with `expected undefined to be 'Backend & data'`.

- [ ] **Step 3: Implement**

`src/types.ts` line 1:

```ts
export type RoundId = 'hr' | 'hm' | 'coding' | 'design' | 'case' | 'debrief' | 'hoe' | 'lead' | 'arch' | 'backend';
```

Create `src/data/backend.ts`:

```ts
import type { Question } from '../types';

export const backend: Question[] = [];
```

`src/data/index.ts`: add `import { backend } from './backend';` after the `arch` import, then:

```ts
export const ROUND_IDS = ['hr', 'hm', 'coding', 'design', 'case', 'debrief', 'hoe', 'lead', 'arch', 'backend'] as const satisfies readonly RoundId[];
```

Append to `rounds`, after the `arch` entry:

```ts
  { id: 'backend', title: 'Backend & data', blurb: 'APIs, Postgres, caching, queues, auth, Node and Go runtimes, and backend live coding.', targetSeconds: 180 },
```

```ts
export const questions: Question[] = [...hr, ...hm, ...coding, ...design, ...caseStudy, ...debrief, ...hoe, ...lead, ...arch, ...backend];
```

`src/lib/lap.ts`, replace the comment and constant above `export interface SavedLap`:

```ts
// One lap per possible question set — every round's Practice tab and every category
// chip, the Weak drill and the mock presets — for the largest role (Staff full-stack,
// about 65), with headroom. Oldest-saved is evicted past that; data.test.ts asserts
// the cap stays above the count, since a lap carries the pending weak requeues and
// eviction is silent.
export const MAX_LAPS = 80;
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/__tests__/data.test.ts && npm run typecheck`
Expected: PASS. If `typecheck` reports a non-exhaustive `Record<RoundId, …>` or `switch` elsewhere, add the `backend` key there with the same value its nearest sibling (`coding`) uses, and note the file in the PR description.

---

### Task 2: Backend & data content

**Files:**
- Modify: `src/data/backend.ts`
- Test: `src/__tests__/data.test.ts` (floor to 36, pad-safety test)

**Interfaces:**
- Consumes: `Question` from `../types`; `compile(code, preview?)` from `../sandbox/compile` (returns JS that expects `React` and `__render` parameters).
- Produces: `backend: Question[]`, 38 entries, ids `backend-001`…`backend-038`.

- [ ] **Step 1: Write the failing tests**

In `src/__tests__/data.test.ts`, raise the floor: `backend: 36`.

Add imports at the top of the file:

```ts
import * as React from 'react';
import { vi } from 'vitest';
import { compile } from '../sandbox/compile';
```

(Merge `vi` into the existing `vitest` import line instead of a second import.)

Add at the end of the `question bank` describe block:

```ts
  // Backend pads are console-only, so they run in the Web Worker: no DOM, no Node
  // built-ins. jsdom would happily provide `document` here, so the source check is what
  // catches a pad that would only fail in the real worker.
  test('every backend pad is worker-safe and runs its starter to completion', () => {
    const pads = questions.filter((q) => q.round === 'backend' && q.scratch);
    expect(pads.length).toBe(6);
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      for (const q of pads) {
        expect(q.preview, q.id).toBeUndefined();
        expect(q.needsDom, q.id).toBeUndefined();
        expect(q.code, q.id).not.toMatch(/\bnode:|\brequire\(|\bdocument\.|\bwindow\.|^\s*import\s/m);
        const run = new Function('React', '__render', compile(q.code!));
        expect(() => run(React, () => {}), q.id).not.toThrow();
      }
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
      vi.useRealTimers();
    }
  });

  test('Go appears only as read-only code', () => {
    for (const q of questions.filter((x) => x.round === 'backend' && x.code && /^\s*(package|func) /m.test(x.code))) {
      expect(q.scratch, `${q.id} is Go and cannot run`).toBeUndefined();
    }
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: FAIL. The floor reports `backend: expected 0 to be greater than or equal to 36`; the pad test reports `expected 0 to be 6`.

- [ ] **Step 3: Write the two worked examples to lock the pattern**

Replace `src/data/backend.ts` with:

```ts
import type { Question } from '../types';

export const backend: Question[] = [
  // API design (5)
  {
    id: 'backend-001',
    round: 'backend',
    category: 'API design',
    question: 'A client retries POST /payments after a timeout. How do you make sure the customer is charged once?',
    answer: [
      'Name the failure first: a timeout tells the client nothing about whether the server committed, so a retry is the correct client behaviour and the server has to make it safe. That is an idempotency problem, not a networking one.',
      'The client sends an Idempotency-Key header, a UUID generated once per logical payment. The server stores the key with a hash of the request body and the eventual response, inside the same transaction that creates the payment, with a unique constraint on the key. A repeat with the same key and body returns the stored response; the same key with a different body is a 422, because that is a client bug, not a retry.',
      'Cover the concurrent case out loud: two identical requests arriving together both miss the lookup, and the unique constraint is what makes one of them lose. The loser either waits and replays the winner\'s stored response or gets a 409 to retry. Keys expire after a window, say 24 hours, that is longer than any client\'s retry policy.',
    ],
    keyPoints: [
      'Treats a timeout as an unknown outcome, so retries must be safe server-side',
      'Client-generated idempotency key, one per logical operation',
      'Key, request hash and response stored in the same transaction as the side effect',
      'A database unique constraint, not a read-then-write check, settles concurrent duplicates',
      'Same key with a different body is rejected, not replayed',
    ],
    followUps: ['What changes when the side effect is a call to an external payment provider rather than your own database?', 'How long do you keep keys, and what decides it?'],
    deeper: [
      'With an external provider you cannot share a transaction, so record the key as "in progress" first, pass your key through to the provider (most accept one), and reconcile stuck "in progress" rows with a job that asks the provider for the outcome.',
    ],
  },
  // ... 4 more API design questions, then the categories below.

  // Backend live coding (6)
  {
    id: 'backend-033',
    round: 'backend',
    category: 'Backend live coding',
    scratch: true,
    question: 'Implement a per-key token-bucket rate limiter: each key gets `capacity` tokens, refilled at `refillPerSec`. take(key) spends a token and returns true, or returns false when the bucket is empty. Talk me through it as you go.',
    code: `// \`now\` is injectable so the checks below run without waiting on a real clock.
class RateLimiter {
  constructor(private capacity: number, private refillPerSec: number, private now: () => number = Date.now) {}

  take(key: string): boolean {
    // TODO: keep a { tokens, last } bucket per key
    // TODO: refill by elapsed time since \`last\`, capped at capacity, then spend one token
    return true;
  }
}

let t = 0;
const limiter = new RateLimiter(2, 1, () => t);
console.log(limiter.take('a'), limiter.take('a'), limiter.take('a')); // expect: true true false
t = 1000;
console.log(limiter.take('a')); // expect: true (one token back after a second)
console.log(limiter.take('b')); // expect: true (keys have separate buckets)`,
    answer: [
      'State the model before typing: a bucket per key holding a fractional token count and the time it was last touched. There is no timer; refill is computed lazily on each call from the elapsed time, which is what keeps it O(1) per request and free when idle.',
      'On take: look up or create the bucket full, add elapsed seconds times refillPerSec, cap at capacity, set last to now. If tokens is at least one, subtract one and return true; otherwise return false. Mention the cap explicitly, because without it an idle key banks unlimited burst.',
      'Then name what changes in production: the Map grows with every key ever seen, so evict idle buckets, and across several server instances the state has to live in Redis, updated atomically in a Lua script or with a single INCR-style operation, or each instance enforces its own limit.',
    ],
    keyPoints: [
      'Lazy refill from elapsed time, no background timer',
      'Caps tokens at capacity so idle keys cannot bank unlimited burst',
      'O(1) time per call and O(keys) memory, with eviction for idle keys',
      'Moves state to Redis with an atomic update once there is more than one instance',
    ],
    followUps: ['How would you return a Retry-After header from this?', 'Token bucket or sliding window: when would you pick each?'],
  },
  // ... 5 more Backend live coding pads.
];
```

- [ ] **Step 4: Complete the file to 38 questions**

Write every remaining question in the same shape as the two examples. Number ids in file order, with categories in this order. Each category's comment states its count, like `// API design (5)`. Question topics are fixed below; wording, answers, key points and follow-ups are yours. Spoken `answer` stays within 390 words. Put anything an interviewer only reaches by digging in `deeper`. Use `[bracket slots]` wherever the candidate's own experience belongs. Read `src/data/coding.ts` and `src/data/lead.ts` for tone; do not copy their content.

| Ids | Category | Question topics, one per question |
|---|---|---|
| 001–005 | API design | (001 done above) · REST vs GraphQL for a product with web and mobile clients · versioning a public API without breaking clients · cursor vs offset pagination for a feed that changes while you page · a consistent error contract (status codes, error body, what the client can act on) |
| 006–011 | Data & Postgres | modelling orders, line items and refunds · reading an EXPLAIN plan and choosing an index (composite order, partial index) · isolation levels and the anomaly each one allows, with a double-booking example · a zero-downtime column rename / NOT NULL migration (expand, backfill, contract) · N+1 at the query layer and how an ORM hides it · when to reach for JSONB and when it is a mistake |
| 012–015 | Caching & performance | cache-aside vs write-through with Redis, and the stale-read window each leaves · invalidation strategies and the thundering herd on expiry · HTTP caching headers for an API (Cache-Control, ETag, Vary) · a hot key taking down one Redis shard |
| 016–019 | Async & messaging | moving slow work (email, PDF) off the request path to a queue · the transactional outbox, and the bug it fixes · retries, backoff and dead-letter queues, and what makes a message poison · at-least-once delivery and making consumers idempotent |
| 020–023 | Auth & security | server sessions vs JWTs, and revocation · OAuth 2 / OIDC authorization code flow with PKCE for an SPA · SSRF and injection in a Node service (a "fetch this URL" feature, a raw SQL filter) · secrets handling: env vars, a secrets manager, rotation |
| 024–028 | Node & Go runtime | blocking the Node event loop, how to spot it and fix it · Node streams and backpressure for a large CSV export · goroutines and channels, with a short read-only Go `code` snippet of a worker pool to review · Go `context` cancellation propagating through an HTTP handler, with a read-only Go snippet · error handling idioms compared: Go's returned errors vs Node's throw/reject, with a read-only Go snippet |
| 029–032 | Full-stack design | a BFF for a web app: what it owns and what it must not · sharing typed API contracts between client and server (OpenAPI codegen, tRPC, zod), and the trade-offs · SSR data fetching: where the data comes from, caching, and the waterfall to avoid · walk a "save draft" feature end to end: UI state, API, persistence, conflict on two tabs |
| 033–038 | Backend live coding | (033 done above) · LRU cache with TTL · retry with exponential backoff and jitter · cursor pagination over an in-memory table · batched writer that flushes on size or interval · idempotency-key store for a payment endpoint |

Rules for the five remaining pads (034–038), same as 033:
- `scratch: true`, no `preview`, no `needsDom`.
- Plain TS starter with the core function or class stubbed with `// TODO:` lines and a trivially-returning body, so it runs without throwing.
- A short self-check at the bottom: `console.log(...)` calls with `// expect: ...` comments.
- Anything time-based takes an injectable `now` or `sleep`, so the checks never depend on a real clock. The pad test runs under fake timers.
- No `import`, `require`, `node:`, `document.` or `window.`.
- Key points name the time and space complexity with `O(`, the habit the data-structures questions train.

Go snippets (026–028): `code` only, never `scratch`; they start with `func` or `package`, which the "Go appears only as read-only code" test relies on.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/__tests__/data.test.ts`
Expected: PASS. That covers id format, uniqueness, prefix, non-empty fields, the 390-word budget, the 36 floor, no nested placeholders, scratch-has-code, the pad-safety and Go tests, the draft cap (27 scratch against 200) and the lap cap. If a question trips the word budget, move material to `deeper`; never loosen a test.

- [ ] **Step 6: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

---

### Task 3: Full-stack roles, tag parity, mock slices

**Files:**
- Modify: `src/types.ts:3` (RoleId union)
- Modify: `src/data/roles.ts`
- Modify: `src/data/hm.ts`, `src/data/design.ts` (23 `roles` tags)
- Modify: `src/components/MockSession.tsx:15-26` (preset compositions)
- Test: `src/data/roles.test.ts`, `src/hooks/useRole.test.ts`, `src/__tests__/MockSession.test.tsx`, `src/__tests__/Home.test.tsx`, `src/__tests__/App.test.tsx`

**Interfaces:**
- Consumes: `forRole(id: RoleId): { role, rounds, questions, byRound(r) }` from `src/data/index.ts`; `ROLE_KEY` and `useRole()` from `src/hooks/useRole.ts`; `Harness({ role })` in `MockSession.test.tsx`; `Harness({ initial })` in `Home.test.tsx`.
- Produces: `RoleId` includes `'fs-senior' | 'fs-staff'`; two `roles` entries; Full loop composition gains `backend: 4`, Technical rounds gains `backend: 6`.

- [ ] **Step 1: Write the failing tests**

`src/data/roles.test.ts`: replace the `hoe appears in every loop except senior` test with:

```ts
  test('hoe appears in every loop except the two senior ones', () => {
    for (const role of roles) {
      if (role.id === 'senior' || role.id === 'fs-senior') expect(role.rounds, role.id).not.toContain('hoe');
      else expect(role.rounds, role.id).toContain('hoe');
    }
  });

  test('only the full-stack loops have a backend round, and they keep live coding', () => {
    for (const role of roles) {
      const fullStack = role.id === 'fs-senior' || role.id === 'fs-staff';
      expect(role.rounds.includes('backend'), role.id).toBe(fullStack);
      if (fullStack) expect(role.rounds, role.id).toContain('coding');
    }
  });
```

Append to the `forRole` describe block:

```ts
  // Full-stack loops are "the frontend loop plus backend". The existing roles tags all
  // list staff, so a missed 'fs-staff' on one of them would silently drop a staff-scope
  // question from Staff full-stack — this compares the two sets id for id.
  test.each([['fs-staff', 'staff'], ['fs-senior', 'senior']] as const)(
    '%s sees exactly what %s sees, plus backend',
    (fs, fe) => {
      const fsIds = forRole(fs).questions.filter((q) => q.round !== 'backend').map((q) => q.id);
      expect(fsIds).toEqual(forRole(fe).questions.map((q) => q.id));
      expect(forRole(fs).byRound('backend').length).toBeGreaterThanOrEqual(36);
    },
  );

  test('full-stack round order puts backend between live coding and system design', () => {
    expect(forRole('fs-staff').rounds.map((r) => r.id)).toEqual(['hr', 'hm', 'coding', 'backend', 'design', 'case', 'debrief', 'hoe']);
  });
```

`src/hooks/useRole.test.ts`, inside the describe block:

```ts
  test('restores a stored full-stack role on mount', () => {
    localStorage.setItem(ROLE_KEY, 'fs-staff');
    const { result } = renderHook(() => useRole());
    expect(result.current[0]).toBe('fs-staff');
  });
```

`src/__tests__/MockSession.test.tsx`, inside `describe('role-scoped mock sessions', ...)`:

```ts
  test("Senior full-stack's Full loop adds a backend slice between live coding and system design", async () => {
    render(<Harness role="fs-senior" />);
    await userEvent.click(screen.getByRole('button', { name: /full loop/i }));
    // hr:4 + hm:6 + coding:4 + backend:4 + design:3 + case:4 + debrief:4 = 29.
    expect(screen.getByText(/29 questions/i)).toBeInTheDocument();

    const bannersSeen: string[] = [];
    for (let i = 0; i < 29; i++) {
      const banner = screen.queryByText(/^Round \d+ of \d+/);
      if (banner?.textContent) bannersSeen.push(banner.textContent);
      const skipBtn = screen.queryByRole('button', { name: /^skip/i });
      if (!skipBtn) break;
      await userEvent.click(skipBtn);
    }

    const coding = bannersSeen.findIndex((t) => /live coding/i.test(t));
    const backend = bannersSeen.findIndex((t) => /backend & data/i.test(t));
    const design = bannersSeen.findIndex((t) => /system design/i.test(t));
    expect(coding).toBeGreaterThanOrEqual(0);
    expect(backend).toBeGreaterThan(coding);
    expect(design).toBeGreaterThan(backend);
  });
```

`src/__tests__/Home.test.tsx`, after `switching roles changes the visible round cards and readiness counts`:

```ts
  test('switching to a full-stack role adds the Backend & data card', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    render(<Harness initial={EMPTY} />);
    expect(screen.queryByText('Backend & data')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'Senior full-stack');
    expect(screen.getByText('Backend & data')).toBeInTheDocument();
    expect(screen.getByText('Live coding')).toBeInTheDocument();
  });
```

`src/__tests__/App.test.tsx`, after the existing `a round hash outside the active role's loop renders Home instead` test:

```ts
test('the backend round hash renders Home under a frontend role', () => {
  localStorage.setItem(ROLE_KEY, 'staff');
  window.location.hash = '#backend';
  render(<App />);
  expect(screen.getByRole('heading', { name: /interview prep/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /backend & data/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/data/roles.test.ts src/hooks/useRole.test.ts src/__tests__/MockSession.test.tsx src/__tests__/Home.test.tsx src/__tests__/App.test.tsx`
Expected: FAIL.
- The roles tests fail on `forRole('fs-staff')` (role not found).
- The useRole test gets `'staff'` back instead of `'fs-staff'`.
- The MockSession test finds no fs-senior role.
- The Home test can't find the "Senior full-stack" option.
- The App backend-hash test should already PASS, since the guard exists. It is a regression pin, not a red test.

- [ ] **Step 3: Implement the roles**

`src/types.ts` line 3:

```ts
export type RoleId = 'senior' | 'staff' | 'lead' | 'architect' | 'fs-senior' | 'fs-staff';
```

`src/data/roles.ts`:

```ts
export const ROLE_IDS = ['senior', 'staff', 'lead', 'architect', 'fs-senior', 'fs-staff'] as const satisfies readonly RoleId[];
```

Append to `roles`, after the `architect` entry:

```ts
  { id: 'fs-senior', title: 'Senior full-stack', blurb: 'The senior loop plus a backend and data round.', rounds: ['hr', 'hm', 'coding', 'backend', 'design', 'case', 'debrief'] },
  { id: 'fs-staff', title: 'Staff full-stack', blurb: 'The staff loop plus a backend and data round.', rounds: ['hr', 'hm', 'coding', 'backend', 'design', 'case', 'debrief', 'hoe'] },
```

- [ ] **Step 4: Add `'fs-staff'` to the existing tags**

```bash
sed -i '' "s/roles: \['staff', 'architect'\]/roles: ['staff', 'fs-staff', 'architect']/; s/roles: \['staff', 'lead', 'architect'\]/roles: ['staff', 'fs-staff', 'lead', 'architect']/" src/data/hm.ts src/data/design.ts
grep -c "fs-staff" src/data/hm.ts src/data/design.ts
```

Expected: the two counts sum to 23. Then confirm no tag was missed:

```bash
grep -n "roles: \[" src/data/hm.ts src/data/design.ts | grep -v "fs-staff"
```

Expected: no output.

- [ ] **Step 5: Add the mock slices**

`src/components/MockSession.tsx`, in `PRESETS`:

```ts
    composition: { hr: 4, hm: 6, coding: 4, design: 3, case: 4, debrief: 4, hoe: 3, lead: 3, arch: 3, backend: 4 },
```

```ts
    composition: { hm: 8, coding: 6, design: 6, arch: 6, backend: 6 },
```

Update the `Preset` doc comment's "four roles'" to "six roles'".

- [ ] **Step 6: Run the full suite, typecheck, lint**

Run: `npm test -- --run && npm run typecheck && npm run lint`
Expected: PASS. In particular, the existing `Senior's Full loop contains no HoE questions` still counts 25, because `backend` is not in Senior's loop.

---

### Task 4: Copy, smoke check, single commit

**Files:**
- Modify: `README.md` (intro, Roles table, Rounds list, Adding questions)
- Modify: `index.html:6` (meta description)
- Test: `src/__tests__/static.test.ts` (existing `README states the real question count`)

- [ ] **Step 1: Run the static test to see it fail**

Run: `npx vitest run src/__tests__/static.test.ts`
Expected: FAIL on `README states the real question count` (README says 355; the bank is now 393).

- [ ] **Step 2: Update the README**

Intro paragraph (lines 3-6):

```md
Interactive mock-interview drill for frontend and full-stack engineer loops in
Berlin / EU — Senior, Staff, Lead or Architect frontend, or Senior and Staff
full-stack. Ten rounds across the six loops, 393 curated questions with model
answers, key points and likely follow-ups. Reveal, rate yourself, and weak
questions come back first.
```

393 is 355 + 38. If Step 1's failure message shows a different `questions.length`, use that number.

Roles table, append two rows:

```md
| Senior full-stack | HR, hiring manager, live coding, backend & data, system design, case study, debrief |
| Staff full-stack | HR, hiring manager, live coding, backend & data, system design, case study, debrief, head of engineering |
```

Rounds list, append:

```md
10. Backend & data (full-stack only) — API design, data & Postgres, caching & performance,
    async & messaging, auth & security, Node & Go runtime, full-stack design, backend live
    coding (runnable TS pads; Go appears as read-only snippets)
```

Adding questions section, after "`npm test` validates shape and uniqueness.", add:

```md
A tag that lists `staff` also lists `fs-staff`, so Staff full-stack keeps seeing
everything Staff does.
```

- [ ] **Step 3: Update `index.html` meta description (line 6)**

```html
    <meta name="description" content="Personal practice tool for frontend and full-stack interview loops: HR screen, hiring manager, live coding, backend and data, frontend system design, case study, debrief, head of engineering, tech lead and architecture deep-dive rounds, across senior, staff, lead and architect scopes." />
```

- [ ] **Step 4: Run everything CI runs, plus the smoke check**

Run: `npm run lint && npm test -- --run && npm run build && npm run smoke`
Expected: all PASS. The smoke check exercises the real browser build, including the worker.

- [ ] **Step 5: Check one backend pad by hand in the dev server**

Start the dev server (preview tool, or `npm run dev`). Switch the Role to "Senior full-stack", open Backend & data, filter to "Backend live coding", open backend-033 and press Run. Expected: the output log shows `true true true`, then `true`, then `true` from the unimplemented starter, with no error line. Implement the TODO in the pad and Run again. Expected: `true true false`, `true`, `true`.

- [ ] **Step 6: Commit once and push**

```bash
git add src/types.ts src/data/backend.ts src/data/index.ts src/data/roles.ts src/data/hm.ts src/data/design.ts src/lib/lap.ts src/components/MockSession.tsx src/__tests__/data.test.ts src/data/roles.test.ts src/hooks/useRole.test.ts src/__tests__/MockSession.test.tsx src/__tests__/Home.test.tsx src/__tests__/App.test.tsx README.md index.html docs/superpowers/specs/2026-10-02-full-stack-roles-design.md docs/superpowers/plans/2026-10-02-full-stack-roles.md
git commit -m "feat: add Senior and Staff full-stack loops with a Backend & data round

Two new roles reuse the frontend Senior/Staff loops and add a backend round:
38 questions on APIs, Postgres, caching, messaging, auth, Node and Go runtimes
and full-stack design, six of them runnable TS pads in the Web Worker. Staff
full-stack inherits every staff-scope tag. MAX_LAPS rises to 80 for the
eight-round loop.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin feat/full-stack-roles
```
