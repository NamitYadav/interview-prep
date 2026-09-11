# Review round 3: content accuracy + fintech depth, code bugs + a11y, drilling realism

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Act on four independent reviews (content HR/HM, content coding→HoE, interview realism/UX, code quality) so the app is ready for a staff frontend loop in Berlin within weeks, at both fintech and scale-up/big-tech targets.

**Architecture:** Three PRs by area, landed in order so `QuestionCard`/`Practice` are refactored before features build on them: **PR 1 content** (data files only) → **PR 3 code bugs, a11y, tooling** → **PR 2 drilling realism**. Each PR: spec section below → implement with tests → whole-branch review → push + PR.

**Tech Stack:** Unchanged. Vite + React 19 + TS strict + Tailwind v4 + Vitest. New deps only in PR 3: `eslint-plugin-jsx-a11y`, `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`.

## Global Constraints

- Public repo: answers are generic coaching with `[bracket placeholders]`; no employer-internal facts, real STAR stories, or CV specifics. Question stems are rewritten to hypotheticals where they read as a CV fingerprint (list in PR 1).
- `Persisted` v2 stays backward compatible: validators keep accepting `dueAt`/`interval`/`easeFactor` even after the reducer stops writing them.
- `npm run lint`, `npx tsc --noEmit`, `npm test -- --run`, `npm run build` green before any push; content grep `grep -rn "Zinier\|legally operative\|zinier" src/ docs/ README.md index.html` returns exit 1.
- Market-data numbers (salary bands) are cited as market data with a source and date, never as claims.

---

## PR 1 — Content

Data files only (`src/data/*.ts`, `src/__tests__/data.test.ts`, `README.md`). Every edit is a question-level rewrite; the `Question` shape is unchanged.

### 1.1 Accuracy fixes (rewrite the affected `answer` paragraph and matching `keyPoint`)

| id | wrong today | correct |
|---|---|---|
| `hr-016` | "a shorter period for you than for them is not on offer" (§622(6) BGB) | §622(6) only forbids the *employee's* notice being longer than the employer's; a shorter employee notice is legal and is a real negotiating lever |
| `hr-027` | VSOP "taxed as ordinary income (dry-income risk)" | VSOP is taxed as income *only at payout* — no dry income; dry income is the risk of *real* shares, which §19a EStG (ZuFinG) exists to defer |
| `hr-033` | "canton-equivalent (Bundesland)" | drop "canton"; church tax is 8% (BY, BW) or 9% elsewhere |
| `coding-038` | "a 4xx is not [retryable]" | retry network errors, 5xx, **408 and 429**; honour `Retry-After`; other 4xx are not retried |
| `coding-031` | "make sure the panel is in the tab order (tabIndex=0 on the panel itself)" unconditional | APG: `tabindex="0"` on the panel **only** when it contains no focusable content |
| `coding-033` | `Promise.all` "fail-fast" | rejection propagates early but the other N-1 workers keep running unless a cancelled flag is checked; stub needs a `limit <= 0` guard |
| `coding-028` | race answer stops at "check the request is still current" | the rejection handler must distinguish `AbortError` from a real failure or every keystroke renders "search failed" |
| `coding-029` | `endIndex = startIndex + ceil(viewportHeight / rowHeight)` | `+ 1` for the partially visible row at the top offset |
| `coding-020` | review misses it | `rule.value` is a fraction in the percent branch and an absolute amount otherwise, with nothing in the type separating them — a blocking finding |
| `coding-037` | follow-up asks about "thread-safe" JS | "safe under concurrent async callers" |
| `hm-052` | "the first rule … outweighs both of the class-only rules" | `!important` is a separate cascade tier, not specificity; and `a:hover` (0,1,1) never applies in the sidebar because the ID chain wins — a dead rule |
| `hm-053` | answer assumes the modal is centred and the header is fixed | `top:50%` with no vertical offset/transform is *not* vertically centred; `.header` is static so `margin-top:64px` + 64px header + `calc(100vh - 64px)` overflows the page by 64px |
| `hm-057` | stem says cards "overflow"; "768px to 900px" is invented | restate: with `flex-wrap`, three cards at 33% + padding don't fit so the third *wraps*; "three cramped columns just above 768px", no 900px |
| `design-026` | kill-switch "in seconds" vs flags "resolve once per session" un-reconciled | kill-switch is the one flag class that force-re-resolves (push/short TTL) mid-session; everything else resolves per load |
| `design-023` | "an iframe (a separate document/origin)" | same-origin/`srcdoc` iframes isolate styles, not scripts; `sandbox` + a distinct origin is the control |
| `hm-013`, `hm-081` | React Compiler "the emerging alternative" | shipping (1.0); adjust the hedge |

### 1.2 Fintech depth

- New `hm` category **`Regulated & payments FE`** — 7 questions (`hm-100..106`): SCA/3DS step-up in the UI and recovering state when the user returns from the ACS; PCI scope reduction in the browser (hosted fields / iframes, SAQ A vs A-EP); idempotency keys on payment submit; money as integer minor units + `Intl.NumberFormat` (never floats); maker-checker / dual-control UI; session re-auth for high-risk actions; frontend audit-logging expectations.
- Consent/CMP architecture (script gating, Consent Mode, TDDDG §25) becomes its own `hm` question (`hm-107`) instead of a clause in `hm-015`.
- `design-002` gains a paragraph + keyPoint: PSD2 SCA, the 3DS challenge (redirect or iframe), and state recovery on return from the ACS.
- Two utility build prompts are replaced in place (same ids, new content): a **transactions data table** (sort/filter/paginate over money values, `Intl.NumberFormat`, stable sort) and an **amount/currency input with a React 19 form Action** (`useActionState`, minor-units validation, optimistic pending state). Which two utilities: decided at implementation from `coding-032/033/034/037/039` — keep `coding-033` (concurrency limiter) and `coding-037` (memoize) as the strongest utilities; replace two of the remaining three.
- `coding-004` gets a React Compiler / `useMemo` line.
- Stems containing "You have 45 minutes" drop that phrase (contradicts the round's 180s timer).

### 1.3 Compensation with numbers

- Existing band answers (`hr-013`, `hr-031`) get a researched Berlin staff-FE range, cited as "market data, [source], [month year]" — WebSearch at implementation (levels.fyi, Glassdoor, StepStone Gehaltsreport, Kununu). Keep `[your number]` placeholders for the candidate's own ask.
- New `hr` questions (`hr-036..038`): **leveling negotiation** (level is worth more than base at Zalando/Google/SAP; how to ask for a re-level), **competing / exploding offers**, **RSU vs VSOP total-comp comparison** including the "recruiter demands a number in minute three" script.
- `hr-039`: Kündigungsschutz (KSchG: >6 months tenure, >10 employees; §15(3) TzBfG interaction with a befristet contract).

### 1.4 Coverage gaps

- `hm`: i18n/l10n across EU markets (2: plurals/locale formatting/RTL; translation pipeline and per-market bundle cost); CORS/preflight + clickjacking (1); WebSocket/SSE streaming UI (1); monorepo + design-system governance (Nx/Turborepo, affected-graph CI, publishing, codeowners) (1); staff-vs-senior signals (2: writing a technical strategy / 2–3 year vision doc and deciding what *not* to do; sponsoring someone's promotion / calibration).
- `design`: 3 new prompts — micro-frontend / Module Federation migration; a genuine real-time order book (latency budget, tick coalescing, virtualization); rendering + bundle architecture at scale (SSR vs CSR vs edge, route splitting, data residency as an NFR). Explicit latency budgets (INP target, tick-to-paint, p95 upload) added to `design-003`, `design-020`, `design-022`. An a11y-as-legal-floor line (WCAG 2.2 AA via EN 301 549, EAA/BFSG since June 2025) added to 4 design answers. A closing NFR/rollout paragraph added to the answers that skip it (`design-001, 003, 004, 019, 020, 022` and any others found).
- `hoe` questions to ask them (`hoe-032..035`): runway/funding; share of roadmap that is regulatory-driven and who owns it; on-call for frontend; how staff scope is defined vs senior here.

### 1.5 Depth calibration

- `hm-029..036` (Leadership): each answer gets one staff-scope rubric line naming the artifact and blast radius (org-level doc, multi-quarter horizon, "changed how N teams decide X").
- `hoe-001`, `hoe-005`, `hoe-006`, `hoe-031`: reframed from "you own the org program" to "how you'd contribute to / pressure-test it" (staff IC, not EM). BetrVG content kept.
- `hoe-002`, `hoe-006`, `hoe-007` (and `design-007`, `design-011`): compliance paragraphs prefixed "Only if asked:" so the answer is deliverable in `targetSeconds`.
- `design.ts` answers are checked against the skeleton `design-013` teaches; missing phases get the closing paragraph from 1.4.
- "Avoids X" / unfalsifiable keyPoints across all files → observable "Says X out loud" / "Names a number" phrasing.

### 1.6 Cleanup

- **CV stems → hypotheticals** (22): `hm-044, 045, 046, 048, 050`, `hr-021, 022, 023, 025`, `case-031, 033, 034, 035`, `debrief-026..030`, `hoe-026..029`. Pattern: "You built X" → "Tell me about a time you built something like X" / "If your background includes X…". Answers unchanged.
- **Duplicates collapsed** (delete the second, fold any unique point into the first): `hm-045→037`, `hm-098→039` and `hm-099→096`, `hm-060→052`, `hm-061→053`, `hr-011→010`, `hr-031→013` (after 1.3 numbers land in `hr-013`), `hm-082→081`, `case-037→debrief-004` (keep debrief), `case-016→debrief-009` (narrow `case-016` to the judgement-not-to-optimize point instead of deleting), `case-035→debrief-024`, `case-007→case-003`, `debrief-034→debrief-006`, `debrief-035→debrief-031`, `hoe-003→hoe-002`, `hoe-016→hoe-015`, stale-response race cut from `coding-004` (kept in `coding-015`, `coding-028`).
- **Meta-advice trim**: 5 of `coding-001, 002, 003, 005, 007, 009, 010, 013, 016, 017, 019, 021, 023, 025, 026` deleted — the five whose content is fully covered by another meta question (decided at implementation, listed in the commit message).
- `hr-016, 028, 033, 034, 035` (+ new `hr-039`) re-tagged from `Compensation` to a new `German employment` category.
- `src/__tests__/data.test.ts` expected counts updated; `README.md` total count and round blurbs updated.

---

## PR 3 — Code bugs, accessibility, tooling

### 3.1 Bugs

- `Practice.tsx` Space handler: `preventDefault` only when `!latest.current.revealed`, so Space scrolls a revealed answer.
- `QuestionCard.tsx` strict mode: one `deadline = mountedAt + targetSeconds*1000` drives both the auto-reveal (`setTimeout(fn, Math.max(0, deadline - Date.now()))`) and the visible countdown, so toggling strict mode mid-question can't show `0:00` while the reveal is minutes out.
- `MockSession.tsx` recap: `const rated = drill.flatMap(q => { const e = state.progress[q.id]; return e && e !== baseline[q.id] ? [e] : []; })` — no `!`, survives Reset-mid-session.
- `storage.ts` `isStory`: `lastRehearsed` validated with `isOptionalFiniteNumber`.
- `ErrorBoundary.tsx`: Reload button (`location.reload()`) and an `href="#"` Home link.
- `useAppState.ts`: the flush path calls `setSaveFailed(!save(...))` so a failing last-chance write raises the banner.
- `Practice.tsx`: ids truncated by Back-then-advance are removed from `seenThisLap`; key-point `checked` state is hoisted to `Practice` as `Record<id, Set<number>>` and passed down, so Back no longer discards ticks.

### 3.2 Architecture / TypeScript

- `Practice.rate` passes `state.progress` to `advance` (the in-component `reducer()` re-run is a provable no-op — the only changed entry is the excluded current id); `reducer` import removed.
- `App.tsx`: `const isRoundId = (r: Route): r is RoundId => (ROUND_IDS as readonly string[]).includes(r)` replaces the six-way `!==` chain.
- `Question.scratch?: true` set on the 12 build prompts in `coding.ts`; `QuestionCard` keys the scratch editor on it instead of `category === 'Build prompts'`.
- New `src/hooks/useQuestionTimer.ts`: `useQuestionTimer({ targetSeconds, strictMode, revealed, onAutoReveal }) → { elapsedMs, remainingMs, autoRevealed, markRevealed }` — stopwatch, countdown, auto-reveal, the `onReveal` ref, and the shared deadline all move here; `QuestionCard` shrinks accordingly and loses the `mountedAt.current!` assertions. Existing `QuestionCard` timer tests keep passing unchanged (behaviour-level).
- `storage.ts` `EMPTY` moves to `src/__tests__/helpers.ts`; `emptyState()` remains the production API.

### 3.3 Accessibility

- `index.css`: `:focus-visible { outline: 2px solid var(--color-emerald-500); outline-offset: 2px; }` globally; the two `outline-none` targets keep it (they are programmatic-focus containers) but everything else shows the ring in all three themes.
- `RoundView.tsx` Practice/Browse tabs: `role="tablist"` container, `role="tab"` buttons with `aria-selected`/`aria-controls`/`id`, panels with `role="tabpanel"`/`aria-labelledby`, roving `tabIndex`, ArrowLeft/ArrowRight/Home/End. Category chips stay `aria-pressed` toggle buttons (they are toggles, not tabs).
- `QuestionCard` rating group: `role="radiogroup"` + `role="radio"`/`aria-checked` instead of a `region` landmark with `aria-pressed`.
- Route change: `App` focuses the new view's `<h1 tabIndex={-1}>` after the transition (each view's `h1` gets `tabIndex={-1}`; a `useEffect` on `route` does `document.querySelector('main h1')?.focus()`).
- Countdown `<p role="timer" aria-live="off">`; on auto-reveal a visually-hidden `<p role="status">Time's up — answer revealed</p>`.
- `ProgressBar`: `aria-valuemax={Math.max(1, max)}`, `aria-valuetext={`${value} of ${max}`}`.
- `QuestionCard` gets `focusOnMount?: boolean` (default `true`); `Browse` passes `false` so expanding a row doesn't yank focus off the disclosure button.
- `eslint-plugin-jsx-a11y` added with `flatConfigs.recommended`; violations it surfaces are fixed in this PR.

### 3.4 Tests

- `App.test.tsx` golden path: `location.hash = '#hr'`, render, click Reveal, click Solid, assert the next question renders, advance fake timers 500ms, assert the rating is in `localStorage`.
- `Practice.test.tsx`: Space on a revealed card does **not** call `preventDefault` (spy on the event).
- `QuestionCard.test.tsx`: unmount mid-countdown → `vi.getTimerCount()` is 0.
- The "resets on remount" assertion moves to `Practice.test.tsx` (advance to the next question, assert the checklist is empty).
- `data.test.ts`: exact per-round counts → `toBeGreaterThanOrEqual(min)` with the post-PR-1 counts as minimums; total/uniqueness/shape checks unchanged.

### 3.5 Performance / tooling

- `Browse.tsx`: module-scope `haystack = new Map(questions.map(q => [q.id, `${q.question} ${q.category} ${q.answer.join(' ')} ${q.keyPoints.join(' ')}`.toLowerCase()]))`; the filter is `useMemo`d on `[questions, needle]`.
- Note textarea (`QuestionCard`) and story fields (`StoriesView`): local draft state, dispatch debounced 300ms and on blur.
- `data/index.ts`: `questionsByRound` reads from a `Map<RoundId, Question[]>` built once.
- Fonts: `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` imported in `index.css`; the Google Fonts `<link>`s and preconnects removed from `index.html`; `--font-sans`/`--font-mono` names updated to the fontsource family names.
- `.github/dependabot.yml`: weekly `npm` and `github-actions` updates.
- `README.md`: measured bundle size line ("~230KB gzip, ~510KB of which is question text — measured, accepted for a single-user app").
- **Skipped, deliberately:** CSP via `<meta>` (the inline pre-paint theme script needs a build-time hash — fragile for the gain on a static single-user page); type-aware ESLint (`recommendedTypeChecked` surfaces a long tail unrelated to the loop); Prettier (formatting is consistent by hand; noted in README).

---

## PR 2 — Drilling realism

### 2.1 Honest self-rating

`QuestionCard` pre-reveal state gains `<textarea aria-label="Your answer" placeholder="Your answer in 3 bullets, before you look">`; after reveal it stays rendered (read-only, above the model answer) so the key-point checklist is a comparison. Ephemeral local state (resets per question via the existing `key` remount).

### 2.2 Speak

New `src/hooks/useRecorder.ts`: `{ supported, recording, url, start, stop }` over `MediaRecorder` + `getUserMedia({ audio: true })`; `url` is an object URL revoked on unmount/re-record. `QuestionCard` pre-reveal: a "Hold to record" button (`onPointerDown` → `start`, `onPointerUp`/`onPointerLeave` → `stop`) rendered only when `supported`; after reveal, `<audio controls src={url}>` above the model answer when a recording exists. Nothing is persisted. Tests mock `MediaRecorder`/`getUserMedia`.

### 2.3 Queue

- `queue.ts`: `orderQueue` sorts weak(0) → unrated(1) → ok(2) → solid(3), tiebreak oldest `lastSeen` first — the pre-SM-2 bucket sort. `nextInterval`, `nextDueAt`, `DEFAULT_EASE_FACTOR` deleted; `useAppState.rate` writes only `rating/seen/lastSeen`. `storage.ts` validators still accept the three optional SM-2 fields.
- `Practice.tsx` in-lap re-surfacing: `requeued: { id: string; at: number }[]` + `step` counter. On rating 1 the id is **not** added to `seenThisLap`; instead `{ id, at: step + 8 }` is pushed. `advance` first serves any requeued item with `at <= step` (removing it), otherwise `nextQuestion(...)`. Lap is done only when `nextQuestion` is `undefined` **and** `requeued` is empty; pending requeues are served in order at lap end. Tests: weak → resurfaces within 8 advances; not excluded from lap; lap-done waits for requeues.

### 2.4 Readiness

- `src/hooks/useLoopDate.ts` (same shape as `useStrictMode`, key `interview-prep:loop-date`, ISO `YYYY-MM-DD` or null).
- `Home.tsx`: `<input type="date">` "Loop date" in the header; when set, "D days left" and each round card shows `N unseen · M weak · D days`; cards sort by `(weak*2 + unseen)` descending; the "Round N" label uses the data-order index, not the sorted index.
- Export nudge: `interview-prep:last-export` timestamp written by `ExportImport` on export; `Home` shows an `role="status"` banner when progress is non-empty and the last export is >7 days ago or absent.

### 2.5 Round shape

- `Practice` gets `ordered?: boolean` (skip `orderQueue`, use array order) and renders a round-boundary banner `Round k of n — {title} · target {m:ss}` whenever `current.round !== previous.round` (or on the first question); `k/n` from the distinct rounds present in `questions`.
- `MockSession.buildSet` keeps per-round blocks in preset order and passes `ordered`; blurb becomes "A curated, cross-round set in round order, like a real loop day." (drops the false "weighted toward your weak spots").
- Design round: `RoundView` shows a third tab **"45-min prompt"** only when `roundId === 'design'`. New `src/components/DesignSession.tsx`: picks `nextQuestion(designQuestions, progress)`; 45-minute visible countdown (reuses `useQuestionTimer` with `targetSeconds = 2700`, no auto-reveal); the phase checklist from `design-013` (requirements → API/data → components → state → perf → a11y/i18n → observability → rollout) as checkboxes; a scratch `<textarea>`; **Finish** reveals the model answer + keyPoints and the standard rating buttons (dispatches `rate`); "Another prompt" restarts. Tests: renders a design prompt, Finish reveals, rate dispatches.

### 2.6 Use what you wrote

- `data/index.ts`: `export const STORY_CATEGORIES: ReadonlySet<string>` (hm `Leadership & influence`, `Situational`, `From your CV`, `Delivery & process`; hr `From your CV`, `Motivation & fit`; all `hoe` categories; case/debrief `From your CV`-style categories as found) and `isStoryPrompt(q)`. `data.test.ts` asserts every category in the set exists in the data.
- `QuestionCard` pre-reveal on `isStoryPrompt(question)` when `stories` is non-empty: "Your stories" list, least-recently-rehearsed first, each with "Use this" → expands the body inline and dispatches `rehearseStory`. Needs `stories`/`onRehearse` props threaded from `Practice`.
- Follow-ups move **before** reveal: a "Probe me (1/2)" button shows one follow-up at a time with its own elapsed time (from `useQuestionTimer`-style `Date.now()` diff); after reveal, follow-ups render as a plain list (the post-reveal "Answer the follow-up" button is removed).
