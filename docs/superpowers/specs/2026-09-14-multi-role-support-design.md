# Multi-role support: Senior, Staff, Lead, Architect

**Date:** 2026-09-14
**Status:** approved design, awaiting implementation plan

## Goal

Let the app drill interview loops for four frontend roles, not just staff:
Senior frontend engineer, Staff frontend engineer, Lead frontend engineer, and
Frontend architect. HR screen and Head of engineering are shared across loops;
the technical rounds differ per role.

## Decisions made during brainstorming

1. **Shared rounds plus role-specific ones.** Every role has an HR screen. The
   technical rounds vary. HoE appears in every loop except Senior.
2. **Shared question bank, per-role rounds.** One bank, one id space. A role
   chooses which rounds it has and in what order; a question can opt out of
   roles that should not see it.
3. **One active role at a time.** Progress, notes and stories stay keyed by
   question id and carry across roles. One loop date. The role is a per-device
   preference.
4. **Loops proposed by Claude, accepted by the user** (table below).

## Non-goals

- Per-role progress, per-role loop date, per-role readiness.
- Per-role round titles or target times.
- A level ordering (min-level). Lead and Architect are lateral to Staff, so a
  question's role tag is a plain set.
- Separate builds or URLs per role.
- React context for the role. One prop through `App`, like theme and strict mode.

## 1. Data model and role catalogue

### Types (`src/types.ts`)

```ts
export type RoundId = 'hr' | 'hm' | 'coding' | 'design' | 'case' | 'debrief' | 'hoe' | 'lead' | 'arch';
export type RoleId = 'senior' | 'staff' | 'lead' | 'architect';
export interface Role { id: RoleId; title: string; blurb: string; rounds: RoundId[] }
export interface Question {
  // ...existing fields...
  /** Roles that see this question. Absent = every role whose loop includes q.round. */
  roles?: RoleId[];
}
```

`Round`, `Persisted`, `Progress`, `Notes`, `Stories` are unchanged. The export
format is unchanged.

### Roles (`src/data/roles.ts`, new)

Exports `ROLE_IDS`, `roles: Role[]`, `DEFAULT_ROLE = 'staff'`.

| Role id | Title | Rounds, in loop order |
|---|---|---|
| `senior` | Senior frontend | hr, hm, coding, design, case, debrief |
| `staff` | Staff frontend | hr, hm, coding, design, case, debrief, hoe |
| `lead` | Lead frontend | hr, hm, coding, design, lead, hoe |
| `architect` | Frontend architect | hr, hm, arch, design, case, debrief, hoe |

Order within a loop comes from the role's `rounds` array, never from
`ROUND_IDS`.

### Round catalogue (`src/data/index.ts`)

Two new rounds:

| id | Title | targetSeconds | Covers |
|---|---|---|---|
| `lead` | Tech lead round | 150 | People management, delivery, hiring, conflict, running a team's technical direction |
| `arch` | Architecture deep-dive | 240 | Cross-team platform decisions, migration strategy, ADRs, design-system governance, build/runtime architecture |

Two new data files, `src/data/lead.ts` and `src/data/arch.ts`, ids `lead-nnn`
and `arch-nnn`, same shape as the rest of the bank.

`STORY_CATEGORIES` stays global and gains the two lead categories that call for
a story (see section 4).

## 2. Role-scoped selector and call sites

### Selector (`src/data/index.ts`)

```ts
export function forRole(id: RoleId): {
  role: Role;
  rounds: Round[];                 // catalogue entries, in the role's order
  questions: Question[];           // round in role.rounds AND (roles absent OR includes id)
  byRound(r: RoundId): Question[]; // same filter, one round
}
```

Memoised per role id at module load. The bank is static, so components call it
freely.

### Plumbing

`App.tsx` reads the active role from `useRole()` once and passes `role` down as
a prop, the same way `strictMode` travels today. No context.

### Call sites (the twelve `../data` imports)

| Component | Change |
|---|---|
| Home, WeakDrill, SearchView, NotesView, PrintView | Use scoped `questions` and `rounds`. These views show only the active role's material. A rating on a hidden question still exists in progress; it is simply not listed. |
| RoundView, DesignSession | Use scoped `byRound`. The design-prompt tab stays keyed on `roundId === 'design'`; every role has that round. |
| Practice, QuestionCard | Keep the global `rounds`. They only look up a round's title and target by id. |
| MockSession | Presets unchanged in shape; compositions gain `arch: 3` and `lead: 3`. `buildSet` skips any round not in the role's loop and pulls from scoped `byRound`. Senior's Full loop has no HoE slice; Architect's gets an arch slice. No per-role preset table. |
| App | Round-route guard uses the role's rounds, not `ROUND_IDS`. A hash for a round outside the loop (e.g. `#hoe` while Senior is active) renders Home. |
| useHashRoute | Unchanged. It keeps accepting every catalogue id; the guard lives in App. |

## 3. Per-device state and lap keys

### Active role (`src/hooks/useRole.ts`, new)

Built on `useStoredValue`, key `interview-prep:role`. Decode validates the raw
string against `ROLE_IDS` and falls back to `staff`. Missing, blocked or garbage
storage gives every existing user the loop they have today. It is a device
preference: outside the export, untouched by Reset progress, not versioned.

### Switcher

A `Select` on Home beside the Loop date, showing role titles. Home is the only
place it appears, so a role can never change underneath an open round, lap,
mock session or design session.

### Loop date

Single value, unchanged. Readiness on Home is computed over scoped questions.

### Laps and baselines (`src/lib/lap.ts`)

`lapKey` becomes `lapKey(role: RoleId, questions: Question[])` and prefixes the
existing `length:first:last` heuristic with the role id. Two roles filtering the
same round can otherwise collide when the tag filter only removes middle
questions. Two call sites: Practice and MockSession.

The `MAX_LAPS` cap test in `data.test.ts` is recomputed per role and asserts
the cap exceeds the largest single role's possible-set count. Only one role's
sets are live at a time; evicting a dormant role's laps is acceptable.

### Design session

The single `current` slot stores a question id. If that id is not in the active
role's scoped design questions, the session is treated as absent and cleared.
One guard, no new key.

### Unchanged

Drafts, notes, stories, progress: keyed by question id or independent of
questions.

## 4. Content, copy, tests

### New rounds, ~30 questions each

Same shape and rules as the existing bank: three-bullet spoken answer inside the
round's word budget (130 wpm x targetSeconds), key points, follow-ups, `deeper`
for probe material, `[bracket slots]` for the candidate's own stories. No
employer facts, no personal specifics.

- `lead.ts` categories: People & growth, Delivery & process, Hiring & team
  shape, Technical direction, Conflict & stakeholders, Running the round.
- `arch.ts` categories: Cross-team platform, Migration strategy, Decision
  records & governance, Design-system ownership, Build & runtime architecture,
  Trade-off probes.

`STORY_CATEGORIES` gains People & growth and Conflict & stakeholders.

### Tagging pass on the existing bank

Round membership does most of the work. Tags are only for questions inside a
shared round that assume a scope one role does not have. Rule, applied by hand
and listed in the PR description for review:

- HM questions in Leadership & influence, Org & impact, Vision & strategy that
  presume org-wide or multi-team ownership: `roles: ['staff', 'lead', 'architect']`.
- Platform & scale and Architecture & system design questions that presume
  owning a platform: `roles: ['staff', 'architect']`.
- Everything else stays untagged.

Expected volume: roughly 20 to 30 tags.

### Copy

- Home subtitle: active role title + " · Berlin / EU loop".
- `index.html` meta description drops "staff".
- README: role table, a line on the switcher under Ways to drill, the two new
  rounds in the Rounds list, updated question count (checked by
  `static.test.ts`), one sentence on the `roles` tag under Adding questions.

### Tests

| File | Asserts |
|---|---|
| `data.test.ts` | Every role's `rounds` is non-empty, contains `hr`, references only catalogue ids. Every `roles` tag holds valid ids. Floors for `lead` and `arch`. `MAX_LAPS` cap recomputed per role. |
| `roles.test.ts` (new) | `forRole`: round order follows the role; untagged questions appear wherever their round does; tagged questions appear only for listed roles. |
| `useRole.test.ts` (new) | Decode falls back to `staff` on null and garbage. |
| `App.test.tsx` | A round hash outside the active role renders Home. |
| `Home.test.tsx` | Switcher changes the card list and readiness counts. |
| `MockSession.test.tsx` | Senior's Full loop contains no HoE questions. |
| `Practice.test.tsx` | Same question set under two roles produces two lap keys. |

## Implementation sequence

Each step ships green on its own, with `staff` as default so nothing visible
changes until the switcher lands.

1. Types, role catalogue, two new round entries (empty data files).
2. `forRole` and the twelve call sites, guard in App.
3. `useRole` hook and Home switcher.
4. `lapKey` role prefix and design-session guard.
5. `lead.ts` and `arch.ts` content.
6. Tagging pass.
7. Copy and README.
