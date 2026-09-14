# UI/UX and System Design Review, third pass

**Date:** 2026-09-14
**Scope:** Delta since the second review (`c8cff85`), as of `de2371a` (main): the
review-2 fixes (PR 50), the status filter with Unseen (PR 51) and multi-role support
(PR 52 — role catalogue, `forRole` selector, role switcher, role-prefixed lap keys,
Lead and Architect rounds, the tagging pass). Plus a re-sweep of the rest. UI half
driven live in the browser: desktop and 375×812, dark and Light, Staff and Lead roles,
Home, a round, the Lead round, Search, Mock session, the 45-min tab. System-design
half judged against the same constraints as before: single-user, static, localStorage
only, one bundle, GitHub Pages.
**Deliverable:** Report, then fixes in the same PR. **Status:** everything below is
fixed in this branch. Review 2's U10 (form controls under 16px on a real iPhone) is
still unverified and still needs a device.

## Verdict

No P1, no P2. Lint is clean, 385 tests and the build are green. The multi-role work
landed inside the shapes the earlier reviews called right-sized — one data catalogue,
one memoised selector, one prop, one `useStoredValue` preference — and its risky
corners are each pinned by a test: the round-hash guard, the tab title under that
guard, the design-session clear, per-role lap keys, per-role mock order, tagged
questions, the lap cap recomputed for the largest role.

What is left is P3: three small layout defects the new `Select` component introduced
(a shared control that owns its own outer margin), two copy lines that stopped being
true once the app had roles, a mock-preset blurb that clamps mid-word on a phone, the
bundle crossing the warning limit set two reviews ago, one dead accessor that is now a
trap, and one pure function without a table test.

Verified to work, so nobody re-checks: switching to Lead on Home re-scopes the cards
(six, Round 5 is the Tech lead round), the subtitle, the hiring-manager count (91, the
eight platform-scope tags gone) and the design count (19); the Lead round renders its
content with bracket slots and follow-ups, and Reveal, key points, rating and note all
work; Lead's Full loop is 23 questions and opens on "Round 1 of 6 — HR screen"; the
45-min tab picks from the 19 scoped prompts; the round header at 375px puts each
select on its own line with nothing truncated; Light theme paints the two selects with
the page's text colour on a transparent box; no console errors on any route visited;
no employer or personal strings in the two new data files.

## UI/UX findings

### P3

**U1. The status filter's default reads "All questions" next to "All categories".**
`STATUS_OPTIONS[0]` (`src/components/Select.tsx:45`). Beside the category select the
two defaults look like two scopes, and on Search — where the status select sits alone
above the search box — "All questions" reads as a description of the page, not a
filter you can open. The options inside are statuses (Unseen, Weak, OK, Solid), so the
default should name the axis.
*Fix:* "Any status".

**U2. The Role select sits 4.5px above the Loop date input.** Measured on desktop:
date input top 168.5, select top 164.0. `Select` bakes `mb-2` into its wrapper
(`Select.tsx:22`) — 9px at the 18px root — and Home's row is `items-center`, so the
select's box plus its margin is what gets centred, and the control rides 4.5px high.
The margin was put there for RoundView, where the selects need to lift off the
tablist's bottom border; Search inherited it as the gap above the search box; Home
got it as a misalignment. A shared control should not own its outer margin.
*Fix:* drop `mb-2` from `Select`; RoundView's select row takes `mb-2`, Search passes
`className="mb-2"`, Home passes nothing. Re-measured: offset 0 on desktop, and the
phone round header is 9px shorter (the gap between the two stacked selects was margin
plus gap; now it is just the gap).

**U3. The Role select has no visible label.** Loop date has one; Role has only an
`aria-label`. Visually it is a bare box reading "Staff frontend" beside the date, and
its job is not obvious until you open it — the subtitle two lines up already says
"Staff frontend · Berlin / EU loop", so the box reads as a repeat rather than a
control. Screen-reader users are fine (`getByLabelText('Role')` passes).
*Fix:* `Select` takes an optional `id`; Home renders `<label htmlFor>Role</label>`
before it, same treatment as Loop date. Each label is grouped with its control in a
non-wrapping span: the first attempt left "Role" stranded at the end of line one at
375px with its select alone on line two.

**U4. Mock preset blurb clamps mid-word on a phone.** "Hiring manager, live coding or
architecture, and system desig…" at 375px. `line-clamp-2` on the preset blurb
(`src/components/MockSession.tsx:116`) — the same clamp review 1 removed from Home's
round cards (U8) for the same reason. The blurb also got longer and vaguer in PR 52
("live coding or architecture") because one static string now has to describe four
roles' technical rounds.
*Fix:* drop the clamp, and derive the Technical blurb from the active role's rounds
that the composition actually touches ("Hiring manager · Live coding · Frontend
system design" for Lead, "… · Architecture deep-dive · …" for Architect). Full loop
keeps its static line.

**U5. Copy that stopped being true with roles.** Home's Search row says "Every
question, every round" (`Home.tsx:131`); Search says "Every question, every round, in
one search." (`SearchView.tsx:22`); Weak drill says "across every round"
(`WeakDrill.tsx:22`). All three are scoped to the active role's loop now, and the
README already says so. `index.html`'s meta description lists seven rounds and omits
the two new ones.
*Fix:* "in your loop" on the three lines, the two rounds in the meta description.

## System-design findings

Lens unchanged. The delta is the largest since the first review and it stayed inside
the existing shapes:

- **Role catalogue as data, questions opt out by tag.** `roles: Role[]` with an
  ordered `rounds` list per role; a question carries `roles?: RoleId[]` only when a
  shared round contains something one role should not see. 23 tags in 355 questions
  (12 in the hiring-manager round, 11 in design), inside the spec's 20–30 estimate.
  Round membership does the rest. The tag is an allow-list, so a fifth role means
  auditing all 23 — the spec chose that over a level ordering because Lead and
  Architect are lateral to Staff, and that reasoning still holds; noting it so the
  cost is known before anyone adds a role.
- **One memoised selector.** `forRole(id)` builds `{ role, rounds, questions,
  byRound }` once per role from the static bank and every view calls it. No context,
  no store: the role rides one prop from `App`, exactly like strict mode.
- **The device-preference class absorbed the role without a new mechanism.**
  `useRole` is `useStoredValue` with a validating decode and a default that is never
  written, so a fresh device and a blocked storage both land on Staff — the loop
  every existing user already had.
- **Lap keys gained a role prefix.** Two roles filtering one round to the same
  length and endpoints would otherwise have shared a lap slot. The cost was a
  one-time reset of every in-progress lap on upgrade (old-format keys never match
  again); they sit in the store until the recency cap evicts them. Shipped, harmless,
  not worth a migration.
- **Every scoping decision is pinned.** A round hash outside the loop renders Home
  *and* keeps Home's title; a stored design session on a prompt the role cannot see is
  cleared; Senior's Full loop has no HoE slice; Lead's Full loop puts the Tech lead
  round before HoE; the same question set under two roles produces two lap keys; the
  lap cap is recomputed for whichever role has the most sets.

### P3

**S1. `Select` owns layout it should not** — see U2. Listed here because it is the
kind of thing that recurs: a component extracted from one call site (RoundView) kept
that call site's margin, and the next two call sites paid for it. The fix is the
usual one — margin at the call site, not in the control.

**S2. The bundle crossed the warning limit set in review 1.** Build today: 1,033 KB
raw / 333 KB gzip. `chunkSizeWarningLimit: 1000` (`vite.config.ts:10`) was set to
silence the >500 KB warning for a deliberate single bundle; sixty new questions pushed
it over, so the warning is back on every build and the README's "~300KB gzipped" is
now 333. The natural seam is now visible — a role sees at most seven of nine rounds,
so per-role data chunks would drop up to two rounds' text from the initial load — but
that is at most 2/9 of the bank for a single-user app run from a laptop, and the README's
trade-off paragraph still applies.
*Fix:* limit to 1500 (headroom for the same growth again), README to ~330KB.

**S3. `questionsByRound` is an unscoped accessor with no app callers.** After PR 52
every component reads through `forRole(role).byRound`; the global
`questionsByRound` (`src/data/index.ts:33`) and the `byRound` map that feeds it are
used only by three test files. Left exported beside the scoped one it is a trap: the
next component that reaches for it shows another role's questions and nothing fails.
*Fix:* delete it; the tests read `forRole('staff').byRound(...)`, which for every
round is the same list (every tag includes Staff).

**S4. `filterByStatus` has no table test.** Every other pure function in
`src/lib/queue.ts` — `orderQueue`, `nextQuestion`, `roundStats`, `categoryVerdict` —
has one in `queue.test.ts`; the new one is covered only through RoundView and Search
component tests, which exercise Unseen and nothing else. The interesting case is
the one the comment promises: a decayed Solid filters as OK.
*Fix:* one describe block, four cases.

## Not findings (checked, fine)

- Two selects stack on a phone because the category select is as wide as its widest
  option (317px on the hiring-manager round; "Architecture & system design"). Letting
  it shrink brings back review 1's "All ca" truncation; stacking is the right
  behaviour. U2 takes 9px off the stack.
- Switching role clears a stored 45-min session whose prompt the new role cannot see.
  By design (spec §3); it only bites if you switch roles mid-session, and the scratch
  pad survives (drafts are keyed by question id, not by role).
- The role is set on Home only, so it cannot change under an open round, lap, mock
  session or design session. A round view does not name the active role; the counts
  differ (91 vs 99 on hiring manager) but the title does not. Fine for a per-device
  setting that changes once.
- Ratings, notes and stories on questions outside the active loop stay in progress
  and in the backup; they are just not listed. Home's weak/noted counts, Weak drill,
  Notes, Print and Search all scope the same way, so nothing disagrees with anything.
- Navigating away from a mock session mid-lap keeps its lap and baseline on purpose
  (re-picking the preset resumes); Finish and Back to presets clear both.
- The two new rounds: 30 questions each, six categories of five, every question with
  follow-ups and bracket slots, all inside the spoken-word budget, no `deeper` (only
  HoE uses it), no scratch or code (none expected). The Lead round's People & growth
  and Conflict & stakeholders categories offer the story bank pre-reveal.
- Light theme on the selects: text at the page's zinc-900, transparent box, zinc-200
  border, chevron at 60% of the text colour. Dark and Gruvbox unchanged.
- `Practice` and `QuestionCard` keep the global `rounds` for title and target lookup
  by id, as the spec said; they never enumerate.
- `App` still imports `ROUND_IDS` for `titleFor`, which has to resolve any catalogue
  round's title regardless of role. Not dead.

## Suggested order if acting

1. U2/S1 + U3 — `Select` margin out, `id` in, label on Home. One component, three call
   sites.
2. U1 — one string.
3. U4 — drop the clamp, derive the Technical blurb.
4. U5 — four copy lines, one README line.
5. S2 — one constant, one README number.
6. S3 — delete the accessor, point three tests at `forRole`.
7. S4 — one describe block.
8. Review 2's U10 — still needs a real iPhone.
