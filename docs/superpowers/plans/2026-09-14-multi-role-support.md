# Multi-role support (Senior, Staff, Lead, Architect) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the app drill interview loops for four frontend roles — Senior, Staff, Lead, Architect — sharing one question bank, with the active role a per-device preference and Staff as the unchanged default.

**Architecture:** Role is data (`src/data/roles.ts`), not a branch in the UI. A single memoised selector, `forRole(id)`, filters the existing global `rounds`/`questions` by the role's round list and by an optional `roles` tag on a question. `App.tsx` reads the active role once via a new `useRole` hook (same pattern as `useStrictMode`) and passes it down as a prop, never as context. Twelve existing `../data` import sites swap the global catalogue for the scoped one where the view is role-specific; three (`Practice`, `QuestionCard`, `useHashRoute`) stay global by design.

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-09-14-multi-role-support-design.md](../specs/2026-09-14-multi-role-support-design.md)

## Global Constraints

- Default role is `staff`; every step must leave `staff`'s behavior pixel-identical to today until the switcher lands (Task 3).
- No React context for role — it travels as a prop through `App`, exactly like `strictMode`.
- No per-role progress, notes, stories, loop date, or readiness. All of those stay keyed by question id or are global, unchanged.
- No level ordering — `RoleId` is a plain union, `roles: RoleId[]` on a question is a plain set.
- `npm test` and `npm run typecheck` must pass after every task.
- Every user-visible change (switcher, new rounds, copy) updates `README.md` in the same commit as the code that introduces it (Task 10).

---

## Task 1: Types and role catalogue

**Files:**
- Modify: `src/types.ts`
- Create: `src/data/roles.ts`
- Modify: `src/data/index.ts`
- Create: `src/data/lead.ts` (empty array, content in Task 8)
- Create: `src/data/arch.ts` (empty array, content in Task 8)
- Test: `src/__tests__/data.test.ts` (renamed from the plan's references to the existing `src/__tests__/data.test.ts`)
- Test: `src/data/roles.test.ts` (new)

**Interfaces:**
- Produces: `RoundId` (adds `'lead' | 'arch'`), `RoleId = 'senior' | 'staff' | 'lead' | 'architect'`, `Role { id: RoleId; title: string; blurb: string; rounds: RoundId[] }`, `Question.roles?: RoleId[]`.
- Produces: `ROLE_IDS: readonly RoleId[]`, `roles: Role[]`, `DEFAULT_ROLE: RoleId`, both from `src/data/roles.ts`.
- Produces: `ROUND_IDS` extended to include `'lead'` and `'arch'`, two new `Round` catalogue entries, `lead: Question[]` and `arch: Question[]` exports (empty for now) concatenated into `questions`.

- [ ] **Step 1: Add `RoleId`, `Role`, and the `roles` tag to `src/types.ts`**

Edit `src/types.ts`:

```ts
export type RoundId = 'hr' | 'hm' | 'coding' | 'design' | 'case' | 'debrief' | 'hoe' | 'lead' | 'arch';
export type Route = RoundId | 'weak' | 'notes' | 'stories' | 'mock' | 'search' | 'print';
export type RoleId = 'senior' | 'staff' | 'lead' | 'architect';
export interface Role { id: RoleId; title: string; blurb: string; rounds: RoundId[] }
export interface Round { id: RoundId; title: string; blurb: string; targetSeconds: number }
export interface Question {
  id: string; round: RoundId; category: string; question: string; code?: string; scratch?: true;
  answer: string[]; keyPoints: string[]; followUps?: string[];
  deeper?: string[];
  /** Roles that see this question. Absent = every role whose loop includes q.round. */
  roles?: RoleId[];
}
```

(Only the additions: `RoleId`, `Role`, and the `roles` field on `Question`. `Rating`, `ProgressEntry`, `Progress`, `Notes`, `Story`, `Stories`, `Persisted` are unchanged.)

- [ ] **Step 2: Create empty data files for the two new rounds**

Create `src/data/lead.ts`:

```ts
import type { Question } from '../types';

export const lead: Question[] = [];
```

Create `src/data/arch.ts`:

```ts
import type { Question } from '../types';

export const arch: Question[] = [];
```

- [ ] **Step 3: Wire the two new rounds into the catalogue**

Edit `src/data/index.ts`:

```ts
import type { Question, Round, RoundId, Route } from '../types';
import { hr } from './hr';
import { hm } from './hm';
import { coding } from './coding';
import { design } from './design';
import { caseStudy } from './case';
import { debrief } from './debrief';
import { hoe } from './hoe';
import { lead } from './lead';
import { arch } from './arch';

export const ROUND_IDS = ['hr', 'hm', 'coding', 'design', 'case', 'debrief', 'hoe', 'lead', 'arch'] as const satisfies readonly RoundId[];

export const ROUTES = [...ROUND_IDS, 'weak', 'notes', 'stories', 'mock', 'search', 'print'] as const satisfies readonly Route[];

export const rounds: Round[] = [
  { id: 'hr', title: 'HR screen', blurb: 'Motivation, logistics, compensation framing, German employment basics.', targetSeconds: 90 },
  { id: 'hm', title: 'Hiring manager', blurb: 'Live code review on HTML, CSS and JS, situational judgement, and staff-scope stories.', targetSeconds: 150 },
  { id: 'coding', title: 'Live coding', blurb: 'Pairing on a build, debugging unfamiliar code, and reviewing a PR out loud.', targetSeconds: 180 },
  { id: 'design', title: 'Frontend system design', blurb: 'One prompt, 45 minutes: requirements, architecture, trade-offs, out loud.', targetSeconds: 300 },
  { id: 'case', title: 'Case study', blurb: 'Scoping, building and presenting the take-home.', targetSeconds: 150 },
  { id: 'debrief', title: 'Case study debrief', blurb: 'The panel grills your trade-offs, edge cases and what you would change.', targetSeconds: 120 },
  { id: 'hoe', title: 'Head of engineering', blurb: 'Vision, org impact, culture, and the questions you ask them.', targetSeconds: 150 },
  { id: 'lead', title: 'Tech lead round', blurb: 'People management, delivery, hiring, conflict, and running a team\'s technical direction.', targetSeconds: 150 },
  { id: 'arch', title: 'Architecture deep-dive', blurb: 'Cross-team platform decisions, migration strategy, ADRs, design-system governance, build/runtime architecture.', targetSeconds: 240 },
];

export const questions: Question[] = [...hr, ...hm, ...coding, ...design, ...caseStudy, ...debrief, ...hoe, ...lead, ...arch];

const byRound = new Map<RoundId, Question[]>(ROUND_IDS.map((id) => [id, questions.filter((q) => q.round === id)]));

export function questionsByRound(id: RoundId): Question[] {
  return byRound.get(id) ?? [];
}

export const STORY_CATEGORIES: ReadonlySet<string> = new Set([
  'From your CV',
  'Motivation & fit',
  'Leadership & influence',
  'Situational',
  'Delivery & process',
  'Culture & values',
  'Org & impact',
  'Questions to ask them',
  'Vision & strategy',
  'People & growth',
  'Conflict & stakeholders',
]);

export const isStoryPrompt = (q: Question): boolean => STORY_CATEGORIES.has(q.category);
```

(`STORY_CATEGORIES` gains `'People & growth'` and `'Conflict & stakeholders'` here — those are two of the six `lead.ts` categories from Task 8's table; adding them now means Task 8's content needs no follow-up edit to this file.)

- [ ] **Step 4: Create the role catalogue**

Create `src/data/roles.ts`:

```ts
import type { Role, RoleId } from '../types';

export const ROLE_IDS = ['senior', 'staff', 'lead', 'architect'] as const satisfies readonly RoleId[];

export const roles: Role[] = [
  { id: 'senior', title: 'Senior frontend', blurb: 'Individual-contributor loop, no head-of-engineering round.', rounds: ['hr', 'hm', 'coding', 'design', 'case', 'debrief'] },
  { id: 'staff', title: 'Staff frontend', blurb: 'The original loop: seven rounds ending with head of engineering.', rounds: ['hr', 'hm', 'coding', 'design', 'case', 'debrief', 'hoe'] },
  { id: 'lead', title: 'Lead frontend', blurb: 'People and delivery scope in place of the case study.', rounds: ['hr', 'hm', 'coding', 'design', 'lead', 'hoe'] },
  { id: 'architect', title: 'Frontend architect', blurb: 'Architecture deep-dive in place of live coding.', rounds: ['hr', 'hm', 'arch', 'design', 'case', 'debrief', 'hoe'] },
];

export const DEFAULT_ROLE: RoleId = 'staff';
```

- [ ] **Step 4b: Write the failing test for the role catalogue**

Create `src/data/roles.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { ROUND_IDS } from './index';
import { DEFAULT_ROLE, ROLE_IDS, roles } from './roles';

describe('role catalogue', () => {
  test('every role has a non-empty rounds list that includes hr', () => {
    for (const role of roles) {
      expect(role.rounds.length, role.id).toBeGreaterThan(0);
      expect(role.rounds, role.id).toContain('hr');
    }
  });

  test('every role round references a real catalogue round', () => {
    for (const role of roles) {
      for (const r of role.rounds) expect(ROUND_IDS, `${role.id}:${r}`).toContain(r);
    }
  });

  test('hoe appears in every loop except senior', () => {
    for (const role of roles) {
      if (role.id === 'senior') expect(role.rounds).not.toContain('hoe');
      else expect(role.rounds, role.id).toContain('hoe');
    }
  });

  test('DEFAULT_ROLE is staff and is a valid role id', () => {
    expect(DEFAULT_ROLE).toBe('staff');
    expect(ROLE_IDS).toContain(DEFAULT_ROLE);
  });

  test('roles.map(id) matches ROLE_IDS', () => {
    expect(roles.map((r) => r.id).sort()).toEqual([...ROLE_IDS].sort());
  });
});
```

- [ ] **Step 5: Run the new test to verify it fails (roles.ts doesn't exist yet if steps run out of order) or passes (if run after step 4)**

Run: `npm test -- roles.test.ts`
Expected: PASS (steps 4 and 4b are written together above; if you're following strict red-green, write the test first, watch it fail on the missing module, then add roles.ts).

- [ ] **Step 6: Update `src/__tests__/data.test.ts` for the two new rounds and the `roles` tag**

Edit `src/__tests__/data.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { ROUND_IDS, STORY_CATEGORIES, questions, rounds } from '../data';
import { ROLE_IDS } from '../data/roles';
import { MAX_DRAFTS } from '../lib/drafts';
import { MAX_LAPS } from '../lib/lap';
import type { RoundId } from '../types';

const ID_RE = /^(hr|hm|coding|design|case|debrief|hoe|lead|arch)-\d{3}$/;
```

Change the min-count test:

```ts
  test('every round keeps at least its post-round-4 question count', () => {
    const min: Record<RoundId, number> = { hr: 36, hm: 99, coding: 35, design: 30, case: 30, debrief: 32, hoe: 33, lead: 30, arch: 30 };
    for (const id of ROUND_IDS) {
      expect(questions.filter((q) => q.round === id).length, id).toBeGreaterThanOrEqual(min[id]);
    }
  });
```

Add a new test for the `roles` tag, placed after `'every STORY_CATEGORIES entry matches at least one real question category'`:

```ts
  test('every roles tag holds only valid role ids and is non-empty when present', () => {
    for (const q of questions) {
      if (q.roles === undefined) continue;
      expect(q.roles.length, q.id).toBeGreaterThan(0);
      for (const r of q.roles) expect(ROLE_IDS, `${q.id}:${r}`).toContain(r);
    }
  });
```

Leave every other existing test in the file untouched — they already iterate `questions`/`ROUND_IDS` generically and will pass once `lead.ts`/`arch.ts` are populated in Task 8. The `MAX_LAPS` cap test is reworked in Task 6, not here.

- [ ] **Step 7: Run the full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: `lead`/`arch` question-count assertions FAIL (0 questions against a floor of 30) — expected until Task 8. Everything else PASSES. Confirm the failures are exactly the two new floor lines and nothing else broke.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/data/roles.ts src/data/roles.test.ts src/data/lead.ts src/data/arch.ts src/data/index.ts src/__tests__/data.test.ts
git commit -m "feat: add role types, role catalogue, and two empty round shells

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `forRole` selector

**Files:**
- Modify: `src/data/index.ts`
- Test: `src/data/roles.test.ts`

**Interfaces:**
- Consumes: `Role`, `RoleId`, `RoundId`, `Question`, `Round` from `../types`; `roles`, `DEFAULT_ROLE` from `./roles`; `rounds`, `questions` from this file.
- Produces: `forRole(id: RoleId): { role: Role; rounds: Round[]; questions: Question[]; byRound(r: RoundId): Question[] }`, memoised per role id.

- [ ] **Step 1: Write the failing tests**

Add to `src/data/roles.test.ts`:

```ts
import { forRole } from './index';

describe('forRole', () => {
  test('rounds come back in the role\'s own order, not catalogue order', () => {
    const lead = forRole('lead');
    expect(lead.rounds.map((r) => r.id)).toEqual(['hr', 'hm', 'coding', 'design', 'lead', 'hoe']);
  });

  test('questions are limited to the role\'s rounds', () => {
    const senior = forRole('senior');
    expect(senior.questions.some((q) => q.round === 'hoe')).toBe(false);
    expect(senior.questions.some((q) => q.round === 'hr')).toBe(true);
  });

  test('an untagged question appears for every role whose loop has its round', () => {
    const staff = forRole('staff');
    const architect = forRole('architect');
    const untaggedHr = staff.questions.find((q) => q.round === 'hr' && q.roles === undefined);
    expect(untaggedHr).toBeDefined();
    expect(architect.questions.some((q) => q.id === untaggedHr!.id)).toBe(true);
  });

  test('a tagged question appears only for the roles listed', () => {
    const tagged = { ...forRole('staff').questions.find((q) => q.roles !== undefined) };
    expect(tagged.id).toBeDefined();
    for (const id of ['senior', 'staff', 'lead', 'architect'] as const) {
      const present = forRole(id).questions.some((q) => q.id === tagged.id);
      expect(present, id).toBe((tagged.roles as string[]).includes(id));
    }
  });

  test('byRound scopes to both the round and the role', () => {
    const senior = forRole('senior');
    expect(senior.byRound('hoe')).toEqual([]);
    expect(senior.byRound('hr').length).toBeGreaterThan(0);
  });

  test('calling forRole twice with the same id returns the same memoised object', () => {
    expect(forRole('staff')).toBe(forRole('staff'));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- roles.test.ts`
Expected: FAIL — `forRole` is not exported from `./index`.

- [ ] **Step 3: Implement `forRole`**

Append to `src/data/index.ts` (after the existing `isStoryPrompt` export):

```ts
import type { Role, RoleId } from '../types';
import { roles } from './roles';

export interface RoleQuestions {
  role: Role;
  rounds: Round[];
  questions: Question[];
  byRound(r: RoundId): Question[];
}

const roleCache = new Map<RoleId, RoleQuestions>();

export function forRole(id: RoleId): RoleQuestions {
  const cached = roleCache.get(id);
  if (cached) return cached;

  const role = roles.find((r) => r.id === id)!;
  const scopedRounds = role.rounds.map((r) => rounds.find((round) => round.id === r)!);
  const scopedQuestions = questions.filter(
    (q) => role.rounds.includes(q.round) && (q.roles === undefined || q.roles.includes(id)),
  );
  const scopedByRound = new Map<RoundId, Question[]>(
    role.rounds.map((r) => [r, scopedQuestions.filter((q) => q.round === r)]),
  );

  const result: RoleQuestions = {
    role,
    rounds: scopedRounds,
    questions: scopedQuestions,
    byRound: (r) => scopedByRound.get(r) ?? [],
  };
  roleCache.set(id, result);
  return result;
}
```

Move the `import type { Role, RoleId } from '../types';` line up to the top-of-file import block alongside the existing `import type { Question, Round, RoundId, Route } from '../types';` (combine into one `import type` statement) and the `import { roles } from './roles';` up alongside the other round-file imports, rather than leaving them mid-file — the snippet above is split for readability in this plan, not for the actual file layout.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- roles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/index.ts src/data/roles.test.ts
git commit -m "feat: add forRole selector for role-scoped rounds and questions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `useRole` hook and Home switcher

**Files:**
- Create: `src/hooks/useRole.ts`
- Test: `src/hooks/useRole.test.ts` (new)
- Modify: `src/App.tsx`
- Modify: `src/components/Home.tsx`
- Test: `src/__tests__/App.test.tsx`
- Test: `src/__tests__/Home.test.tsx`

**Interfaces:**
- Consumes: `useStoredValue` from `./useStoredValue`; `ROLE_IDS`, `DEFAULT_ROLE`, `roles` from `../data/roles`; `RoleId` from `../types`; `forRole` from `../data`.
- Produces: `ROLE_KEY: string`, `useRole(): [RoleId, (v: RoleId) => void]`. `Home` now takes a `role: RoleId` prop and renders the switcher; `App` passes it down.

- [ ] **Step 1: Write the failing test for the hook**

Create `src/hooks/useRole.test.ts`:

```ts
import { beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ROLE_KEY, useRole } from './useRole';

beforeEach(() => localStorage.clear());

describe('useRole', () => {
  test('defaults to staff', () => {
    const { result } = renderHook(() => useRole());
    expect(result.current[0]).toBe('staff');
  });

  test('setting a role persists it', () => {
    const { result } = renderHook(() => useRole());
    act(() => result.current[1]('architect'));
    expect(result.current[0]).toBe('architect');
    expect(localStorage.getItem(ROLE_KEY)).toBe('architect');
  });

  test('restores a stored role on mount', () => {
    localStorage.setItem(ROLE_KEY, 'lead');
    const { result } = renderHook(() => useRole());
    expect(result.current[0]).toBe('lead');
  });

  test('garbage stored value falls back to staff', () => {
    localStorage.setItem(ROLE_KEY, 'not-a-role');
    const { result } = renderHook(() => useRole());
    expect(result.current[0]).toBe('staff');
  });

  test('null (nothing stored) falls back to staff', () => {
    const { result } = renderHook(() => useRole());
    expect(result.current[0]).toBe('staff');
    expect(localStorage.getItem(ROLE_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useRole.test.ts`
Expected: FAIL — module `./useRole` does not exist.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useRole.ts`:

```ts
import { useStoredValue } from './useStoredValue';
import { DEFAULT_ROLE, ROLE_IDS } from '../data/roles';
import type { RoleId } from '../types';

// Per-device preference, same shape as useStrictMode: not prep data, so it stays out
// of export/import backups and needs no schema version.
export const ROLE_KEY = 'interview-prep:role';

const isRoleId = (v: string): v is RoleId => (ROLE_IDS as readonly string[]).includes(v);

const decode = (raw: string | null): RoleId => (raw !== null && isRoleId(raw) ? raw : DEFAULT_ROLE);
const encode = (v: RoleId): string | null => v;

export function useRole(): [RoleId, (v: RoleId) => void] {
  return useStoredValue(ROLE_KEY, decode, encode);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useRole.test.ts`
Expected: PASS

- [ ] **Step 5: Wire `useRole` into `App.tsx` and pass `role` to `Home`**

Edit `src/App.tsx`. Add the import next to `useStrictMode`:

```ts
import { useRole } from './hooks/useRole';
```

Inside `App()`, next to the `strictMode`/`shortcuts` hooks:

```ts
  const [role, setRole] = useRole();
```

Change the `Home` render line:

```tsx
      {route === null && <Home state={state} role={role} setRole={setRole} />}
```

Every other route (`WeakDrill`, `RoundView`, `MockSession`, etc.) is untouched in this task — they gain `role` in Task 4 once their scoped-data changes land, so wiring it here now would leave unused props. Leave them exactly as they are.

- [ ] **Step 6: Add the switcher to `Home` and scope its round list**

Edit `src/components/Home.tsx`. Replace the top-level imports:

```tsx
import { useState } from 'react';
import type { Persisted, RoleId } from '../types';
import { forRole } from '../data';
import { roles } from '../data/roles';
import { roundStats } from '../lib/queue';
import { useLoopDate } from '../hooks/useLoopDate';
import { ExportButton, useLastExport } from './ExportImport';
import { ProgressBar, statsCaption } from './ProgressBar';
import { Select } from './Select';
```

Change the function signature and the two lines that read the global `questions`/`rounds`/`questionsByRound`:

```tsx
export function Home({ state, role, setRole }: { state: Persisted; role: RoleId; setRole: (r: RoleId) => void }) {
  const { role: activeRole, rounds: roleRounds, questions: roleQuestions, byRound } = forRole(role);
  const weak = roleQuestions.filter((q) => state.progress[q.id]?.rating === 1).length;
  const noted = roleQuestions.filter((q) => (state.notes[q.id] ?? '').trim().length > 0).length;
  const stories = Object.values(state.stories);
  const neverRehearsed = stories.filter((s) => s.lastRehearsed === undefined).length;

  const [loopDate, setLoopDate] = useLoopDate();
  const daysLeft = loopDate ? daysUntil(loopDate) : null;

  const lastExport = useLastExport();
  const [now] = useState(() => Date.now());
  const hasProgress = Object.keys(state.progress).length > 0;
  const exportIsStale = hasProgress && (!lastExport || now - Number(lastExport) > EXPORT_STALE_MS);

  const roundCards = roleRounds.map((round, index) => ({
    round,
    index,
    stats: roundStats(byRound(round.id), state.progress),
  }));
  const orderedCards = loopDate
    ? [...roundCards].sort((a, b) => (b.stats.weak * 2 + b.stats.unrated) - (a.stats.weak * 2 + a.stats.unrated))
    : roundCards;
```

Change the header markup to show the active role's title and add the switcher beside the Loop date row:

```tsx
      <header className="mb-6">
        <h1 tabIndex={-1} className="text-2xl font-semibold">Interview Prep</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{activeRole.title} · Berlin / EU loop</p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="loop-date" className="text-zinc-600 dark:text-zinc-400">Loop date</label>
        <input
          id="loop-date"
          type="date"
          value={loopDate ?? ''}
          onChange={(e) => setLoopDate(e.target.value || null)}
          className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
        />
        {daysLeft !== null && <span className="text-zinc-500 dark:text-zinc-400">{daysLeft} days left</span>}
        <Select
          label="Role"
          value={role}
          onChange={(v) => setRole(v as RoleId)}
          options={roles.map((r) => ({ value: r.id, label: r.title }))}
        />
      </div>
```

Every reference to `weak`, `noted`, `orderedCards` below is unchanged (they already read the locals redefined above). `roundStats` and `statsCaption` imports are unchanged.

- [ ] **Step 7: Update `Home.test.tsx`'s harness to pass `role`/`setRole`**

Edit `src/__tests__/Home.test.tsx`. Add the import and change the harness:

```tsx
import { useState } from 'react';
import type { RoleId } from '../types';
```

```tsx
function Harness({ initial }: { initial: Persisted }) {
  const [state] = useReducer(reducer, initial);
  const [role, setRole] = useState<RoleId>('staff');
  return <Home state={state} role={role} setRole={setRole} />;
}
```

Every existing test in the file keeps working unmodified — `staff` sees the same seven rounds as before.

- [ ] **Step 8: Add a Home switcher test**

Append to `src/__tests__/Home.test.tsx`:

```tsx
test('switching roles changes the visible round cards and readiness counts', async () => {
  const userEvent = (await import('@testing-library/user-event')).default;
  render(<Harness initial={EMPTY} />);
  expect(screen.getByText('HR screen')).toBeInTheDocument();
  expect(screen.getByText('Head of engineering')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Role'), 'Senior frontend');
  expect(screen.queryByText('Head of engineering')).not.toBeInTheDocument();
});
```

- [ ] **Step 9: Fix `App.test.tsx` for the new `Home` props (App itself supplies them, so this is a smoke check, not a harness change)**

`App.test.tsx` renders `<App />` directly, and `App` now supplies `role`/`setRole` to `Home` itself (Step 5), so no harness change is needed there. Confirm by running the suite:

Run: `npm test -- App.test.tsx Home.test.tsx useRole.test.ts`
Expected: PASS

- [ ] **Step 10: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS. (Every other route still imports the global catalogue at this point — Task 4 scopes them.)

- [ ] **Step 11: Commit**

```bash
git add src/hooks/useRole.ts src/hooks/useRole.test.ts src/App.tsx src/components/Home.tsx src/__tests__/Home.test.tsx
git commit -m "feat: add useRole hook and role switcher on Home

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Scope the remaining role-aware views and the App round-route guard

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/WeakDrill.tsx`
- Modify: `src/components/SearchView.tsx`
- Modify: `src/components/NotesView.tsx`
- Modify: `src/components/PrintView.tsx`
- Modify: `src/components/RoundView.tsx`
- Modify: `src/components/DesignSession.tsx`
- Modify: `src/components/MockSession.tsx` (round-scoping only — presets and `lapKey` land in Task 6)
- Test: `src/__tests__/App.test.tsx`
- Test: `src/__tests__/WeakDrill.test.tsx`, `src/__tests__/SearchView.test.tsx`, `src/__tests__/NotesView.test.tsx`, `src/__tests__/PrintView.test.tsx`, `src/__tests__/RoundView.test.tsx`, `src/__tests__/DesignSession.test.tsx`, `src/__tests__/MockSession.test.tsx` (harness updates only, no new assertions in this task except the App guard test below)

**Interfaces:**
- Consumes: `forRole` from `../data`, `role: RoleId` prop threaded from `App`.
- Produces: every listed component now takes a `role: RoleId` prop (`RoundView` and `DesignSession` additionally use scoped `byRound`).

- [ ] **Step 1: Write the failing test for the App round-route guard**

Append to `src/__tests__/App.test.tsx`:

```tsx
import { ROLE_KEY } from '../hooks/useRole';

test('a round hash outside the active role\'s loop renders Home instead', () => {
  localStorage.setItem(ROLE_KEY, 'senior');
  window.location.hash = '#hoe';
  render(<App />);
  expect(screen.getByRole('heading', { name: /interview prep/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /head of engineering/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- App.test.tsx`
Expected: FAIL — `App` currently renders `RoundView` for any `RoundId` in `ROUTES` regardless of role.

- [ ] **Step 3: Thread `role` through `App.tsx` and guard the round route**

Edit `src/App.tsx`. Change the top-of-file import to add `forRole` alongside the existing `ROUND_IDS, rounds`:

```ts
import { ROUND_IDS, forRole, rounds } from './data';
```

`ROUND_IDS` and `rounds` stay imported unchanged — `isRoundId` and `titleFor` (both module-level, below) still use them for the document-title lookup regardless of the active role. Only the render guard inside `App()` needs the new role-scoped check.

Add `role` to `App()` and compute the round-route guard from the active role's rounds:

```tsx
export default function App() {
  const { state, dispatch, saveFailed, staleTab, dismissStaleTab } = useAppState();
  const route = useHashRoute();
  const [strictMode, setStrictMode] = useStrictMode();
  const [shortcuts, setShortcuts] = useShortcuts();
  const [role, setRole] = useRole();
  const { rounds: roleRounds } = forRole(role);
  const isActiveRoundId = (r: Route): r is RoundId => roleRounds.some((round) => round.id === r);
```

Change the render branch. A hash naming a round outside the active role's loop must fall through to `Home`, so compute one `activeRoundId` and one `showHome` boolean up front rather than relying on `route === null` alone:

```tsx
  const activeRoundId = route !== null && isActiveRoundId(route) ? route : null;
  const isNamedView = route !== null && (['weak', 'notes', 'stories', 'mock', 'search', 'print'] as const).includes(route as never);
  const showHome = route === null || (activeRoundId === null && !isNamedView);
```

```tsx
      {showHome && <Home state={state} role={role} setRole={setRole} />}
      {route === 'weak' && <WeakDrill state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} role={role} />}
      {route === 'notes' && <NotesView state={state} role={role} />}
      {route === 'stories' && <StoriesView state={state} dispatch={dispatch} />}
      {route === 'mock' && <MockSession state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} role={role} />}
      {route === 'search' && <SearchView state={state} dispatch={dispatch} role={role} />}
      {route === 'print' && <PrintView state={state} role={role} />}
      {activeRoundId !== null && (
        <RoundView key={activeRoundId} roundId={activeRoundId} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} role={role} />
      )}
```

- [ ] **Step 4: Run the App test to verify it passes**

Run: `npm test -- App.test.tsx`
Expected: FAIL still, at this point, on the other components' missing `role` prop (TypeScript errors) — proceed to the remaining steps before re-running.

- [ ] **Step 5: Scope `WeakDrill`**

Edit `src/components/WeakDrill.tsx`:

```tsx
import { useState, type Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted, RoleId } from '../types';
import type { Action } from '../hooks/useAppState';
import { forRole } from '../data';
import { Practice } from './Practice';

export function WeakDrill({
  state, dispatch, strictMode, shortcuts = true, role,
}: { state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean; shortcuts?: boolean; role: RoleId }) {
  const { questions } = forRole(role);
  const [drill] = useState(() => questions.filter((q) => state.progress[q.id]?.rating === 1));
  const remaining = drill.filter((q) => state.progress[q.id]?.rating === 1).length;
  // ...unchanged JSX below; the <Practice .../> call there gains role={role} in Task 6,
  // once lapKey (and Practice's own role prop) exist...
```

- [ ] **Step 6: Scope `SearchView`**

Edit `src/components/SearchView.tsx`:

```tsx
import { useMemo, useState, type Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted, RoleId } from '../types';
import type { Action } from '../hooks/useAppState';
import { forRole } from '../data';
import { filterByStatus, type QuestionStatus } from '../lib/queue';
import { Browse } from './Browse';
import { STATUS_OPTIONS, Select } from './Select';

export function SearchView({ state, dispatch, role }: { state: Persisted; dispatch: Dispatch<Action>; role: RoleId }) {
  const { questions } = forRole(role);
  const [status, setStatus] = useState<QuestionStatus>('all');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => filterByStatus(questions, status, state.progress), [status, questions]);
  // ...rest unchanged...
```

- [ ] **Step 7: Scope `NotesView`**

Edit `src/components/NotesView.tsx`:

```tsx
import type { Persisted, RoleId } from '../types';
import { BackLink } from './BackLink';
import { forRole } from '../data';

export function NotesView({ state, role }: { state: Persisted; role: RoleId }) {
  const { questions, rounds } = forRole(role);
  const titleOf = (id: string) => rounds.find((r) => r.id === id)?.title ?? id;
  const noted = questions.filter((q) => (state.notes[q.id] ?? '').trim().length > 0);
  // ...rest unchanged (titleOf moved inside the component since it now closes over the scoped rounds)...
```

- [ ] **Step 8: Scope `PrintView`**

Edit `src/components/PrintView.tsx`:

```tsx
import type { Persisted, RoleId } from '../types';
import { BackLink } from './BackLink';
import { forRole } from '../data';

export function PrintView({ state, role }: { state: Persisted; role: RoleId }) {
  const { rounds, byRound } = forRole(role);
  const sections = rounds
    .map((round) => ({
      round,
      items: byRound(round.id).filter(
        (q) => state.progress[q.id]?.rating === 1 || (state.notes[q.id] ?? '').trim().length > 0,
      ),
    }))
    .filter((s) => s.items.length > 0);
  // ...rest unchanged...
```

- [ ] **Step 9: Scope `RoundView`**

Edit `src/components/RoundView.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted, RoleId, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { forRole } from '../data';
import { filterByStatus, roundStats, type QuestionStatus } from '../lib/queue';
import { Browse } from './Browse';
import { Practice } from './Practice';
import { ProgressBar, statsCaption } from './ProgressBar';
import { DesignSession } from './DesignSession';
import { CategoryStrength } from './CategoryStrength';
import { ALL, STATUS_OPTIONS, Select } from './Select';

type Tab = 'practice' | 'browse' | 'design-prompt';
const TAB_LABEL: Record<Tab, string> = { practice: 'Practice', browse: 'Browse', 'design-prompt': '45-min prompt' };

export function RoundView({
  roundId, state, dispatch, strictMode, shortcuts = true, role,
}: { roundId: RoundId; state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean; shortcuts?: boolean; role: RoleId }) {
  const { rounds, byRound } = forRole(role);
  const round = rounds.find((r) => r.id === roundId);
  const all = useMemo(() => byRound(roundId), [byRound, roundId]);
  // ...unchanged below this point, except the DesignSession render...
```

Change the `design-prompt` tab render to pass `role`:

```tsx
        {tab === 'design-prompt' && <DesignSession state={state} dispatch={dispatch} role={role} />}
```

- [ ] **Step 10: Scope `DesignSession`**

Edit `src/components/DesignSession.tsx`. Change the import and signature:

```tsx
import type { Persisted, Question, RoleId } from '../types';
import { forRole } from '../data';
```

```tsx
export function DesignSession({ state, dispatch, role }: { state: Persisted; dispatch: Dispatch<Action>; role: RoleId }) {
  const designQuestions = forRole(role).byRound('design');
  // ...rest of DesignSession unchanged; DesignPrompt sub-component is untouched...
```

(Every role's loop includes `design`, per Task 1's role table, so `designQuestions` is never empty for a valid role — the existing "No design prompts available" fallback stays as dead-but-harmless defensive code, unchanged.)

- [ ] **Step 11: Scope `MockSession`'s round lookups (composition table and `lapKey` land in Task 6)**

Edit `src/components/MockSession.tsx`. Change the import and the `buildSet` call sites to take scoped data as a parameter instead of importing the global `questionsByRound` directly:

```tsx
import type { Persisted, Question, RoleId, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { forRole } from '../data';
import { Practice } from './Practice';
import { clearBaseline, clearLap, lapKey, readBaseline, readLap, writeBaseline, type Baseline } from '../lib/lap';
```

```tsx
function buildSet(composition: Preset['composition'], byRound: (r: RoundId) => Question[]): Question[] {
  const picked: Question[] = [];
  for (const [roundId, count] of Object.entries(composition) as [RoundId, number][]) {
    picked.push(...byRound(roundId).slice(0, count));
  }
  return picked;
}

export function MockSession({
  state, dispatch, strictMode, shortcuts = true, role,
}: { state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean; shortcuts?: boolean; role: RoleId }) {
  const { byRound } = forRole(role);
  const [session, setSession] = useState<{ preset: Preset; drill: Question[]; baseline: Baseline } | null>(null);
```

Change the one call site inside `start`:

```tsx
  const start = (preset: Preset) => {
    const drill = buildSet(preset.composition, byRound);
```

`Practice questions={drill} ...` further down gains `role={role}` (Task 6, alongside the `lapKey` change — do not add it here, to keep this task's diff to round-scoping only). Composition entries for `lead`/`arch` also land in Task 6, since they're part of the same preset-table edit as the `lapKey` prefix.

- [ ] **Step 12: Update test harnesses for the new `role` prop**

In each of `src/__tests__/WeakDrill.test.tsx`, `src/__tests__/SearchView.test.tsx`, `src/__tests__/NotesView.test.tsx`, `src/__tests__/PrintView.test.tsx`, `src/__tests__/RoundView.test.tsx`, `src/__tests__/MockSession.test.tsx`: find the component's render call in the test harness and add `role="staff"`. These files render the component directly rather than through `App`, so TypeScript will fail to compile them without this. No assertions change — `staff` sees the same rounds and questions every existing test already expects.

In `src/__tests__/DesignSession.test.tsx` specifically, give `Harness` an optional `role` parameter defaulting to `'staff'` instead of a hardcoded literal, since Task 5 needs to render it under a different role:

```tsx
import type { Persisted, RoleId } from '../types';

function Harness({ role = 'staff' }: { role?: RoleId } = {}) {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <DesignSession state={state} dispatch={dispatch} role={role} />;
}
```

Every existing call to `<Harness />` in that file keeps working unchanged (defaults to `staff`, identical to today's behavior). The file also has a separate `ReloadableHarness` function (in the "design scratch survives a reload across attempts" describe block) that renders `<DesignSession state={state} dispatch={dispatch} />` directly — add `role="staff"` to that render call too; it doesn't need the optional-param treatment since none of its tests switch roles.

- [ ] **Step 13: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 14: Commit**

```bash
git add src/App.tsx src/components/WeakDrill.tsx src/components/SearchView.tsx src/components/NotesView.tsx src/components/PrintView.tsx src/components/RoundView.tsx src/components/DesignSession.tsx src/components/MockSession.tsx src/__tests__/App.test.tsx src/__tests__/WeakDrill.test.tsx src/__tests__/SearchView.test.tsx src/__tests__/NotesView.test.tsx src/__tests__/PrintView.test.tsx src/__tests__/RoundView.test.tsx src/__tests__/DesignSession.test.tsx src/__tests__/MockSession.test.tsx
git commit -m "feat: scope role-specific views to the active role's rounds and questions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Design-session guard for a role switch mid-session

**Files:**
- Modify: `src/components/DesignSession.tsx`
- Test: `src/__tests__/DesignSession.test.tsx`

**Interfaces:**
- Consumes: `readDesignSession`, `clearDesignSession` from `../lib/lap` (unchanged signatures).
- Produces: no new exports — `DesignSession` now discards a stored session whose question id isn't in the active role's scoped design questions.

The Home switcher (Task 3) is the only place the role changes, and it never renders `DesignSession` underneath it — so this guard is a defense against a stale session from a *previous* visit under a different role (switch role on Home, come back to `#design` later, land on the design-prompt tab), not a same-session race.

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/DesignSession.test.tsx`, inside the main `describe('DesignSession', ...)` block, using the `Harness` from Task 4 Step 12 (now taking an optional `role`):

```tsx
import { readDesignSession, writeDesignSession } from '../lib/lap';

test('mounting with a stale session for a question id outside the scoped set clears it from storage', () => {
  writeDesignSession({ questionId: 'design-does-not-exist', startedAt: Date.now(), phases: [1, 2] });
  render(<Harness />);
  // Today's code already falls back to a fresh pickQuestionId() when the saved id isn't
  // in the scoped set (nothing renders broken either way) — but it leaves the stale
  // entry in storage until Finish or Another Prompt. The fix clears it immediately on
  // mount, so any other reader of readDesignSession() in between sees "no session," not
  // a session pointing at a question that doesn't exist.
  expect(readDesignSession()).toBeUndefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DesignSession.test.tsx`
Expected: FAIL — `readDesignSession()` still returns the stale `design-does-not-exist` entry after mount, since nothing clears it until `Finish` or `Another prompt`.

- [ ] **Step 3: Add the guard**

`src/components/DesignSession.tsx` already has, from Task 4 Step 10:

```tsx
export function DesignSession({ state, dispatch, role }: { state: Persisted; dispatch: Dispatch<Action>; role: RoleId }) {
  const designQuestions = forRole(role).byRound('design');
```

This is already correct — `designQuestions` is role-scoped, and the existing line

```tsx
  const [questionId, setQuestionId] = useState(() => {
    const saved = readDesignSession()?.questionId;
    return saved !== undefined && designQuestions.some((q) => q.id === saved) ? saved : pickQuestionId();
  });
```

already falls back to `pickQuestionId()` when the saved id isn't in `designQuestions` — which, after Task 4, is the *scoped* set. The one gap: a stale stored session is never explicitly cleared, so `writeDesignSession` from a fresh `pickQuestionId()` result overwrites it only once the user reaches `Finish` or `Another prompt`; in between, `readDesignSession()` still returns the stale entry to any other reader. Clear it explicitly:

```tsx
  const [questionId, setQuestionId] = useState(() => {
    const saved = readDesignSession();
    if (saved !== undefined && designQuestions.some((q) => q.id === saved.questionId)) return saved.questionId;
    if (saved !== undefined) clearDesignSession();
    return pickQuestionId();
  });
```

Add `clearDesignSession` to the existing `import { clearDesignSession, readDesignSession, writeDesignSession } from '../lib/lap';` line (it's likely already imported for the `finished` effect further down — check before adding a duplicate).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- DesignSession.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/DesignSession.tsx src/__tests__/DesignSession.test.tsx
git commit -m "fix: clear a stale design session that no longer belongs to the active role

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Role-prefixed lap keys and MockSession's arch/lead presets

**Files:**
- Modify: `src/lib/lap.ts`
- Modify: `src/components/Practice.tsx`
- Modify: `src/components/MockSession.tsx`
- Test: `src/lib/lap.test.ts` (check whether this file already exists — search `src/lib/*.test.ts` first; if `lapKey` has no dedicated test file today, create one)
- Test: `src/__tests__/Practice.test.tsx`
- Test: `src/__tests__/MockSession.test.tsx`
- Test: `src/__tests__/data.test.ts` (MAX_LAPS recompute)

**Interfaces:**
- Produces: `lapKey(role: RoleId, questions: Question[]): string` (breaking signature change from `lapKey(questions: Question[])`).
- Consumes at the two call sites: `Practice` gains a `role: RoleId` prop; `MockSession` already has `role` from Task 4.

- [ ] **Step 1: Check for an existing `lapKey` test and write/extend the failing test**

Run: `find src -iname "*lap*.test.ts"` first. If `src/lib/lap.test.ts` exists, add to it; otherwise create it:

```ts
import { describe, expect, test } from 'vitest';
import { lapKey } from './lap';
import type { Question } from '../types';

const q = (id: string): Question => ({ id, round: 'hm', category: 'A', question: '?', answer: ['a'], keyPoints: ['k'] });

describe('lapKey', () => {
  test('two roles filtering the same question set produce different keys', () => {
    const set = [q('hm-001'), q('hm-002'), q('hm-003')];
    expect(lapKey('staff', set)).not.toBe(lapKey('senior', set));
  });

  test('key is a prefix of role followed by the existing length:first:last heuristic', () => {
    const set = [q('hm-001'), q('hm-002')];
    expect(lapKey('staff', set)).toBe('staff:2:hm-001:hm-002');
  });

  test('empty set still produces a stable, role-distinguishing key', () => {
    expect(lapKey('staff', [])).not.toBe(lapKey('lead', []));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lap.test.ts`
Expected: FAIL — `lapKey` currently takes one argument.

- [ ] **Step 3: Change `lapKey`'s signature**

Edit `src/lib/lap.ts`. Add `RoleId` to the type import and change the function:

```ts
import type { Question } from '../types';
import type { RoleId } from '../types';
```

(Combine into the existing `import type { Question } from '../types';` line as `import type { Question, RoleId } from '../types';`.)

```ts
// Identifies the question set without changing the underlying heuristic's shape: two
// roles filtering the same round to the same length/endpoints (e.g. Senior and Staff
// both showing the same untagged hm questions with the last one clipped by a tag)
// would otherwise collide on one lap slot.
export const lapKey = (role: RoleId, questions: Question[]): string =>
  `${role}:${questions.length}:${questions[0]?.id ?? ''}:${questions[questions.length - 1]?.id ?? ''}`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lap.test.ts`
Expected: PASS

- [ ] **Step 5: Update the two call sites**

Edit `src/components/Practice.tsx`. Add `role: RoleId` to the props and to the import:

```tsx
import type { Persisted, Question, Rating, RoleId, RoundId } from '../types';
```

```tsx
export function Practice({
  questions, state, dispatch, strictMode, shortcuts = true, ordered = false, onLapComplete, role,
}: {
  questions: Question[]; state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean;
  shortcuts?: boolean;
  ordered?: boolean; onLapComplete?: () => void; role: RoleId;
}) {
```

Change the one `lapKey` call:

```tsx
  const key = useMemo(() => lapKey(role, questions), [role, questions]);
```

Edit `src/components/MockSession.tsx`. Change the two `lapKey` call sites (`start` and `endSession`) to pass `role`, and pass `role={role}` into the `<Practice ... />` render:

```tsx
  const start = (preset: Preset) => {
    const drill = buildSet(preset.composition, byRound);
    const key = lapKey(role, drill);
    // ...unchanged...
  };

  const endSession = () => {
    if (!session) return;
    const key = lapKey(role, session.drill);
    clearLap(key);
    clearBaseline(key);
  };
```

```tsx
      <Practice questions={drill} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} ordered onLapComplete={finishSession} role={role} />
```

Two more `Practice` call sites need `role={role}` added now — both components already receive `role` as a prop (from Task 4 Steps 5 and 9), the JSX itself just wasn't touched yet:

In `src/components/RoundView.tsx`, change:

```tsx
        {tab === 'practice' && <Practice key={`${roundId}:${selected ?? ''}:${status}`} questions={filtered} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} />}
```

to:

```tsx
        {tab === 'practice' && <Practice key={`${roundId}:${selected ?? ''}:${status}`} questions={filtered} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} role={role} />}
```

In `src/components/WeakDrill.tsx`, change:

```tsx
          <Practice questions={drill} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} />
```

to:

```tsx
          <Practice questions={drill} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} role={role} />
```

- [ ] **Step 6: Add `arch`/`lead` slices to the MockSession presets**

Edit `src/components/MockSession.tsx`'s `PRESETS`:

```tsx
const PRESETS: Preset[] = [
  {
    id: 'full-loop',
    title: 'Full loop',
    blurb: 'A slice of every round, in round order.',
    composition: { hr: 4, hm: 6, coding: 4, design: 3, case: 4, debrief: 4, hoe: 3, lead: 3, arch: 3 },
  },
  {
    id: 'technical',
    title: 'Technical rounds',
    blurb: 'Hiring manager, live coding, and system design only — no HR or case study.',
    composition: { hm: 8, coding: 6, design: 6 },
  },
];
```

`buildSet` (Task 4 Step 11) already iterates `Object.entries(composition)` and calls the scoped `byRound(roundId)` — a role whose loop excludes `lead` or `arch` simply gets `byRound('lead')` returning `[]` for that entry (per `forRole`'s `byRound` in Task 2, which only has keys for rounds in the role's own `rounds` list, defaulting to `[]` via the `?? []` fallback), so no per-role preset table is needed: Senior's Full loop naturally has no `hoe`, `lead`, or `arch` slice, and Architect's naturally gets an `arch` slice but no `lead` one.

- [ ] **Step 7: Update Practice's and MockSession's test harnesses**

`src/__tests__/Practice.test.tsx`'s `Harness`/`Harness3`/`Harness5` functions need `role="staff"` added to their `<Practice ... />` calls (they don't render through `RoundView`, so they need the prop directly).

`src/__tests__/MockSession.test.tsx`'s `Harness` needs `role="staff"` added to its `<MockSession ... />` call (from Task 4 Step 12 — verify it's there; if not, add it now).

- [ ] **Step 8: Add the "same set, two roles, two lap keys" test**

Append to `src/__tests__/Practice.test.tsx` (adjust to match the file's existing harness-construction helpers rather than inventing new ones — reuse `qs`/`Harness` patterns already in the file):

```tsx
import { readLap } from '../lib/lap';

test('the same question set under two roles produces two independent lap keys', async () => {
  function HarnessRole({ role }: { role: 'staff' | 'senior' }) {
    const [state, dispatch] = useReducer(reducer, EMPTY);
    return <Practice questions={qs} state={state} dispatch={dispatch} strictMode={false} role={role} />;
  }
  const { unmount } = render(<HarnessRole role="staff" />);
  await rateVisible();
  unmount();
  render(<HarnessRole role="senior" />);
  // Senior's lap for this exact question set starts fresh (question 1), rather than
  // resuming staff's now-advanced position — proving the two keys are independent.
  expect(screen.getByText('First question?')).toBeInTheDocument();
});
```

- [ ] **Step 9: Recompute the `MAX_LAPS` cap test per role**

Edit `src/__tests__/data.test.ts`. Replace the existing `'the lap cap holds one lap per possible question set'` test:

```ts
  // Every round's Practice tab and every category chip is its own lap, plus the Weak
  // drill and the mock presets, for whichever role has the most of them — only one
  // role's laps are live at a time, so evicting a dormant role's entries is fine.
  test('the lap cap holds one lap per possible question set for the largest role', () => {
    const { roles } = require('../data/roles') as typeof import('../data/roles');
    let maxSets = 0;
    for (const role of roles) {
      const roleQuestions = questions.filter((q) => role.rounds.includes(q.round) && (q.roles === undefined || q.roles.includes(role.id)));
      const perRound = role.rounds.map((r) => 1 + new Set(roleQuestions.filter((q) => q.round === r).map((q) => q.category)).size);
      const sets = perRound.reduce((a, b) => a + b, 0) + 1 + 2; // +1 weak drill, +2 mock presets
      maxSets = Math.max(maxSets, sets);
    }
    expect(MAX_LAPS).toBeGreaterThanOrEqual(maxSets);
  });
```

Replace `require(...)` with a top-of-file import instead — this test file already uses ES module imports throughout, so keep it consistent. Task 1 Step 6 already added `import { ROLE_IDS } from '../data/roles';` to this file; extend that same line to also bring in `roles`:

```ts
import { ROLE_IDS, roles } from '../data/roles';
```

and drop the inline `require` line from the test body, referencing the top-level `roles` import directly.

- [ ] **Step 10: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS. If `MAX_LAPS` (64) is now below the largest role's `maxSets`, raise `MAX_LAPS` in `src/lib/lap.ts` to the next value that clears it — do not lower the test's expectations to fit the current constant.

- [ ] **Step 11: Commit**

```bash
git add src/lib/lap.ts src/lib/lap.test.ts src/components/Practice.tsx src/components/MockSession.tsx src/__tests__/Practice.test.tsx src/__tests__/MockSession.test.tsx src/__tests__/data.test.ts
git commit -m "feat: prefix lap keys by role and add arch/lead slices to mock presets

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `Practice`/`QuestionCard`/`useHashRoute` sanity pass (no scoping — confirm and lock with tests)

**Files:**
- Test: `src/__tests__/QuestionCard.test.tsx` (no changes expected — verify only)
- Test: `src/hooks/useHashRoute.test.ts` (if one exists — verify only)

**Interfaces:** none new. This task makes explicit, via tests, the spec's decision that these three stay on the global catalogue.

- [ ] **Step 1: Confirm `QuestionCard` still reads the global `rounds` for its target-time lookup**

`QuestionCard.tsx` looks up `rounds.find((r) => r.id === question.round)?.targetSeconds` — this is correct unchanged, because every round (including the two new ones) has exactly one `targetSeconds` regardless of which role is active. No edit needed. Run its existing test file to confirm nothing regressed:

Run: `npm test -- QuestionCard.test.tsx`
Expected: PASS (no changes were made to this file across the whole plan).

- [ ] **Step 2: Confirm `useHashRoute` still accepts every catalogue route**

`useHashRoute.ts` reads `ROUTES` (from Task 1, now including `lead` and `arch`) and is unaffected by role — the App-level guard from Task 4 is what turns an out-of-loop hash into a Home render, not `useHashRoute` itself. No edit needed.

Run: `npm test -- useHashRoute`
Expected: PASS if a test file exists; if none exists, this step is a no-op confirmation, not a new test — the file's behavior is exercised indirectly by `App.test.tsx`'s round-route-guard test from Task 4.

- [ ] **Step 3: No commit**

This task makes no code changes. If both checks pass, move directly to Task 8.

---

## Task 8: Content for `lead.ts` and `arch.ts`

**Files:**
- Modify: `src/data/lead.ts`
- Modify: `src/data/arch.ts`
- Test: `src/__tests__/data.test.ts` (existing generic tests now exercise real content)

**Interfaces:**
- Consumes: `Question` shape from `../types` (unchanged).
- Produces: `lead: Question[]` with ~30 entries across 6 categories; `arch: Question[]` with ~30 entries across 6 categories.

This is a content-authoring task, not a mechanical refactor — the two files above are checked purely by the existing generic tests in `src/__tests__/data.test.ts` (id format, uniqueness, non-empty fields, word budget, floor count, no nested placeholders). There is nothing else to assert; correctness here is "matches the schema and reads like a real interview question," which the test suite already verifies mechanically, and a human reviewer verifies for content quality in the PR.

**Category breakdown** (from the spec, 6 categories per file, ~5 questions each to reach the 30 floor set in Task 1):

`lead.ts`: People & growth, Delivery & process, Hiring & team shape, Technical direction, Conflict & stakeholders, Running the round.

`arch.ts`: Cross-team platform, Migration strategy, Decision records & governance, Design-system ownership, Build & runtime architecture, Trade-off probes.

**Word budget:** `lead` round is 150 target seconds → `Math.round(150/60*130)` = 325 words across `answer` per question. `arch` round is 240 target seconds → `Math.round(240/60*130)` = 520 words across `answer` per question. `deeper` is uncounted.

**Id scheme:** `lead-001` … `lead-0NN`, `arch-001` … `arch-0NN`, matching `ID_RE` from `data.test.ts` (`^(hr|hm|coding|design|case|debrief|hoe|lead|arch)-\d{3}$`).

- [ ] **Step 1: Write one full worked example in `lead.ts` to lock the pattern**

```ts
import type { Question } from '../types';

export const lead: Question[] = [
  // People & growth (5)
  {
    id: 'lead-001',
    round: 'lead',
    category: 'People & growth',
    question: 'How do you run a growth conversation with an engineer who wants to move faster than the level system allows?',
    answer: [
      'Separate the two things being conflated: the level system moves on a cadence and evidence bar you don\'t control alone, but the engineer\'s actual scope and skill can grow faster than that cadence — say so plainly, rather than letting the conversation collapse into "not yet."',
      'Give a concrete, written definition of the gap: name the one or two things (a category of decision, a scale of project, a form of cross-team influence) that the next level\'s evidence bar requires and this person hasn\'t yet shown, and agree on a specific piece of work in the next quarter that would produce that evidence.',
      'Close with what you\'ll do on your side: create the opportunity (assign the project, sponsor them in front of the people who calibrate), rather than leaving the growth entirely on them to find for themselves.',
    ],
    keyPoints: [
      'Distinguishes the level cadence from the person\'s actual growth rate',
      'Names a specific, evidence-shaped gap rather than a vague "not ready"',
      'Agrees on one concrete piece of work that would close it',
      'States what the lead will personally do to create the opportunity',
    ],
    followUps: ['What do you do if they disagree with your read of the gap?', 'How do you handle it if the opportunity you create doesn\'t pan out?'],
  },
  // ... 4 more People & growth questions, then 5 each for Delivery & process,
  // Hiring & team shape, Technical direction, Conflict & stakeholders, Running the round.
];
```

- [ ] **Step 2: Write one full worked example in `arch.ts` to lock the pattern**

```ts
import type { Question } from '../types';

export const arch: Question[] = [
  // Cross-team platform (5)
  {
    id: 'arch-001',
    round: 'arch',
    category: 'Cross-team platform',
    question: 'How do you decide what belongs in a shared frontend platform versus what stays owned by individual product teams?',
    answer: [
      'Start from the cost of divergence, not the cost of building: something belongs in the platform when two or more teams solving the same problem independently would produce inconsistent user-facing behavior (auth, design-system primitives, telemetry) or duplicated maintenance burden that scales with team count — not merely because it would be "nice to share."',
      'Weigh it against the cost of coupling: a shared piece slows every consuming team down by exactly the review and versioning overhead of the platform team, so the bar should rise with how often the thing actually needs to change — a stable primitive is a good platform candidate, a fast-moving product surface is not, even if it looks reusable today.',
      'Say how you\'d decide a live case out loud with a concrete example (a design-system component, an experimentation SDK, a data-fetching layer) and name the ownership model that follows: platform team owns the contract and a deprecation path, product teams own their own usage of it.',
    ],
    keyPoints: [
      'Frames the decision around cost of divergence versus cost of coupling, not "shared is better"',
      'Names inconsistency and duplicated maintenance as the actual costs of NOT sharing',
      'Names review/versioning overhead as the actual cost of sharing',
      'Gives one concrete example and states who owns the contract versus who owns usage',
    ],
    followUps: ['What\'s a piece of shared infrastructure you\'d actively push back on centralizing?', 'How do you handle a platform component that one team needs to diverge from?'],
  },
  // ... 4 more Cross-team platform questions, then 5 each for Migration strategy,
  // Decision records & governance, Design-system ownership, Build & runtime
  // architecture, Trade-off probes.
];
```

- [ ] **Step 3: Complete both files to ~30 questions each**

Following the two worked examples above exactly (three-bullet `answer` under the word budget, `keyPoints` naming what a strong answer states explicitly, `followUps` as one or two probing questions, `[bracket slots]` anywhere a real detail from the candidate's own experience belongs, no employer facts or real personal specifics), write the remaining ~25 questions per file across the category lists given above, aiming for roughly 5 per category. Use `deeper` for material that only comes up if the interviewer digs, the same way the existing rounds do (see `src/data/hr.ts`, `src/data/hm.ts` for reference — do not copy their content, only their shape and tone).

- [ ] **Step 4: Run the test suite**

Run: `npm test`
Expected: PASS on every generic assertion in `data.test.ts` — id format, uniqueness, non-empty fields, word budget, the `lead: 30` / `arch: 30` floor, no nested placeholders, `MAX_LAPS` cap (recomputed in Task 6). Fix any individual question that trips the word-budget or placeholder-nesting checks; do not loosen the test.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/lead.ts src/data/arch.ts
git commit -m "feat: add lead and architect round content (~30 questions each)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Tagging pass on the existing bank

**Files:**
- Modify: `src/data/hm.ts`
- Modify: `src/data/design.ts`
- Test: `src/__tests__/data.test.ts` (existing `roles` tag test from Task 1 now has real tags to check)

**Interfaces:** none new — adds `roles: RoleId[]` to specific existing `Question` entries.

The spec's rule names three HM categories (Leadership & influence, Org & impact, Vision & strategy) and two others (Platform & scale, Architecture & system design). Investigation during planning found `Org & impact` and `Vision & strategy` exist only in `hoe.ts`, not `hm.ts` — and since every role except Senior already includes the `hoe` round (Task 1's role table), those two categories are already fully gated by round membership; no tag is needed on them. The tagging pass below is therefore scoped to the three categories that actually need it: `Leadership & influence` (hm.ts), `Architecture & system design` (hm.ts), `Platform & scale` (design.ts).

- [ ] **Step 1: Tag the four `Leadership & influence` HM questions that presume multi-team or org-wide scope**

In `src/data/hm.ts`, add `roles: ['staff', 'lead', 'architect']` to these four entries (leave the other six `Leadership & influence` questions — `hm-030`, `hm-031`, `hm-032`, `hm-033`, `hm-035`, `hm-036` — untagged; they read at team scope and stay visible to Senior):

- `hm-029` ("influenced a decision without having direct authority... across teams") — add `roles: ['staff', 'lead', 'architect'],` after its `keyPoints` array, before `followUps`.
- `hm-034` ("driving an initiative across multiple teams") — same.
- `hm-113` ("technical strategy or multi-year vision document") — same.
- `hm-114` ("sponsoring someone for promotion... calibration") — same.

Example of the edit for `hm-029` (insert the `roles` line; every other field on the object is unchanged):

```ts
    id: 'hm-029',
    round: 'hm',
    category: 'Leadership & influence',
    question: 'Tell me about a time you influenced a decision without having direct authority over the people involved.',
    answer: [ /* unchanged */ ],
    keyPoints: [ /* unchanged */ ],
    roles: ['staff', 'lead', 'architect'],
    followUps: [ /* unchanged */ ],
```

- [ ] **Step 2: Tag all eight `Architecture & system design` HM questions**

In `src/data/hm.ts`, add `roles: ['staff', 'architect']` to: `hm-001`, `hm-003`, `hm-005`, `hm-006`, `hm-007`, `hm-009`, `hm-111`, `hm-112`. All eight questions in this category (monolith-vs-micro-frontends, shared component library, state-management framework, data-fetching layer, rendering strategy, framework upgrades, WebSockets/SSE architecture, monorepo/design-system governance) presume ownership of an architectural decision at platform scope, which Lead's loop does not cover (Lead has `lead` in place of `arch`/`case`/`debrief`, focused on people and delivery, not platform architecture).

- [ ] **Step 3: Tag all eleven `Platform & scale` design questions**

In `src/data/design.ts`, add `roles: ['staff', 'architect']` to: `design-007`, `design-008`, `design-009`, `design-010`, `design-011`, `design-012`, `design-025`, `design-026`, `design-027`, `design-029`, `design-030`. Every question in this category (multi-tenant frontend, 20+ locale i18n, permissions-aware rendering, design-system rollout across dozens of apps, offline-first, real-time collaboration, resumable upload, feature-flag platform, module-federation migration, EU-data-residency rendering architecture, shared-component public API) presumes owning a platform-scale surface, which neither Senior nor Lead's loop targets.

- [ ] **Step 4: List the 23 tagged ids in the PR description**

Per the spec's tagging-rule note ("applied by hand and listed in the PR description for review"), the PR description for this task's commit (or the umbrella PR, if these commits are squashed later) must list all 23 ids and their `roles` value, grouped by category, exactly as enumerated in Steps 1-3 above.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS. The `roles.test.ts` test `'a tagged question appears only for the roles listed'` (Task 2) now exercises real tagged data instead of only whatever the test file constructed inline — confirm it still passes against the real bank.

- [ ] **Step 6: Manually verify one tagged question disappears for Senior**

Run: `npm run dev`, open the app, switch the Home role selector to Senior frontend, open the Hiring manager round's Browse tab, and confirm `hm-029` ("influenced a decision without having direct authority...") does not appear. Switch back to Staff and confirm it does.

- [ ] **Step 7: Commit**

```bash
git add src/data/hm.ts src/data/design.ts
git commit -m "feat: tag org-wide and platform-scope questions to exclude Senior/Lead as appropriate

Tagged 23 questions: 4 Leadership & influence (hm) as staff/lead/architect,
8 Architecture & system design (hm) as staff/architect, 11 Platform & scale
(design) as staff/architect. Full list in this commit's description.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Copy and README

**Files:**
- Modify: `src/components/Home.tsx` (already updated in Task 3 — verify, no further change expected)
- Modify: `index.html`
- Modify: `README.md`
- Test: `src/__tests__/static.test.ts` (existing "README states the real question count" test — verify it still passes against the new total)

**Interfaces:** none — copy only.

- [ ] **Step 1: Drop "staff" from the `index.html` meta description**

Edit `index.html`:

```html
    <meta name="description" content="Personal practice tool for frontend interview loops: HR screen, hiring manager, live coding, frontend system design, case study, debrief, and head of engineering rounds, across senior, staff, lead and architect scopes." />
```

- [ ] **Step 2: Compute the new total question count**

Run:

```bash
node -e "
const files = ['hr','hm','coding','design','case','debrief','hoe','lead','arch'];
let total = 0;
for (const f of files) {
  const src = require('fs').readFileSync('src/data/' + f + '.ts', 'utf8');
  total += (src.match(/id: '/g) || []).length;
}
console.log(total);
"
```

(This is a rough count via regex, matching the same `grep -c "id: '"` approach used during planning — cross-check it against `questions.length` from a quick `npm test -- data.test.ts` run, since that's the number the static test actually checks against.)

- [ ] **Step 3: Update `README.md`**

- Change the intro paragraph:

```markdown
# Interview Prep

Interactive mock-interview drill for frontend engineer loops in Berlin / EU —
Senior, Staff, Lead or Architect. Nine rounds across the four loops, <N> curated
questions with model answers, key points and likely follow-ups. Reveal, rate
yourself, and weak questions come back first.
```

(Replace `<N>` with the exact count from Step 2 — this must literally equal `questions.length` for the `static.test.ts` assertion to pass.)

- Add a role table after the "Rounds" list (renumber "Rounds" to describe the full catalogue of nine, and note which loop uses which):

```markdown
## Roles
Switch the active role from the Loop date row on the home screen — it's a
per-device setting, like the theme. Progress, notes and stories carry over
between roles; only the round list and the visible question set change.

| Role | Rounds |
|---|---|
| Senior frontend | HR, hiring manager, live coding, system design, case study, debrief |
| Staff frontend | HR, hiring manager, live coding, system design, case study, debrief, head of engineering |
| Lead frontend | HR, hiring manager, live coding, system design, tech lead round, head of engineering |
| Frontend architect | HR, hiring manager, architecture deep-dive, system design, case study, debrief, head of engineering |

## Rounds
1. HR screen (compensation, negotiation, German employment basics)
2. Hiring manager (live code review, web fundamentals, security, regulated & payments FE,
   TypeScript, i18n, reliability, situational, behavioral)
3. Live coding (pairing, debugging, code review, build prompts)
4. Frontend system design (one prompt, 45 minutes)
5. Case study (take-home + presentation)
6. Case study debrief (panel grilling)
7. Head of engineering
8. Tech lead round (Lead only) — people management, delivery, hiring, conflict, running a team's technical direction
9. Architecture deep-dive (Architect only) — cross-team platform decisions, migration strategy, ADRs, design-system governance, build/runtime architecture
```

- Add one sentence to "Adding questions":

```markdown
## Adding questions
Edit `src/data/<round>.ts`. Ids are `<round>-<nnn>`. A question can carry an
optional `roles: RoleId[]` to opt out of roles whose loop would otherwise show
it (e.g. a platform-scoped question tagged away from Senior) — leave it off to
show the question to every role whose loop includes its round. `npm test`
validates shape and uniqueness.
```

- [ ] **Step 4: Run the static test**

Run: `npm test -- static.test.ts`
Expected: PASS (README's stated count now matches `questions.length` exactly).

- [ ] **Step 5: Run the full suite and typecheck one final time**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS. `npm run build` catches anything the dev-mode test run wouldn't (e.g. an unused-import lint-level error in strict `tsc` build mode).

- [ ] **Step 6: Manual smoke test in the browser**

Run `npm run dev`, and click through: Home shows "Staff frontend · Berlin / EU loop" by default with all seven original rounds; switching to each of the other three roles updates the subtitle, the round cards, and the readiness counts; a direct link to `#lead` while Staff is active renders Home (Staff's loop has no `lead` round); switching to Lead and clicking through to `#lead` renders the new round with its Practice/Browse tabs; switching to Architect shows the `arch` round in place of `coding` in the list order implied by its round table.

- [ ] **Step 7: Commit**

```bash
git add index.html README.md
git commit -m "docs: update README and meta description for multi-role support

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Post-plan check

After all ten tasks: `npm test && npm run typecheck && npm run build` must pass with zero skipped or `.only`-scoped tests, and the manual smoke test from Task 10 Step 6 must be re-run once more end to end before opening a PR — per the project's standing rule, do not push without the user's explicit go-ahead, and grep the diff for any employer facts, real stories, or personal/CV specifics before it leaves this branch.
