# Review Improvements Design

**Goal:** Act on an independent review of the app (255 questions, 7 rounds) to
better prepare for staff frontend loops in Berlin/EU, fintech-leaning
(Qonto, N26, Trade Republic, Klarna, SumUp) but usable for any target.
Audience is the app's owner only — "From your CV" stays first-class.

**Scope:** three independent subsystems, each shippable on its own:
1. **Content** — new questions, dedupe, one factual fix.
2. **Drilling UX** — queue order, lap completion, stopwatch, back/undo,
   global search, print cheat sheet, scroll-to-top on navigation.
3. **Code fixes** — small correctness/robustness/accessibility fixes found
   during the review.

No schema change: `Question`, `ProgressEntry`, `Persisted` (types.ts) are
unchanged except `Round` gains an optional `targetSeconds`.

## 1. Content

All additions use the existing `Question` shape in `src/data/<round>.ts`.
No in-browser code editor — coding/build questions still just show a
`code` starter block and a written answer; the user writes code in their
own editor.

| Item | Round file | Detail | Count |
|---|---|---|---|
| C1 Build prompts | `coding.ts`, new category `Build prompts` | Spec + constraints (~45 min) as `question`, starter skeleton as `code`, approach walkthrough as `answer`, must-haves as `keyPoints`. Topics: autocomplete with request cancellation, virtualised list, accessible combobox (APG), accessible tabs (APG), debounce vs throttle utility, promise pool / concurrency limiter, event emitter, drag-to-reorder list, `useSyncExternalStore`-based store, LRU cache, retry-with-backoff fetch wrapper, typeahead cache/memoization. | +12 |
| C2 Design prompts | `design.ts`, existing categories | Fintech/marketplace-shaped: live order book / price grid, transaction history with infinite scroll + search, multi-step KYC onboarding with document upload, resumable chunked upload, feature-flag/experimentation platform, live courier tracking map, CMS live preview, collaborative rich-text editor. | +8 |
| C3a Security | `hm.ts`, new category `Frontend security` | XSS sinks & sanitisation, CSP authoring, CSRF & SameSite cookies, token storage (where not to put a JWT), postMessage/iframe isolation, supply-chain risk (lockfiles, postinstall scripts), third-party script governance. | +7 |
| C3b TypeScript | `hm.ts`, new category `TypeScript depth` | Discriminated unions for state, polymorphic component typing, generics & inference limits, `satisfies` vs `as const`, incremental strictness migration on a legacy codebase. | +5 |
| C3c React internals | `hm.ts`, existing category `React & data` | `useSyncExternalStore` use case, hydration mismatch causes/fixes, diagnosing an unnecessary re-render, React Compiler vs manual `memo`/`useMemo`. | +4 |
| C3d Reliability | `hm.ts`, new category `Reliability & incidents` | Frontend SLOs/error budgets, incident command basics, writing outage comms, blameless postmortem structure, being the 3am owner of a frontend alert. | +5 |
| C4 Negotiation | `hr.ts`, existing category `Compensation` | Responding to a lowball, who names a number first, signing bonus to offset a forfeited bonus, brutto vs netto & Steuerklasse, GKV vs PKV above the JAEG threshold, requesting an Arbeitszeugnis. | +6 |
| C4b Fix | `hr.ts` | Correct the EU Pay Transparency Directive question: the national transposition deadline (7 June 2026) has passed — rephrase from "upcoming" to what changed and what to expect from a German employer now. | 0 |
| C5 Dedupe | `hm.ts`, `debrief.ts` | Delete the weaker of each near-duplicate pair, folding any unique key points into the survivor. Cross-round pairs (hm/design) keep the design copy and delete the hm one — these are system-design-shaped prompts that fit the design round: hm-004/design-010, hm-008/design-007, hm-010/design-011. Within-round: hm-009/hm-043 (drop hm-043), hm-018/hm-047 (drop hm-047; case-036 is a third near-match but stays — different round, kept), hm-001/002/049 (keep 2 of the 3, drop the weakest), debrief-007/021 (drop debrief-021). `design-008`/`debrief-018` reviewed and **kept as-is**: one is a build prompt, the other a post-hoc reflection question — different enough in framing to not be a true duplicate. | −6 |
| C6 | `src/__tests__/data.test.ts`, `README.md` | Update exact-count map and round blurbs/totals. | — |

Net counts: hr 29→35, hm 78+21−6=93, coding 27→39, design 18→26 (unaffected
by dedupe — it keeps the survivor), case 37 (unchanged), debrief 35→34
(−1), hoe 31 (unchanged). **Total 255→295.** The plan's data tasks hard-code
this exact map in `data.test.ts`.

## 2. Drilling UX

| Item | File(s) | Behaviour |
|---|---|---|
| U1 Queue order | `src/lib/queue.ts` | Sort key becomes weak(1) → unrated(undefined) → ok(2) → solid(3) instead of unrated-first. One comparator change. |
| U2 Lap completion | `src/lib/queue.ts`, `Practice.tsx`, `MockSession.tsx` | `nextQuestion` returns `undefined` when every question in the working set has been shown this lap (track a `seenThisLap` set), instead of wrapping via `?? ordered[0]`. Practice renders a "Lap done" summary (weak/ok/solid counts) with a **Start another lap** button that resets the lap set. Mock session's `onComplete` fires the same way into its existing recap screen — no new UI there. |
| U3 Stopwatch | `types.ts` (`Round.targetSeconds?`), `data/index.ts` (add per round), `Practice.tsx`, `QuestionCard.tsx` | Stopwatch starts when a question mounts, stops when the user hits **Reveal**. Shows "Answered in 1:42 · target 2:30" next to the reveal button after reveal. Not persisted, not shown during mock recap. Targets: hr 90s, hm 150s, coding 180s, design 300s, case 150s, debrief 120s, hoe 150s. |
| U4 Back / undo | `Practice.tsx` | A history array of shown question ids. **Back** button (and key `B`) steps to the previous one, shown revealed with its current rating (if any) highlighted; rating it again overwrites. Disabled on the first question. |
| U5 Global search | `data/index.ts` (`ROUTES`), `App.tsx`, `Home.tsx`, new `SearchView.tsx` | Route `#search` renders the existing `Browse` component over every question (all rounds). One new thin wrapper component + a Home card. |
| U6 Print cheat sheet | new `PrintView.tsx`, `index.css` | Route `#print` lists every question rated Weak plus every question with a note, grouped by round, with the note and key points visible (no reveal interaction). A **Print** button calls `window.print()`; `@media print` hides chrome (header, nav, buttons) via a `print:hidden` utility. Home card. |
| U7 Scroll reset | `useHashRoute.ts` | `window.scrollTo(0, 0)` inside the hash-change handler, after the route updates. |

## 3. Code fixes

| Item | File | Fix |
|---|---|---|
| F1 Error boundary | new `ErrorBoundary.tsx`, `main.tsx` (or wherever the root render lives) | Class component catching render errors, shows "Something broke — Export your data, then reload," wraps `<App/>`. |
| F2 Contrast | `index.css` | Replace gruvbox `--color-red-400` with a value that hits ≥4.5:1 on `#282828` (nearest gruvbox-family red, e.g. bright red `#fb4934`'s neighbor or a manually lightened shade — the plan task picks and verifies the exact hex via contrast ratio). |
| F3 Reduced motion | `index.css` | Extend the existing reduced-motion rule to also disable `::view-transition-group(*)`, `::view-transition-old(*)`, `::view-transition-new(*)`. |
| F4 Dead code | `useHashRoute.ts` + its test | Remove the unused `navigate` export and its test case. |
| F5 Bad route guard | `RoundView.tsx` | Replace `rounds.find(...)!` with a found-or-fallback check that renders a small "Round not found" message with a link home, instead of throwing. |

## Testing

- Every data task updates `data.test.ts`'s expected-count map in the same
  commit as the data change (existing tests already check shape/uniqueness/
  non-empty fields, so new questions are validated for free).
- New logic (U1 comparator, U2 lap-end, U3 stopwatch, U4 history) gets a
  focused Vitest unit test alongside the existing `queue.test.ts` /
  component test files — follow existing test file conventions, don't
  invent a new test style.
- `npm run typecheck`, `npm test`, `npm run build` all green before any
  commit lands, and again before the branch is offered for merge.
- Manual pass in the dev server for U2 (lap end), U3 (stopwatch/reveal),
  U4 (back), U5 (search), U6 (print preview), on both desktop width and a
  narrow (mobile) viewport, since the user drills on both.

## Out of scope (explicitly skipped)

- SM-2 / spaced-repetition intervals — current weak-first ordering is enough
  for now.
- Debounced storage writes — state is a few KB; not a measured problem.
- Light-theme cleanup, per-round code-splitting, in-browser code editor,
  countdown/forced-hide timer, "hide category" mode.

## Public-repo constraint

This repo is public. All new content is generic coaching material with
`[bracket]` placeholders for personal specifics — no real employer
internals, no verbatim Qonto-specific detail, no personal contact info.
Before any push: `grep -rn "Zinier\|legally operative\|zinier" src/ docs/
README.md index.html` must exit clean.
