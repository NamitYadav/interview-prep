# Review, fifth pass: drilling mechanics and the runner's ceilings

**Date:** 2026-09-21
**Scope:** The whole app as of `08c413f` (main), after the code runner (PR 54) and its
hardening (PR 55). Lint, 427 tests and the build were green going in; hygiene (gitignore,
Dependabot, CI on pull requests, no committed artifacts) was right. Four earlier reviews
took the layout, copy and a11y findings, so this pass looked at what the drill actually
does over weeks of use and at the two ceilings the code-runner spec left open.
**Deliverable:** Report, then all six items in one PR. **Status:** all six landed.

## Findings and decisions

### 1. Unseen questions always arrived in file order (P2)

`orderQueue` sorts by bucket, then `lastSeen`. Every unrated question has `lastSeen` 0
and `Array.prototype.sort` is stable, so the first lap of every round walked the bank in
file order: hiring manager opened on Architecture every time and never interleaved
categories. Worse for retention, and unlike a real round.

*Decision:* a random draw per question per call, used as the third sort key. No seed in
the lap: `history` already fixes what has been served, and `seen` excludes it, so
re-drawing on every call changes nothing the user can see. Weak-first and the stale-rating
tiebreak are untouched. `orderQueue` / `nextQuestion` take an optional `random` so tests
pass `() => 0` and get the old data order back; the component suites that name specific
questions pin `Math.random` the same way. The 45-minute design prompt is picked through
the same function, so it is now random too.

### 2. The mock recap was counts only (P3)

"3 weak" without which three. *Decision:* the recap lists the questions rated Weak this
session, grouped by round in the role's round order, and folds the never-rated ones under
a `<details>` with a count (after an early Finish that is most of the set). Same
`baseline` comparison the counts use, so the two cannot disagree.

### 3. No sense of progress over time (P3)

`ProgressEntry` holds only the latest rating. *Decision:* the cheap version, no schema
change. `lastSeen` is the latest rating's time, so "questions rated today" and "in the
last 7 days" are one filter each over the role's questions; a question rated twice today
counts once, which is what "drilled" means. One line under the Home title, hidden while
there is no progress at all. A rating history (Persisted v3) stays out until a trend
view is actually wanted.

### 4. A past loop date showed "-3 days left" (P3)

And "1 days left", and the cards stayed sorted by an urgency that no longer meant
anything. *Decision:* `Loop date has passed` / `Loop day is today` / `N day(s) left`;
past the date the cards return to round order with their Round N labels, and the
per-card caption drops the day count (`today` on the day itself). `plural` moves out of
`ProgressBar` so Home and the caption pluralise the same way.

### 5. Console-only starters run in a Web Worker

The code-runner spec named this upgrade path and deferred it "until the freeze bites".
It fixes two ceilings at once: `terminate()` ends a `while (true)` in Firefox and Safari,
where the opaque-origin frame shares the tab's process; and a worker is a same-origin
script the service worker precaches, so Run works offline.

*Decision:* `src/sandbox/worker.ts` — same `compile`, same console shim, same message
shape as the frame, minus the React root. React's exports are still exposed as globals so
a hook starter compiles. The pad picks the runner per question:

| Starter | Runner |
|---|---|
| has `preview` | frame |
| `needsDom: true` (lowest common ancestor, getElementsByClassName, IntersectionObserver hook) | frame |
| everything else with `scratch: true` | worker |

The frame path is unchanged and keeps its ceiling; the `ponytail:` comment in
`ScratchPad` now says so and names the reason there is no cheap upgrade (a preview needs
a DOM). jsdom has no `Worker`, so the existing suite still exercises the frame; the new
tests install a stand-in. `data.test.ts` asserts `needsDom` only appears on console-only
pads. The worker chunk is self-contained (Vite's default iife worker format), so Sucrase
ships twice on disk — once per runner — and is still never downloaded by the app.

### 6. Zero real-browser coverage

All 427 tests ran in jsdom, and the riskiest surfaces (opaque frame, CORS on module
scripts, worker termination, the built app booting) are exactly what jsdom cannot touch;
PR 55's fixes were that class of bug. *Decision:* `scripts/smoke.mjs`, run by
`npm run smoke`. A Node server serves `dist/` the way GitHub Pages does (every asset with
`Access-Control-Allow-Origin: *`) plus a same-origin harness page; headless Zen opens
it; the harness boots the app in a frame, runs TS + JSX through the sandbox frame and the
worker, spins a worker on `while (true)` and terminates it, then POSTs the results back.
Local-only — CI has no browser — and `SMOKE_BROWSER` overrides the binary. No new
dependency.

## Left alone, on purpose

Code-splitting the question bank, a CSP meta tag, spaced repetition, any sync beyond
export/import — each is a documented decision in the README. A rating history and an
LLM-graded self-check were raised and parked: the first until a trend view is wanted,
the second because it breaks "nothing leaves the browser".

## Tests

- `queue.test.ts`: existing order tests pass `() => 0`; a constant draw preserves data
  order; a varying draw reorders within a bucket and never across one; a real draw keeps
  every question exactly once.
- `Practice`, `RoundView`, `WeakDrill`, `App`, `DesignSession` suites pin `Math.random`.
- `Home.test.tsx`: past date label and un-sort; today / one-day copy; rated-today and
  7-day counts from `lastSeen`; the line hidden with no progress.
- `MockSession.test.tsx`: weak list by round, unrated folded with a count; no weak list
  when nothing was weak.
- `ScratchPad.test.tsx`: a stand-in `Worker` — no frame for a console-only pad, run posts
  the draft, output and done, re-run and Stop and unmount terminate, a load failure is
  reported once, `preview` and `needsDom` keep the frame.
- `data.test.ts`: `needsDom` only on console-only scratch starters.
- `npm run smoke`: app boots, frame run, worker run, worker terminates — all four passed
  in headless Zen against the build.
