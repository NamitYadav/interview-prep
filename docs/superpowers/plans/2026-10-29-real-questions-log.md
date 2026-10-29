# Real-questions log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log the questions real interviewers asked, each with your own answer, and drill them with the existing Weak/OK/Solid loop.

**Architecture:**
- **Storage:** a new `log` record in the persisted blob, which moves to version 3. v1 and v2 data migrate with an empty log.
- **Drilling:** an adapter turns each entry into a `Question` with the ID `log:<uuid>`, so `Practice`, `orderQueue`, ratings and drafts all work unchanged.
- **Screens:** a `#log` route holds the editor and the drill, and weak entries also join the Weak drill.

**Tech Stack:** React 19, TypeScript, Tailwind 4, Vitest with jsdom and Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-29-real-questions-log-design.md`

## Global Constraints

- `STORAGE_KEY` stays `interview-prep:v1`. Only `Persisted.version` changes, to `3`.
- Logged-question IDs in `progress` and in drafts are `'log:' + uuid`, and log keys come from `crypto.randomUUID()`.
- Add no new dependencies.
- The UI copy is exact:
  - route title: "Real questions";
  - subtitle: "Questions real interviewers asked you. Add them the same day.";
  - add button: "+ Add question";
  - drill button: "Drill these";
  - empty state: "Nothing logged yet. After a real round, add each question you remember while it's fresh.";
  - blank answer: "No answer written yet. Add one under Real questions.";
  - Weak drill subtitle: "Everything you rated weak in your loop, plus weak real questions."
- Do not add a company or pipeline field, a link to a bank question, or log entries in the round queues, Mock, Search, Notes or Print.
- Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Per Namit's rule there is one commit at the end, pushed straight to `main`, and no commits per task.

## Review Focus

1. **Deleting an entry while its answer field still has a pending edit:** the entry must stay deleted. The flush on unmount must not bring it back (Task 2 test).
2. **An entry with an empty question:** it never appears in any drill, and the Weak drill includes it only once it has a question and a weak rating (Tasks 3 and 5 tests).
3. **The date input:** a date is the local calendar day, not UTC. Picking 29 Oct shows 29 Oct after a reload, even just after midnight in Berlin (Task 4 test).
4. **A logged question whose round is outside the active role's loop:** it still appears in the Weak drill and in the log's own drill (Task 5 test).
5. **A deleted entry's rating:** it must not keep counting in Home's weak count or in the export summary (Task 2 test, and Task 5 counts from `log`).

---

### Task 1: Data and storage v3

**Files:**
- Modify: `src/types.ts`
- Modify: `src/lib/storage.ts`
- Modify: the `version: 2` fixtures in `src/__tests__/helpers.ts` (`EMPTY`), `store.test.ts`, `storage.test.ts` and `ExportImport.test.tsx`. Each gains `log: {}` and moves to version 3, unless the test is about migrating v2.
- Test: `src/__tests__/storage.test.ts`

**Interfaces:**
- Produces:
  - `LoggedQuestion { question: string; round: RoundId; answer: string; at: number }`;
  - `Log = Record<string, LoggedQuestion>`;
  - `Persisted { version: 3; progress; notes; stories; log: Log }`;
  - `emptyState()` with `log: {}`.

- [ ] **Step 1: Write the failing tests** in `storage.test.ts`:
  - `'v1 and v2 backups load with an empty log'`: `validate({version:1,progress:{},notes:{}}).log` and the v2 equivalent both `toEqual({})`, and `.version === 3`.
  - `'a v3 log round-trips'`: `parseBackup(JSON.stringify(withLog))` `toEqual(withLog)`, where `withLog` has one entry `{question:'Why Berlin?', round:'hr', answer:'', at: 1_700_000_000_000}`.
  - `'an invalid log round is refused on import and dropped on load'`:
    - `parseBackup` of a blob with `round:'nope'` throws `/Invalid log entry/`;
    - `load()` of the same blob keeps the valid entries and drops the bad one.
  - `'a future at still imports'`: `at: Date.now() + 30*86_400_000` parses.
  - `'a v4 blob blocks saving'`: `load()` of `{version:4}` makes `saveBlockedReason()` non-null.
- [ ] **Step 2:** Run `npx vitest run src/__tests__/storage.test.ts`. Expect the new tests to fail.
- [ ] **Step 3: Implement.**
  - Add `isLogged(v): v is LoggedQuestion`, with `round` checked against `ROUND_IDS` from `../data`.
  - `validate` accepts versions 1–3. The log is read only from v3 (`raw.version === 3 ? raw.log : {}`), and a bad entry throws `Invalid log entry for ${id}`.
  - Change `load`'s guard to `> 3`, and give `salvage` a `log: keep(..., isLogged)`.
  - Update the comments that say "v2". Add no limit on `at` in `parseBackup`.
- [ ] **Step 4:** Run `npx vitest run` and `npx tsc -b`. Expect all tests to pass and no type errors once the fixtures are updated.

### Task 2: Reducer actions

**Files:**
- Modify: `src/hooks/useAppState.ts`
- Test: `src/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `LoggedQuestion` (Task 1).
- Produces these `Action` members:
  - `{ type: 'createLogged'; id: string; round: RoundId; now: number }`;
  - `{ type: 'saveLogged'; id: string; question?: string; round?: RoundId; answer?: string; at?: number }`;
  - `{ type: 'deleteLogged'; id: string }`.

- [ ] **Step 1: Write the failing tests:**
  - `'createLogged adds a blank entry once'`: the second create with the same ID leaves the state `toBe` the same object.
  - `'saveLogged merges one field and never creates'`.
  - `'saveLogged after deleteLogged is a no-op'`: `reducer(deleted, {type:'saveLogged', id, answer:'x'})` returns `deleted` unchanged.
  - `'deleteLogged removes the entry and its rating'`: `progress['log:'+id]` is undefined afterwards, and the other ratings are kept.
- [ ] **Step 2:** Run `npx vitest run src/__tests__/store.test.ts`. Expect failures.
- [ ] **Step 3: Implement** the three cases, following the `createStory`, `saveStory` and `deleteStory` pattern and their comments.
- [ ] **Step 4:** Run it again. Expect it to pass.

### Task 3: Adapter, QuestionCard and Practice

**Files:**
- Create: `src/lib/log.ts`
- Modify: `src/components/QuestionCard.tsx`, `src/components/Practice.tsx`
- Test: `src/__tests__/log.test.ts` (new), `QuestionCard.test.tsx`, `Practice.test.tsx`

**Interfaces:**
- Produces from `src/lib/log.ts`:
  - `LOG_PREFIX = 'log:'`;
  - `toQuestion(id: string, entry: LoggedQuestion): Question`;
  - `loggedQuestions(log: Log): Question[]`, which skips entries whose `question.trim()` is empty;
  - `localDay(ts: number): string`, giving `YYYY-MM-DD` in local time, used for both grouping and the date input;
  - `fromLocalDay(day: string): number`, giving local midnight.
- Produces: QuestionCard's `onNote` becomes optional, and the note section renders only when it is passed.

- [ ] **Step 1: Write the failing tests:**
  - `log.test.ts`:
    - `toQuestion` gives `id 'log:abc'`, `keyPoints []`, and `category` matching `/^Asked /`.
    - The answer `'- one\n\n• two\nthree'` becomes `['one','two','three']`.
    - A blank answer becomes `['No answer written yet. Add one under Real questions.']`.
    - `loggedQuestions` skips a `'  '` question.
    - `fromLocalDay(localDay(t))` round-trips to the same local day, including `t` at 00:30 local time.
  - `QuestionCard.test.tsx`: `'a question with no key points shows no checklist or suggestion'`. After the reveal there is no `/key points hit/` text and no checklist. `gradingPrompt(q, 'x')` does not contain `'A strong answer covers'`.
  - `Practice.test.tsx`: `'a logged question shows no note field'`. Render Practice with `[toQuestion('a', entry)]`, reveal it, and `queryByLabelText('Your note')` is null.
- [ ] **Step 2:** Run those three files. Expect failures.
- [ ] **Step 3: Implement.**
  - `toQuestion` labels the category with `toLocaleDateString(undefined, {day:'numeric', month:'short'})`.
  - In QuestionCard:
    - hide the key-point block and the suggestion line when `keyPoints.length === 0` and the question isn't graded;
    - `gradingPrompt` replaces the "A strong answer covers" block with "Judge it on its own merits; there is no model answer." when there are no key points;
    - wrap the note `<section>` in `onNote && (...)`. `useDebouncedField(note, onNote ?? noop)`.
  - Practice passes `onNote` only when `!current.id.startsWith(LOG_PREFIX)`.
- [ ] **Step 4:** Run `npx vitest run`. Expect everything to pass.

### Task 4: LogView, route and Home link

**Files:**
- Create: `src/components/LogView.tsx`
- Modify: `src/types.ts` (`Route` gains `'log'`), `src/data/index.ts` (`ROUTES`), `src/App.tsx` (`VIEW_TITLES.log = 'Real questions'` and render `<LogView>`), `src/components/Home.tsx` (link)
- Test: `src/__tests__/LogView.test.tsx` (new), `App.test.tsx`, `Home.test.tsx`

**Interfaces:**
- Consumes:
  - the actions from Task 2;
  - `loggedQuestions`, `localDay` and `fromLocalDay` from Task 3;
  - `Practice` props as `WeakDrill` uses them, with `lapId="log"`.
- Produces: `LogView({ state, dispatch, strictMode, shortcuts, role })`.

**Layout:**
- **Header and empty state:** follow `StoriesView`.
- **Entries:** grouped under a `<h2>` per local day, newest day first and newest entry first within a day.
- **Each card has:**
  - a question `<textarea aria-label="Question">`;
  - a round `<select aria-label="Round">` over all `rounds`;
  - an `<input type="date" aria-label="Date" max={today}>`;
  - an answer `<textarea aria-label="Your answer">`;
  - a rating label when one exists;
  - Delete, with the confirm "Delete this question?".
- **Text fields:** `useDebouncedField`.
- **Round default:** the round of the entry with the greatest `at`, else `'hm'`.
- **Drill:** "Drill these" shows only when `loggedQuestions(state.log).length > 0`.
  - It sets local `drilling` state. The question set is frozen in `useState` when the drill child mounts.
  - The drill renders `Practice` and a "Back to the list" button. No sub-hash: browser Back leaves `#log`.
- **Home:** a link `href="#log"` after My stories, labelled "Real questions". Its meta reads `"${n} questions · ${w} weak"`, or "None yet" when `n === 0`.

- [ ] **Step 1: Write the failing tests** in `LogView.test.tsx`, rendering through `App` at `#log`, as `StoriesView.test.tsx` does:
  - `'add, type, reload: the question is kept'`;
  - `'a new entry takes the previous entry's round'`;
  - `'entries group under their day, newest first'`;
  - `'a picked date survives a reload'`;
  - `'Drill these serves weak before solid and skips empty questions'`;
  - `'Delete asks first'`.

  Also:
  - `App.test.tsx`: `#log` sets `document.title` to `'Real questions · Interview Prep'`.
  - `Home.test.tsx`: the link reads "None yet" when empty and "2 questions · 1 weak" with data.
- [ ] **Step 2:** Run them. Expect failures.
- [ ] **Step 3:** Implement as laid out above.
- [ ] **Step 4:** Run `npx vitest run`, `npm run lint` and `npx tsc -b`. Expect all to pass and both to be clean.

### Task 5: Weak drill and Home weak count

**Files:**
- Modify: `src/components/WeakDrill.tsx`, `src/components/Home.tsx`
- Test: `WeakDrill.test.tsx`, `Home.test.tsx`

**Interfaces:**
- Consumes: `loggedQuestions` (Task 3).

- [ ] **Step 1: Write the failing tests:**
  - `'a weak logged question joins the drill, whatever its round'`: use role `senior` and a logged `backend` question rated 1. Its text appears in the drill.
  - The subtitle is the exact string from Global Constraints.
  - Home: one weak bank question plus one weak logged question gives "2 rated weak".
- [ ] **Step 2:** Run them. Expect failures.
- [ ] **Step 3: Implement.**
  - WeakDrill's frozen set is `[...questions, ...loggedQuestions(state.log)]` filtered by `rating === 1`.
  - Home's `weak` adds `loggedQuestions(state.log).filter(rated 1).length`.
  - Update the empty-state copy only if it no longer reads true.
- [ ] **Step 4:** Run it again. Expect it to pass.

### Task 6: Export, import and Reset counts, then ship

**Files:**
- Modify: `src/components/ExportImport.tsx`, `README.md` (one feature line)
- Test: `ExportImport.test.tsx`

- [ ] **Step 1: Write the failing tests:**
  - The import confirm text contains `"1 logged question"` (pluralised with the existing `plural`).
  - The Reset confirm contains `"1 logged question"`.
- [ ] **Step 2:** Run it. Expect failures.
- [ ] **Step 3: Implement.**
  - Add `plural(Object.keys(p.log).length, 'logged question')` to `summary` and to `counts`.
  - Update the comment that says "all three".
- [ ] **Step 4: Run every check.**
  - Run `npm run lint && npx tsc -b && npx vitest run && npm run build`. All must pass.
  - Run `npm run smoke`. Expect 6 PASS.
  - Drive `#log` in headless Chromium against `dist`: add two questions, rate one weak, and check that it appears in `#weak`.
- [ ] **Step 5: Commit and push to `main`.** The commit contains the spec, this plan and the code. Check the Pages deploy.
