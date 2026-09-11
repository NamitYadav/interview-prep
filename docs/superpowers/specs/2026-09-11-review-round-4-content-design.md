# Review round 4 — content cuts and calibration

**Goal:** Make the bank drillable at staff level: every answer fits the clock it is
drilled against, every keyPoint is reachable, the two rounds that decide staff-vs-senior
(`design`, `hoe`) actually carry staff signal, and ~21 filler questions stop consuming
drilling time.

**Scope:** content only. One small type/render change (`deeper`) exists solely to make the
word-budget rule expressible. No refactors, no tooling, no new rounds.

## Global constraints

- Public repo rules stand: no employer-internal facts, no real STAR stories, no personal
  or CV specifics. Resume-derived *questions* are fine; answers stay generic coaching with
  `[placeholder]` fills.
- Market-data figures are cited as market data with a source and a date, never asserted.
- Naming real technologies (TanStack Query, Trusted Types, Module Federation) is NOT a CV
  specific and is encouraged — ~15 answers currently say "a library" and should not.
- Every change keeps `tsc`, `eslint .`, `vitest run` and `npm run build` green.

## 1. The one real invariant: answers fit their own clock

`rounds[].targetSeconds` is the clock the drill UI counts down. Today 28 answers cannot be
spoken inside it. Measured at **130 wpm** — a deliberate, pause-inclusive interview pace,
not a reading pace:

| round | budget | over |
|---|---|---|
| hr | 195w (90s) | 7 — worst `hr-036`=417 |
| hm | 325w (150s) | 19 — worst `hm-107`=696, `hm-101`=663, `hm-111`=641 |
| coding | 390w (180s) | 2 |
| design / case / debrief / hoe | — | 0 |

The existing fix convention is a `Only if asked:` prefix inside `answer`, applied to 23
questions — but it is a magic string the word count cannot see, and it was never applied to
`hm-113`/`hm-114`, the two newest and most staff-signal questions.

**Change:** promote it to the type.

- `Question.deeper?: string[]` — material to use only when the interviewer digs.
- Migrate all 23 `Only if asked:` paragraphs out of `answer` into `deeper`, dropping the
  prefix.
- Any answer still over budget after migration: move the least load-bearing material into
  `deeper` until it fits. Never delete the material.
- `QuestionCard` renders `deeper` post-reveal under its own "If they dig deeper" heading.
- **Test (`data.test.ts`):** every question's `answer` fits `targetSeconds` at 130 wpm.
  `deeper` is uncounted. This is the invariant that stops the drift.

## 2. KeyPoint audit — a judgement pass, NOT a test

116 of 303 questions have more keyPoints than answer paragraphs. Sampling shows the count
rule is only ~50–75% precise, so it is deliberately **not** being added as a test:

- `hoe-019` kp4 "a date-ish anchor" — supported by nothing in the answer. Defect.
- `hoe-004` kp2 ≈ kp3, the same bar written twice. Defect.
- `case-010` kp5 "condition under which a global store would be justified" — the answer
  only says a global store is an over-engineering tell. Defect.
- `debrief-014` — 3 paragraphs, 4 keyPoints, and paragraph 3 genuinely carries two of them.
  **Benign. Must not be "fixed".**

Near-duplicate detection was also tried and rejected: at a 0.55 token-overlap threshold it
finds 1 hit (a false positive — two deliberate opposites) and misses `hoe-004` at 0.43.

**Rule for the audit:** for each flagged question, each keyPoint must be tickable by someone
who spoke the answer. If it is not: add the missing sentence where the point is worth making,
drop the keyPoint where it is not, and merge outright duplicates. A paragraph legitimately
supporting two keyPoints is correct and stays.

## 3. `design` — the round that decides staff vs senior

`design-013` teaches requirements → data → **components** → **state** → perf → a11y →
observability → rollout. All 29 prompts go requirements → data → rendering → failure → NFR.
The two frontend-specific phases are missing from every answer.

- Retrofit component-tree and state-ownership paragraphs into the six weakest prompts,
  starting with `design-001`, `design-004`, `design-005`, `design-020`.
- Add one component/API-contract design question: controlled vs uncontrolled, compound
  components vs prop explosion, the headless/presentational split, and what counts as a
  breaking change to a shared component's API.
- Compress the EN 301 549 recitation (repeated verbatim across `design-002/006/020/022`) to
  one sentence plus its design consequence, hedged the way `hoe-007` hedges the AI Act —
  harmonised citations move by implementing decision, and being confidently wrong in four
  rounds is worse than being approximately right in one.

## 4. `hoe` — apply the staff-scope rubric `hm` already has

`hm-029`–`036` each name an artefact, a blast radius in teams, and a time horizon. They are
the strongest answers in the bank. `hoe-008` ("what does staff impact look like"),
`hoe-010`, `hoe-011`, `hoe-017`, `hoe-019`, `hoe-020` are generic paragraphs with none of
the three — they read as strong *senior*, which is the exact failure mode being drilled
against. Apply the same rubric.

## 5. `hr-013` — incoherent salary data

Compares Glassdoor *base* for *Staff* against levels.fyi *total comp* for *Senior* against a
€46k–€66k StepStone/kununu figure that is a general German developer average with no bearing
on Berlin staff frontend. Speaking that floor hands a recruiter an anchor.

Rewrite to lead with **method** — level → band → base vs total → annualised equity, which
`hr-038` already teaches — and demote every figure to one dated, bracketed line the candidate
refreshes before the loop.

## 6. Cuts — ~21 questions

Drilling time is the scarce resource. Each cut is fully subsumed by a named sibling.

- **coding meta (8):** `coding-002` ⊂ `001`+`009`; `003` ⊂ `009`; `005` ⊂ `case-012`;
  `006` ⊂ `debrief-031`; `007` ⊂ `case-014`; `016` ⊂ `010`; `019` ⊂ `021`+`hm-058`;
  `027` ⊂ `019`+`021`. Leaves 13 build prompts and 5 bug-in-code items intact.
- **micro-frontends (1):** cut `hm-002`, fold its host/remote upgrade-cadence paragraph into
  `design-027`. Keep `hm-001` as the short HM-round version.
- **virtualisation (3 of 5):** keep `design-020` and `coding-029`; cut the passes in
  `hm-013`, `coding-032`, `debrief-009` down to a cross-reference.
- **presentation (3):** `case-020`/`024`/`025` are one skill three ways — keep one;
  `case-023` duplicates `debrief-022`/`debrief-033`.
- **take-home dupes (1):** `case-032` and `case-033` are the same question — keep one.
- **feature flags (1):** `hm-037` ⊂ `design-026`; `debrief-028` makes it three.
- **consent (2):** keep the §25 TDDDG-vs-GDPR distinction in `hm-107`; `hm-015` and
  `debrief-019` cite it instead of restating it.
- **thin (1):** `hr-017` ⊂ `hr-020`.
- **TS depth (1):** `hm-091` (polymorphic component typing) — rarely asked at staff level in
  Berlin outside a design-system team. `hm-090` (illegal states unrepresentable) stays.
- **React Compiler hedge:** four verbatim copies across `hm-081`, `hm-013`, `coding-004`,
  `case-016`, `debrief-009`. Keep one full statement, cross-reference the rest.

`data.test.ts`'s per-round minimum counts move down to match. The freed slots are NOT filled
in this round — the DSA/vanilla-JS gap and the bar-raiser round are deliberately deferred.

## 7. Answers that stop one step short of the 2026 bar

One paragraph each, no restructuring: `hm-084` (CSP) never mentions `strict-dynamic` or
Trusted Types; `hm-086` never names the BFF / token-mediating-backend pattern that is now the
OAuth BCP recommendation, nor refresh-token rotation; `hm-005` justifies Redux by
"time-travel debugging" and names no library where TanStack Query vs RTK Query vs route
loaders is the live question.

## Out of scope

DSA and vanilla-JS utility questions; a bar-raiser/values round; model answers on `followUps`;
DSA/CRA regulatory content; every code refactor; all tooling and repo-presentation work.
