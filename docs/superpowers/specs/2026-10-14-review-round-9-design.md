# Review, ninth pass: content, UX and theming

**Date:** 2026-10-14
**Scope:** The whole app as of `5b21425` (main), with three focuses: content, UX and theming.
- Fact-check of the 31 questions added since round 8: hm-124…147, coding-049, lead-031/032, hoe-036…039.
- A sweep of the whole bank for stale claims, contradictions and README drift.
- A browser pass in all four themes at 1280px and 375px, with contrast measured on every visible text node.

**Baseline:**
- `data.test.ts` and `roles.test.ts` pass (44/44).
- No P1 content errors.
- No contrast failures on Home.
- No horizontal overflow at 375px.

**Decided with Namit (2026-10-14):**
- Scrub the public surfaces. The question content stays.
- Add a System theme.
- Fix the HM blurb only; no round split.
- This report comes first, and fixes land on approval as one commit.

**Status (2026-10-14):** every row landed, with these notes.
- hm-143/144/145 are now frontend-only. `roles.test.ts` excludes them by name from its rule that full-stack loops see the frontend loop plus backend.
- After the fixes, category-badge contrast is 5.32:1 on Gruvbox and 7.02:1 on Light.
- The bundle re-measures at ~425KB.
- Tests (540), typecheck, lint and smoke all pass.

Severity: P1 broken · P2 real issue · P3 polish.

---

## A. Decisions

| # | Where | Change |
|---|---|---|
| X1 | `README.md:4`, `Home.tsx:96`, GitHub repo description | Remove "Berlin / EU". The README intro and the Home subtitle become role-only, e.g. "Staff frontend loop". The repo description is also stale: it says 355 questions, nine rounds and four loops, against 461 questions, eleven rounds and six loops today. Rewrite it neutrally with `gh repo edit --description`. `gradingPrompt` (`QuestionCard.tsx:41`) only goes to the clipboard and never gets published, so it can keep "Berlin". |
| X2 | `useTheme.ts`, `ThemeToggle.tsx`, `index.html:2,12,15-19`, `index.css` | Add `system` and make it the default. It resolves to `gruvbox` or `gruvbox-light` from `prefers-color-scheme`, matching the portfolio, and follows OS changes live. Store nothing for `system`, so the raw stored value decides. The pre-paint script needs the same resolution, and `theme-color` must follow the resolved theme. The toggle becomes 5 options; check that they still fit the 288px popover grid. |
| X3 | `data/index.ts:21` | The HM blurb only covers 3 of its 20 categories. Proposal: "Web platform depth (CSS, a11y, security, performance, TS), architecture, delivery, situational and staff-scope stories." |

## B. UX and theming

| # | Sev | Where | Defect → fix |
|---|---|---|---|
| U1 | P2 | `index.css:117` | The root font is 18px at every width, so a phone answer runs about 30 characters a line: one HM answer is about 70 lines at 375px. The portfolio already fixed this with 16px below `40rem`. → Use the same rule: `html { font-size: 100% }`, and `112.5%` from `40rem` up. |
| U2 | P3 | Category badge (QuestionCard meta) | Small text below AA: 4.17:1 on Gruvbox (zinc-400 on zinc-800) and 4.39:1 on Light (zinc-500 on zinc-100). → Use one step stronger text on the badge, `text-zinc-600 dark:text-zinc-300`. |
| U3 | P3 | `data/roles.ts` `Role.blurb` | Role blurbs never render, and "The original loop" is commit history, not copy. → Delete the field (ponytail). Or show it under the Role select, but nothing there needs it. |

## C. Content: the 31 new questions

No P1 issues. Clean: hm-129/130/133/134/135/138/139/141/142/146/147, coding-049, lead-031, and hoe-036/037/038.

| id | Sev | Defect → fix |
|---|---|---|
| hm-124 `hm.ts:2344,2350` | P2 | Says EN 301 549 "points at WCAG 2.1 AA". It contradicts hm-022's deeper (`hm.ts:406`). V4.1.1, which moves to WCAG 2.2 AA, was published on 2 Sep 2026, and its Official Journal citation is expected in Dec 2026. → Use hm-022's wording, and change the keyPoint too. ([Deque](https://www.deque.com/blog/en-301-549-v4-1-1-is-final-what-changed-what-it-means-and-what-you-should-do/)) |
| hm-137 `hm.ts:2626,2633` | P2 | "Set the heap size or the kernel kills the pod before GC reacts" gives the wrong reason. Node sizes its heap from the cgroup limit, conservatively. OOM kills are usually off-heap memory. → Set `--max-old-space-size` to about 70–80% of the limit to leave headroom. Exit 137 is the container killing it; "heap out of memory" is V8 hitting its own limit. ([Red Hat](https://developers.redhat.com/articles/2025/10/10/nodejs-20-memory-management-containers)) |
| lead-032 `lead.ts:589-596` | P2 | Cites METR 2025 but not the Feb 2026 update, which says speed-ups are likely larger now but can't be measured reliably. It also uses old DORA names. → Frame the study as early-2025 evidence of perception diverging from measurement, and add the update in one clause. Rename "time to restore" to "failed deployment recovery time" and mention the five metrics. ([METR](https://metr.org/blog/2026-02-24-uplift-update/), [DORA](https://dora.dev/guides/dora-metrics/history/)) |
| hm-143/144/145 | P3 | Near-duplicates of backend-014 (HTTP caching), backend-002/029 (REST/GraphQL/BFF) and backend-030 (API contracts). fs-senior and fs-staff users drill both. → `roles: ['senior','staff','lead','architect']` on the three hm questions. |
| hm-131 `:2495` | P3 | The "check @scope support" caveat is stale. → "Baseline since Dec 2025 (Firefox 146)". |
| hm-127 `:2410` | P3 | Leaves out `closedby="any"` for light dismiss (Chrome 134+, Firefox 141+, not Safari). → Add one clause about it as progressive enhancement. |
| hm-140 `:2703,2710` | P3 | "In a background tab, 7 may not print at all" → "7 is deferred until the tab is visible" (rAF pauses). |
| hm-126 `:2387` | P3 | Polite announcements wait for the screen reader to go idle, not for the user to pause. |
| hm-125 `:2379` | P3 | Followup "why the heading, not `<main>`?" has no support. → Deeper: a heading gives a short, predictable announcement and a reading start point; focusing `<main>` reads out its whole content or nothing useful, depending on the screen reader. |
| hm-128 `:2441` | P3 | Followup "which WCAG criteria?" has no support. → Deeper: 3.3.1, 3.3.2, 3.3.3, 1.4.1, 1.3.5 and 4.1.3. |
| hm-132 `:2515` | P3 | The subgrid recipe leaves out `grid-row: span 3` on each card. |
| hm-136 `:2603` | P3 | Inline config script vs strict CSP. → Add "with a nonce or hash, or a JSON script tag the bundle reads". |
| hoe-039 `hoe.ts:726,732` | P3 | Uses "product teams"; the Team Topologies term is "stream-aligned teams". It also reuses design-027's six-teams-on-one-train example; swap in a different one. |

## D. Content: whole-bank sweep

No contradictions between questions. These still hold: Blue Card 2026 figures, Pay Transparency (Germany missed June 2026, law expected 2027), AI Omnibus, RFC 10017, the UK DUAA analytics exemption, TS 6 strict default, Next 16 `proxy`, React 19.2 and the BetrVG/KSchG references.

| Where | Sev | Defect → fix |
|---|---|---|
| hr-034 `hr.ts:494` (also hr-008 `:141`) | P3 | The spoken answer contains the placeholder "[check the current year's figure…]". → Deeper: "JAEG 2026 €77,400; 2027 pending". |
| hr-009 `hr.ts:159,170,171` | P3 | Gives only the 2026 Blue Card figure, though an offer signed now is filed in 2027. → Add the provisional 2027 figures (~€53,100 / ~€48,108.60). The answer says "around three years" and deeper says "at least three years in the last seven"; use the deeper wording in both. |
| design-006 `design.ts:139` | P3 | "v4.1.1 moves to WCAG 2.2 once cited" → v4.1.1 *is* on WCAG 2.2; the citation adds presumption of conformity. |
| hm-022, design-002/006/020/022, debrief-016 | P3 | Six answers say "cited around December 2026" and go stale within weeks. Re-check in Jan 2027. |
| backend-009 `backend.ts:170,177` | P3 | "on Postgres 18" → "Postgres 18+". |
| `hr.ts:425`, `design.ts:4` | P3 | Section count comments are off by one: German employment has 7, not 6; Product surfaces has 14, not 13. |
| All data files | P3 | British and US spellings are mixed (annualise/annualize, behaviour/behavior). → Make hr.ts consistent at least; British spelling matches the portfolio. |
| `README.md:27-30` | P3 | The HM list leaves out Architecture & system design, Performance, Testing & quality and React & data. The live-coding list leaves out Data structures & traversal. |
| `README.md:229` | P3 | "~385KB gzipped" → about 415KB now; re-measure after the build. |
| 34 answers (hm-100…114 among them) | P3 | They sit within 3% of the word cap, while hm's median is 228 of 325. They look trimmed to the test. Move material to `deeper` when each one is next edited; this needs no sweep. |

## Not changing
- The HR round's relocation and negotiation content: Namit chose to keep the question content (X1).
- The HM round split (X3).
- Gruvbox Light focus ring at `#79740e` (4.29:1, needs 3): fine.
