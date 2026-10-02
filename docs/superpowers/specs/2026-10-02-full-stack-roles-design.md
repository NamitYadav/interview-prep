# Full-stack roles: Senior and Staff

**Date:** 2026-10-02
**Status:** approved design, awaiting implementation plan

## Goal

Let the app drill full-stack interview loops at Senior and Staff level, alongside
the four frontend loops. Full-stack loops keep every frontend round and add one
backend round. Backend material assumes Node + TypeScript first, Go second.

## Decisions made during brainstorming

1. **Two levels only.** Senior full-stack and Staff full-stack. Lead and Architect
   stay frontend-only.
2. **Node/TS plus Go.** Answers and runnable code are Node/TS; Go appears where
   Berlin postings expect it, as read-only snippets.
3. **Add on top of the frontend rounds.** Full-stack loops are the frontend Senior
   and Staff loops plus a `backend` round. No existing round is replaced.
4. **No tagging pass.** No question is tagged away from the full-stack roles;
   frontend material is still fair game in a full-stack loop. Each full-stack role
   sees exactly what its frontend counterpart sees, plus `backend`. The 23 existing
   tags all list `'staff'` and none list `'senior'`, so `'fs-staff'` is appended to
   each of them mechanically (section 3); without it Staff full-stack would silently
   lose 23 staff-scope HM and design questions.
5. **A few runnable pads.** Six console-only TS starters in the new round, run in
   the existing Web Worker.

## Non-goals

- Full-stack Lead or Architect loops.
- Running Go (or any non-JS language) in the sandbox.
- A full-stack design-session tab. Full-stack design prompts are ordinary Q&A in
  the `backend` round; the design-session tab stays keyed on `roundId === 'design'`.
- Retitling any existing round, or tagging any existing question away from a role.
- Changes to storage, export format, `forRole`, `lapKey`, the App route guard or
  the Home switcher. All of them already work for any role in the catalogue.

## 1. Roles and rounds

### Types (`src/types.ts`)

```ts
export type RoundId = 'hr' | 'hm' | 'coding' | 'design' | 'case' | 'debrief' | 'hoe' | 'lead' | 'arch' | 'backend';
export type RoleId = 'senior' | 'staff' | 'lead' | 'architect' | 'fs-senior' | 'fs-staff';
```

Nothing else in `types.ts` changes.

### Roles (`src/data/roles.ts`)

`ROLE_IDS` and `roles` gain two entries, appended after `architect` so the
switcher lists frontend roles first. `DEFAULT_ROLE` stays `'staff'`.

| Role id | Title | Rounds, in loop order |
|---|---|---|
| `fs-senior` | Senior full-stack | hr, hm, coding, backend, design, case, debrief |
| `fs-staff` | Staff full-stack | hr, hm, coding, backend, design, case, debrief, hoe |

Blurbs: `fs-senior` "The senior loop plus a backend and data round." `fs-staff`
"The staff loop plus a backend and data round."

### Round catalogue (`src/data/index.ts`)

`ROUND_IDS` and `rounds` gain one entry, appended last:

| id | Title | targetSeconds | Blurb |
|---|---|---|---|
| `backend` | Backend & data | 180 | APIs, Postgres, caching, queues, auth, Node and Go runtimes, and backend live coding. |

`questions` gains `...backend` from a new `src/data/backend.ts` (export name
`backend`). `STORY_CATEGORIES` is unchanged; no backend category calls for a story.

## 2. Backend & data content (`src/data/backend.ts`)

At least 36 questions, ids `backend-001` onward, same shape and rules as the rest
of the bank: three-bullet spoken answer inside the round's word budget (130 wpm x
180 s), key points, follow-ups, `deeper` for probe material, `[bracket slots]` for
the candidate's own stories, no nested brackets, no employer facts, no personal
specifics.

| Category | ~Count | Covers |
|---|---|---|
| API design | 5 | REST vs GraphQL, versioning, cursor vs offset pagination, idempotency keys, error contracts |
| Data & Postgres | 6 | Modelling, indexes and EXPLAIN, transactions and isolation levels, zero-downtime migrations, N+1 at the query layer |
| Caching & performance | 4 | Redis patterns, cache invalidation, HTTP caching headers, hot keys |
| Async & messaging | 4 | Queues, outbox pattern, retries and dead letters, at-least-once and dedupe |
| Auth & security | 4 | Sessions vs JWT, OAuth/OIDC flows, CSRF/SSRF/injection server-side, secrets handling |
| Node & Go runtime | 5 | Event loop and blocking, streams and backpressure, goroutines and channels, `context` cancellation, error handling idioms |
| Full-stack design | 4 | BFF, typed API contracts shared with the client, SSR data fetching, an end-to-end feature walkthrough |
| Backend live coding | 6 | The runnable pads below |

Go appears only in a question's read-only `code` field (no `scratch`), in the
Node & Go runtime category.

### Runnable pads

Six `Backend live coding` questions with `scratch: true`, starter `code`, no
`preview` and no `needsDom`, so they run console-only in the existing Web Worker.
Starters are plain TS with a small `console.log` self-check at the bottom, and use
no `node:` imports or DOM APIs.

1. Token-bucket rate limiter
2. Cursor pagination over an in-memory table
3. Batched writer (flush on size or interval)
4. Idempotency-key store for a payment endpoint
5. DataLoader-style batcher (one backend call per tick)
6. Circuit breaker around an async call

(LRU-with-TTL and retry-with-backoff were the first draft; they became the batcher and
the circuit breaker before shipping.)

No sandbox or worker code changes.

## 3. Wiring

### MockSession (`src/components/MockSession.tsx`)

Preset compositions gain a `backend` slice; `buildSet` already skips rounds outside
the active loop, so frontend roles are unaffected.

- Full loop: add `backend: 4`.
- Technical rounds: add `backend: 6`.

### Lap cap (`src/lib/lap.ts`)

`MAX_LAPS` goes from 64 to 80. FS Staff has 8 rounds; its possible lap sets
(one per round plus one per category, plus the Weak drill and two mock presets)
come to about 65 with the new round's 8 categories, over the current cap. The
existing lap-cap test in `data.test.ts` recomputes this per role and stays the
guard.

### Existing role tags (`src/data/hm.ts`, `src/data/design.ts`)

Every `roles` array that contains `'staff'` gains `'fs-staff'` right after it:
`['staff', 'architect']` becomes `['staff', 'fs-staff', 'architect']` (19), and
`['staff', 'lead', 'architect']` becomes `['staff', 'fs-staff', 'lead', 'architect']`
(4). No tag lists `'senior'`, so none gains `'fs-senior'`.

### Unchanged

`forRole`, `useRole` (decodes against `ROLE_IDS`, so the new ids validate with no
edit), `lapKey`, the App round guard, `useHashRoute`, Home switcher, design-session
guard, drafts (27 scratch questions against a 200 cap), notes, stories, progress,
export.

## 4. Copy and tests

### Copy

- README intro: "frontend and full-stack engineer loops", role list gains Senior
  and Staff full-stack, round count and question count updated (count checked by
  `static.test.ts`).
- README role table: two new rows. Rounds list: Backend & data, marked
  "full-stack only", with its categories.
- `index.html` meta description: "frontend and full-stack interview loops", and
  "backend and data" in the round list.

### Tests

| File | Asserts |
|---|---|
| `data.test.ts` | `ID_RE` accepts `backend`. Floor `backend: 36`. Word budget, placeholder, scratch-has-code and lap-cap tests cover the new round with no edit. |
| `roles.test.ts` | Both FS roles' rounds contain `coding` and `backend`; no frontend role contains `backend`; `forRole('fs-staff').byRound('backend')` is non-empty. `forRole('fs-staff')` minus `backend` questions has exactly `forRole('staff')`'s ids, and the same for `fs-senior` against `senior`. The "hoe in every loop except senior" test exempts `fs-senior` too. |
| `MockSession.test.tsx` | FS Senior's Full loop contains `backend` questions; frontend Senior's Full loop contains none. |
| `Home.test.tsx` | Switching to Senior full-stack shows a Backend & data card. |

## Implementation sequence

Each step ships green on its own; `staff` stays the default, so nothing visible
changes until step 3.

1. Types, `backend` round entry, empty `backend.ts`, `ID_RE`, `MAX_LAPS` to 80.
2. `backend.ts` content (36+ questions, six pads) and the floor.
3. Two roles in `roles.ts`, `'fs-staff'` on the existing tags, MockSession slices,
   role and mock tests.
4. Copy: README and `index.html`.
