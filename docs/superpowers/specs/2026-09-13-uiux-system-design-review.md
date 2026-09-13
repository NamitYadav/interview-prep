# UI/UX and System Design Review

**Date:** 2026-09-13
**Scope:** Whole app as of `cedc54f` (main). UI/UX half driven live in the browser:
every route, all three themes, desktop and 375px viewport, keyboard shortcuts,
print view. System-design half judged against the README's stated constraints —
single-user, static, localStorage only, one bundle, GitHub Pages. Not judged:
what it would take to add sync, auth, or a backend.
**Deliverable:** Report only. Nothing below has been changed.

## Verdict

No P1. The drilling core (queue, lap restore, requeue, persistence hardening,
export/import, error boundary) is in good shape and well tested. What is left is
a handful of P2s that cost real time during a drill — the rating controls being
two screens away on a phone, the 45-minute clock forgetting itself, a cramped
round header on mobile, and a lap cap that silently evicts pending weak
requeues — plus P3 polish and a few doc/config drifts.

Things verified to work, so nobody re-checks them: Space/N/B/1-2-3 shortcuts
(Space works; the automation tool sends an empty key for it, that was not the
app), follow-up clocks tick, lap position and rating restore across
navigation, mock recap counts, Settings closes on Escape and outside click,
Gruvbox and Light contrast (body text 10.75:1 on Gruvbox, secondary text
5.3:1), no horizontal overflow at 375px anywhere, print CSS forces
black-on-white.

## UI/UX findings

### P2

**U1. Rating is the furthest thing from Reveal.** After reveal the card runs
model answer → key points → follow-ups → note textarea → rating radios
(`src/components/QuestionCard.tsx:281-338`). The hit-count hint
("0/4 key points hit · suggested: Weak") sits under the key points, but the
control it is suggesting for is another two sections down — on a phone that
is roughly two viewports of scrolling for every single question. The note is
optional; the rating is the one thing every question needs.
*Fix:* move `RatingRadios` directly under the key-points section (where the
suggestion already is), note below it. Keyboard users are unaffected (1/2/3).

**U2. The 45-min design session forgets its clock.** `DesignPrompt` keeps the
deadline in `useQuestionTimer`'s mount time and the phase ticks in `useState`
(`src/components/DesignSession.tsx:71,84-86`). Only the scratch pad is
persisted (`useDraft`). Switching to the Browse tab to look something up, or a
reload, remounts the component: clock back to 45:00, all phases unticked, same
prompt. The clock also starts the instant the tab opens, before the prompt has
been read.
*Fix:* persist `{ startedAt, checkedPhases }` per question id in the existing
`keyedStore` next to the scratch draft (same per-device, out-of-backup class),
derive the deadline from `startedAt`. Optionally an explicit Start button so
reading the prompt is not on the clock.

**U3. Round header does not fit at 375px.** The tablist and the category
`<select>` share one row (`src/components/RoundView.tsx:70-108`, select capped
at `max-w-[55%]`). On the design round the third tab wraps ("45-min / prompt" on
two lines) and the select truncates to "All ca". Phone was confirmed as a real
target.
*Fix:* `flex-wrap` on the row so the select drops to its own line below the
tabs under `sm`, or shorten the tab label to "45 min".

**U4. Lap cap evicts pending weak requeues.** `MAX_LAPS = 12`
(`src/lib/lap.ts:23`). Every distinct question set gets its own lap key:
7 rounds × (1 all + N categories) = 53, plus Weak drill and two mock presets
= 56 possible keys. The comment says "enough for the rounds plus a couple of
drills"; the category filter alone blows through it in one evening. Eviction
is oldest-saved-first and silent, and a lap carries not just position but the
`requeued` list — the "Weak comes back in ~8" promise from the README is what
gets dropped.
*Fix:* raise to 64 (the store is tiny: ids and two numbers per lap), or evict
by `savedAt` age rather than count.

### P3

**U5. Back after Skip reveals a question you never saw the answer to.**
`back()` sets `revealed` true unconditionally
(`src/components/Practice.tsx:216-220`). Skip an unrevealed question, press B,
and the model answer is showing. Intended for re-rating; wrong for a skip.
*Fix:* only reveal on Back if the target entry has a rating in `state.progress`
or was revealed in this lap.

**U6. Focus ring shows on the two programmatic-focus targets despite
`outline-none`.** Both the question `<h2>` and the revealed-answer container
carry `outline-none` (`src/components/QuestionCard.tsx:141,261`) and
`src/index.css` documents them as deliberate exceptions to the global
`:focus-visible` rule. In practice a bright ring wraps the whole revealed answer
after a keyboard reveal, and the heading after B — Tailwind v4 emits utilities
in a cascade layer, and the unlayered `:focus-visible` rule in `index.css` beats
any layered utility regardless of specificity.
*Fix:* `[tabindex="-1"]:focus-visible { outline: none }` next to the global
rule, or move the global rule into `@layer base`.

**U7. Model answer has no heading in the drill card.** The revealed card
labels "Your answer", "Key points", "Likely follow-ups", "Your note" — but the
model answer paragraphs sit unlabeled between the timing line and Key points
(`QuestionCard.tsx:281-284`). `DesignSession` does label it ("Model answer",
line 160). Small, but it is the one thing the user is there to read, and a
screen-reader user landing on the container hears paragraphs with no name.

**U8. Home: orphan card and clipped blurbs.** Seven round cards in a two-column
grid leaves Round 7 alone on its row. Blurbs are `line-clamp-2`; Round 2 and 3
truncate to "…staff-scop…" and "…reviewing a PR…" on desktop
(`src/components/Home.tsx:12-13`). Either tighten those two blurbs to fit two
lines or drop the clamp and let `min-h` do the alignment.

**U9. Design prompt shows its raw id.** The 45-min tab renders `design-001`
top-right (`DesignSession.tsx:100`) where Practice shows "1 of 30". Show the
category only, or "Prompt n of 30".

**U10. Action row wraps unevenly on phones.** Reveal + Probe me on line one,
Record alone on line two at 375px. `flex-wrap` is doing the right thing;
`Record` could become an icon-only button on `sm:` down, or the three could be
`grid-cols-3`.

**U11. README count drift.** README says 303 questions; the data has 295
(36 + 99 + 35 + 30 + 30 + 32 + 33) and Search shows "295 of 295".

## System-design findings

Lens: does the architecture fit "single-user, static, localStorage, one bundle,
Pages"? Mostly yes, and the README's trade-off paragraph is honest and matches
the code (no manual chunks, no type-aware lint, no CSP meta).

### What is right-sized

- **Persistence hardening is proportionate, not paranoid.** Corrupt-JSON
  quarantine, v1→v2 migration, quota failure surfaced as a banner, cross-tab
  stale detection with a false-positive guard, 500 ms debounced writes flushed
  on pagehide/visibilitychange/unmount (`src/lib/storage.ts`,
  `src/hooks/useAppState.ts:81-127`). Each of these maps to a real way a
  single-user app loses data. All tested (`storage.test.ts`, `store.test.ts`).
- **Two storage abstractions, both earning their keep.** `useStoredValue`
  (scalar per-device prefs: theme, strict, shortcuts, loop date) and
  `keyedStore` (keyed records: laps, drafts, mock baseline). Each has 3+ real
  call sites with differing decode/encode. The dedupe PR that produced them
  removed four near-copies.
- **Backup boundary is coherent.** In the backup: ratings, notes, stories
  (prep data). Out: theme, strict, shortcuts, loop date, lap positions, scratch
  drafts (device state). Import validates shape, confirms with a before/after
  summary, and clears laps and drafts so nothing points at questions the new
  data may lack (`ExportImport.tsx:59-75`).
- **Routing.** Hash routes, `ROUTES` allow-list, focus to `main h1` on change,
  title per route, View Transitions feature-detected with the abort rejection
  swallowed. Nothing more is needed for thirteen routes.
- **CI gates deploy on lint + test + build**, PRs build without deploying,
  Node 22 pinned, npm cache on (`.github/workflows/pages.yml`).
- **SM-2 was designed, shipped, then deleted** once its scheduler benefit was
  seen as unreachable for a bounded 295-question set. The spec trail records
  why. That is the right call and worth keeping as precedent.

### P2

**S1. Lap cap** — see U4. Same finding, listed here because the fix is a
constant in `src/lib/lap.ts`.

**S2. The Practice lap state machine lives in the component.** Restore-on-mount
(`Practice.tsx:52-74`), requeue/drain in `advance` (155-194), and the
seen-in-path derivation (143) are the most intricate logic in the app and the
only intricate logic not exposed as a pure function — `queue.ts` and `lap.ts`
are. Coverage comes from `Practice.test.tsx` component tests, which are slower
and cover fewer orderings. The mechanics spec deferred this deliberately.
*Recommendation:* not now. Next time `advance` changes for any reason, lift
`{history, historyPos, requeued, step}` + `advance(state, rating, now)` into
`lib/lap.ts` and give it a table test. Do not refactor speculatively.

### P3

**S3. Theme key is a duplicated literal with no test.** `index.html:13` and
`src/hooks/useTheme.ts:14` both spell `'interview-prep:theme'`, each with a
"keep in sync" comment. A rename silently brings back the theme flash.
*Fix:* one test that reads `index.html` and asserts it contains `THEME_KEY`.

**S4. Session state for the 45-min drill is component-local** — see U2. The
storage class already exists (`keyedStore`); it is just not used here.

**S5. Scratch drafts are out of the backup.** Build-prompt code and design
scratch are "device state" by the current rule, but they are the user's own
written work, arguably closer to notes than to a lap position. A new laptop
loses every scratch pad. Design question, not a bug: either move drafts into
the backup (schema v3, one migration) or say so explicitly in the README's
"Your data" section.

**S6. Bundle number and warning drift.** Build today: 920 KB raw / 298 KB gzip
(README says ~280). Vite prints the >500 KB chunk warning on every build for a
trade-off the README already made deliberately. Either accept and silence it
with `build.chunkSizeWarningLimit: 1000` in `vite.config.ts` (one line, keeps
the build output signal-only) or update the README number. Code-splitting stays
out of scope per the drilling-extras spec.

**S7. `lapKey` collision heuristic is fine in practice.** Length + first id +
last id (`lap.ts:37-38`). Within a round, categories are disjoint so first ids
differ; across rounds ids differ by prefix. The only realistic collision is a
category that happens to equal the whole round, which is the same set anyway.
Practice also drops unknown ids on restore. No action; noting so nobody
"fixes" it into a hash.

## Not findings (checked, fine)

- Import of a malformed file: `parseBackup` throws, caught, shown as
  `role="alert"`; nothing is dispatched.
- Mic denied / MediaRecorder missing: Record button hides or no-ops, nothing
  is stored (`useRecorder.ts:92-99`).
- Error boundary: reload, go home (with reload, since the hash listener is
  gone), and a confirm-gated "delete all saved data" as the last resort.
- Reduced motion: view transitions and `animate-fade-in` collapse to 0.001 ms.
- Print: chrome hidden, black-on-white forced, `break-inside-avoid-page` per
  question, scratch starters skipped so empty stubs do not print.
- Settings `<details>` panel: fits at 375px (288 px wide, 16 px from each
  edge), closes on Escape (focus back to summary) and outside pointerdown.

## Suggested order if acting

1. U1 rating placement, U3 mobile header, U6 focus ring — pure layout/CSS,
   each a few lines, all visible on the next drill.
2. U4/S1 lap cap — one constant.
3. U2/S4 persist the design session — small, uses existing `keyedStore`.
4. U5 Back-after-Skip, U7 heading, U9 id, U8 blurbs — polish.
5. S3 theme-key test, S6 warning limit, U11 README count — hygiene.
6. S5 drafts-in-backup — decide first, then either a v3 migration or a README
   line.
