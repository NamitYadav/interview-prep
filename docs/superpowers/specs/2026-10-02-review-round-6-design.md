# Review, sixth pass: full-stack work, the question bank, code, and what to cut

**Date:** 2026-10-02
**Scope:** The whole app as of `8f01eb0` (main). Four tracks: everything since round 5
(`08c413f..HEAD`: full-stack roles, Backend & data round, backend pads, Gruvbox Light);
a fact-check of all 393 questions; a whole-app code pass; an over-engineering pass.
Also checked in the browser, locally and on the live site.
**Baseline:** typecheck and lint pass; `npm run smoke` passes 4/4; the live site runs the
backend pads. The test suite fails about 1 run in 6 (C1).
**Deliverable:** this report → one PR. **Status:** A (C1–C13), B (T1–T2), E and D's O2, O5, O6, O7 and O8 landed;
C content in progress separately. Duplicates left as is; only repeated `deeper` text is trimmed. Declined or
skipped: O1 (focus sound stays; C1 clamps brown noise instead); O3 (writeLap/readDraft/writeDraft must stay, so
callers would mix wrappers with raw store calls, for ~25 lines and ~65 rewritten test lines); O4 (jsdom has no
popover API, so the Escape/outside-click tests could not run, and a top-layer popover needs anchor positioning
to sit under its button); O8's group-by (`Map.groupBy` is newer than the build's browser targets). C2 also
stores the drawn set per role and preset, so a reload mid-session still resumes it. C12 keeps one previous SW
cache rather than precaching (the worker already was).

Severity: P1 broken · P2 real issue · P3 polish. Every code finding below was confirmed
by reading the code; C1, C2, C3, T1 and Q-hm1/Q-hm2 were reproduced or checked by hand.

---

## A. Code

| # | Sev | Where | Defect → fix |
|---|---|---|---|
| C1 | P2 | `hooks/useFocusSound.ts:33-34` | Brown noise is `last * 3.5`, where `last` can reach ±1, so the samples clip past ±1 and the test fails about 1 run in 6 (seen: 1.057). → Clamp the output, or scale by the running peak. |
| C2 | P2 | `components/MockSession.tsx:32-38` | `buildSet` takes `slice(0, n)` in file order, so **every mock session serves the same questions**. For full-stack roles, backend is always backend-001..006 (API design only). → Shuffle within each round before slicing (reuse `orderQueue`'s random draw). |
| C3 | P2 | `components/Practice.tsx:21-27` | `ownsKeys` misses `SELECT`. With the Category select focused, typing "n" skips a question and "b" goes back, and Space reveals the answer instead of opening the select. → Add `SELECT`; treat `SUMMARY` like a button for Space. |
| C4 | P2 | `components/ScratchPad.tsx:66-70` | Pad output lines have no cap. A logging loop such as `while(true) console.log(i)` floods `setLines` (O(n²) copying plus an unbounded live region), so the tab hangs before Stop can be clicked. → Keep the last ~500 lines and add one "output truncated" line. |
| C5 | P3 | `Practice.tsx:274` | No `e.repeat` guard, so holding "n" burns through the lap. → `if (e.repeat) return`. |
| C6 | P3 | `ExportImport.tsx:70-77` | Import or Reset while Practice is mounted: the old in-memory lap state is written back under the key that was just cleared. → A reset epoch in Practice's `key`. |
| C7 | P3 | `useRecorder.ts:75-88` | If the track ends on its own (mic unplugged), `onstop` never calls `setRecording(false)`, so the button stays on "Stop recording". |
| C8 | P3 | `DesignSession.tsx:35-39,90` | A design session restores forever (old `startedAt`, so the clock shows 0:00). The scratch draft is never cleared, so cycling back to a prompt prefills the old write-up under a fresh 45:00. |
| C9 | P3 | `queue.ts:21`, `storage.ts:18-22` | A future `lastSeen` (clock skew or a hand-edited import) never decays and stays Solid forever. → Treat a negative age as decayed; reject `lastSeen > now + 1 day` on import. |
| C10 | P3 | `useLoopDate.ts:7` | A corrupt stored date shows "NaN days left". → Validate `YYYY-MM-DD` in `decode`. |
| C11 | P3 | `storage.ts:73-83` | A future-version blob (after a rollback) is treated as corrupt, moved aside, then overwritten by an empty v2. → For an unknown higher version, leave the original key alone. |
| C12 | P3 | `vite.config.ts:18-33` | A tab left open across a deploy: the new SW deletes the old cache, and the first Run asks for `worker-<oldhash>.js`, which no longer exists. A reload fixes it. Accept, or precache the worker. |
| C13 | P3 | `Home.tsx:127-132` | The `first:/last:col-span-2` grid assumes an odd number of cards, so the 8-card Staff full-stack grid leaves a hole. The 6-card Senior/Lead grids already had this. The comment still says "Seven cards". |

## B. Theme (Gruvbox Light) — measured in the browser

| # | Sev | Defect → fix |
|---|---|---|
| T1 | P2 | Gruvbox Light reuses the dark Gruvbox ramp. `zinc-500` `#928374` on `#fbf1c7` is **3.24:1** (meta text, "1 of 38", Skip, captions). Category badges (zinc-500 on zinc-100) are **2.68:1**. `zinc-600` `#7c6f64` is 4.29:1 (blurbs). The focus ring `emerald-500` `#b8bb26` is about 1.8:1. → Add a `[data-theme='gruvbox-light']`-only block: zinc-500 `#665c54` (5.74 / 4.75 on the badge), zinc-600 `#504945` (7.78), emerald-500 `#79740e`. |
| T2 | P2 | There is no `--color-amber-700` for gruvbox-light, so the "OK" rating, pad warnings and draft-save errors fall back to Tailwind's orange (off-palette, about 4.4:1). → Add amber-700 `#7a4a05` (or Gruvbox `#b57614`, after checking its contrast). |

## C. Question bank — 36 errors, 4 files of duplicates

### hm.ts (hiring manager)
- **hm-054 L1101** — The code throws on every click (`rows[rows.length].id`). The question says it "opens the wrong panel". Fix the premise.
- **hm-026 L475/482** — Says error boundaries don't catch errors in effects. They do. What they miss: event handlers, async code, SSR, and errors in the boundary itself.
- **hm-023 L414/421** — useDeferredValue is from React 18, not 19 (19 only added `initialValue`).
- **hm-094 L1993** — TypeScript has no per-file strict mode (use typescript-strict-plugin or split tsconfigs). Since TS 6.0, `strict` is on by default; mention it here and in hm-027.
- **hm-085 L1617** — The default SameSite=Lax is Chromium-only. Also mention that SameSite works per site, not per origin (sibling subdomains).
- **hm-107 L1724** — UK: the Data (Use and Access) Act 2025 exempts first-party analytics from consent (since Feb 2026).
- **hm-111 L131/138** — EventSource can't send an Authorization header. `bufferedAmount` measures outbound data only.
- **hm-005 L52** — Router loaders don't dedupe or revalidate; only TanStack Query and RTK Query do.
- **hm-093 L1974** — `satisfies` *can* change inference (it applies a contextual type).
- **hm-042/048 L890/951** — §26 BDSG is weakened by CJEU C-34/21; rely on Art. 6 GDPR.
- **hm-059 L1228** — setTimeout doesn't guarantee a frame in between; rAF does.
- **hm-110 L1741** — "CORS protects the server from nothing" holds for simple requests only; preflight does protect servers.
- *Optional:* hm-086 L1638 — cite RFC 10017 (BCP 212, Aug 2026).
- Answer text repeated in `deeper`: hm-113, hm-103, hm-108, hm-109.

### backend.ts / coding.ts
- **coding-048 L1017** — IntersectionObserver does *not* re-fire while the sentinel stays visible, so the real bug is a stall, not a storm.
- **coding-042 L819/829** — The answer includes the root and returns siblings in reverse order; push children in reverse, as coding-044 does.
- **coding-028 L397-408** — Recommends AbortController, but `fetchSuggestions(q)` takes no `signal`.
- **coding-031 L493/499** — APG: the panel gets `tabindex=0` when its *first* content element isn't focusable, not "never if it contains a link".
- **coding-038 L703/710** — Retrying non-idempotent POSTs duplicates side effects. Retry only idempotent requests or those carrying an Idempotency-Key.
- **backend-009 L168** — Postgres 18: `NOT NULL ... NOT VALID` plus `VALIDATE`. Also drop the helper CHECK afterwards.
- **backend-003 L54** — `Deprecation` header (RFC 9745) vs `Sunset` (RFC 8594).
- **backend-026 L508** — Go 1.25 `wg.Go`. The loop-var fix depends on the `go.mod` go version, not the toolchain.
- **backend-039 L848** — Plain `queueMicrotask` under-batches nested resolvers; DataLoader waits until after promise jobs.
- **backend-033 L684** — A token bucket needs Lua or a Redis Function; INCR gives a fixed window.
- All six backend pads: the `// expect:` outputs were traced and are correct.

### design / case / debrief / arch
- **design-021 L212/222** — Unmounting does *not* stop camera tracks or revoke object URLs. Cleanup is still needed.
- **debrief-016 L293** — WCAG 2.2 via EN 301 549 v4.1.1 isn't cited in the OJEU yet; 2.1 AA is the floor today.
- **debrief-015 L272 / hm-083** — React 19 blocks `javascript:` URLs; the remaining risks are data: URLs and raw DOM APIs.
- **arch-024 L453** — `require(esm)` is stable in every supported Node line; ESM-only is a viable default.
- **case-010 L181** — `use()` needs a cached or stable promise, not one created in render.
- **arch-006 L109** — The upgrade order is muddled; widen the shared libs' peer range first.
- **design-030 L569** — Radix and Headless UI are components, not hooks.
- *Minor:* design-029 — analytics vendors may be controllers, not just processors.
- Answer repeated in `deeper`: design-007 L340, design-011 L431.

### hr.ts / hoe.ts / lead.ts
- **hr-039 L531/542** — §15(4) TzBfG, not §15(3) (renumbered in 2022).
- **hr-035 L511** — "zu unserer Zufriedenheit" is grade 4 (below average), not average.
- **hr-027 L280** — §19a(4a) EStG: with the employer liability declaration, leaving the job or the 15-year limit no longer triggers tax.
- **hoe-007 L133-145** — The AI Act Omnibus (Reg. 2026/1744) moved Annex III to Dec 2027. Art. 4 binds providers and deployers, not staff.
- **hoe-006/007 L114/136** — §26 BDSG after C-34/21 (the same paragraph appears in both).
- **hr-013/014 L221/238** — Germany missed the 7 June 2026 Pay Transparency deadline, so the pay-history ban isn't enforceable yet.

### Duplicates (merge or differentiate)
- design-010 ≈ arch-009 (breaking design-system rollout); arch-001 ≈ arch-030 (platform vs team).
- arch-023 ≈ design-027 ≈ hm-001 (micro-frontends).
- lead-011 ≈ lead-026 (hiring loop); lead-014 ≈ lead-030; lead-013's follow-up = lead-029.
- hoe-024 ≈ hoe-035.
- Partial overlaps with hm (ADRs, payments, i18n, XSS, SSE) — fine if deliberate.

## D. Over-engineering — curated

Taken from the over-engineering pass, minus suggestions that would undo earlier
a11y decisions (the RoundView tablist stays).

| # | Cut | Saves |
|---|---|---|
| O1 | **Focus sound** (`useFocusSound.ts`, Settings section, tests). It's unrelated to interview prep. *Product call.* If it stays, C1 still applies. | ~190 + ~175 test |
| O2 | Four one-call wrapper hooks (`useStrictMode`, `useShortcuts`, `useLoopDate`, `useRole`) and their four near-identical tests → one `prefs.ts` plus one table-driven test | ~145 |
| O3 | Nine one-line wrappers in `lap.ts` / `drafts.ts` → call `keyedStore` methods directly | ~25 |
| O4 | Settings outside-click and Escape listener → native `popover` / `popovertarget` | ~20 |
| O5 | MockSession recount duplicates `ratedThisSession` | ~10 |
| O6 | Duplicate console forwarding in `worker.ts` / `sandbox/main.tsx` → one helper | ~10 |
| O7 | Unreachable "Round not found" / "No design prompts" branches; speculative key-change throw in `useDraft` | ~18 |
| O8 | Unused interfaces (`KeyedStore`, `RoleQuestions`), dead `export`s, unused CSS vars and selectors, three `plural` copies, a hand-rolled group-by / Set | ~35 |

## E. Stale docs

- The full-stack spec still lists the LRU and retry pads (now a batcher and a circuit breaker).
- README:71-72 Technical rounds list omits arch and backend.
- `data.test.ts:162` says "retry"; `drafts.ts:14` says "21 scratch questions" (there are 27).
- Backend ids skip 034/035; harmless, but add a comment or renumber.

## Not findings
- The main bundle is 888 KB / 290 KB gzip, almost all question text. That's fine for an offline PWA.
- Role scoping, the 23 `fs-staff` tags, route guard, export compatibility and sandbox isolation were all checked and are clean.
