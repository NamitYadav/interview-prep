# Real-questions log

**Date:** 2026-10-29
**Status:** approved 2026-10-29, implemented

## Goal

Keep the questions real interviewers asked, each with Namit's own answer, and
drill them with the same Weak/OK/Solid loop as the bank. The bank is a guess at
what Berlin loops ask; the log is what they actually asked, so it is the most
valuable material once interviews start.

Accepted in the 2026-10-23 feature review. Namit asked for the spec to be
drafted without further questions, so every decision below except the goal is
Claude's call and is marked as such where it isn't obvious.

## How it is used (Claude's call)

- **The evening of a round:** open Real questions on the phone or laptop, add
  each question you remember (a few seconds each: text and round), and write down
  what you said while it's fresh. Answers can be left blank and filled in later.
- **The days after:** rewrite each answer into what you'd say next time, then
  drill. Weak ones also turn up in the Weak drill next to weak bank questions.

## Non-goals

- **No company, interviewer or pipeline fields.** A per-company list was rejected
  in the October review. The entry's date is enough to tell rounds apart.
- **No link to a bank question.** "This is basically hm-027" is useful, but you
  can say so in the answer text. Add a link only if typing it becomes a habit.
- **Not mixed into the round queues, Mock session, Search, Notes or Print.**
  Round progress bars and category verdicts keep measuring the bank only.
- **No cloud sync or sharing.** Same localStorage blob and JSON backup as
  everything else.
- **No import from the bank's note field.** Nothing to migrate: notes are
  per-bank-question.

## 1. Data

### Types (`src/types.ts`)

```ts
export interface LoggedQuestion {
  question: string;
  round: RoundId;
  answer: string;   // what you said, then what you'd say next time; may be ''
  at: number;       // when it was asked; defaults to when it was added
}
export type Log = Record<string, LoggedQuestion>;   // key: crypto.randomUUID()
export interface Persisted { version: 3; progress: Progress; notes: Notes; stories: Stories; log: Log }
```

One answer field, not separate "what I said" and "better answer" fields (Claude's
call): the answer gets rewritten over time and the old version isn't drilled.

### Storage (`src/lib/storage.ts`)

- `emptyState()` returns `version: 3` with `log: {}`.
- `validate` accepts versions 1, 2 and 3. Versions 1 and 2 migrate with
  `log: {}`. A v3 log entry is valid when `question` and `answer` are strings,
  `round` is one of `ROUND_IDS`, and `at` is a finite number.
- `load`'s newer-version guard moves from `> 2` to `> 3`.
- `salvage` keeps each valid log entry, as it already does for stories.
- `parseBackup` puts no limit on `at` (Claude's call). A future date only
  changes where the entry sorts. Unlike `lastSeen`, `at` comes from a date input,
  so a limit would let one mis-tapped date make the whole backup impossible to
  import. The date input still sets `max` to today.
- `STORAGE_KEY` stays `interview-prep:v1`. The key never followed the version.

An older deploy that loads a v3 blob hits its own `> 2` guard and refuses to
save over it, so a rollback can't destroy the log.

### Ratings and drafts

A logged question is rated like any other: its `progress` key is `log:<uuid>`.
The prefix keeps the key from colliding with a bank ID and makes these entries
easy to find. The QuestionCard's answer draft works unchanged, keyed by the same
ID.

Logged questions get no "Your note" field (Claude's call). The entry's own
answer is where you write about it, and a note under `notes['log:<id>']`
couldn't be found again: Notes and Print list only bank questions.

### Reducer actions (`src/hooks/useAppState.ts`)

Modelled on the story actions, including their reasons:

- `createLogged { id, round, now }`: adds `{ question: '', round, answer: '', at: now }`.
  Does nothing if the ID exists.
- `saveLogged { id, question?, round?, answer?, at? }`: merges into an existing
  entry, never creates one, so a debounced field flushing after a delete can't
  bring the entry back.
- `deleteLogged { id }`: removes the entry and its `progress['log:<id>']`.

## 2. Screens

### Home

There's a new "Real questions" link in the drills list, next to My stories. Its
meta line reads "N questions · M weak", or "None yet" when the log is empty.

### Route `#log`, view `LogView`

- Add `'log'` to `Route`, `ROUTES` and `VIEW_TITLES` (title "Real questions").
- Header: the title, a short line ("Questions real interviewers asked you. Add
  them the same day."), and a "+ Add question" button.
- **Adding:** the button creates an entry and focuses its question field, the
  same way New story does. The round defaults to the round of the most recently
  added entry, or `hm` when the log is empty (Claude's call). Adding the third
  question from the same interview should need no round change.
- **Each entry** is an editable card:
  - a question textarea;
  - a round `<select>` listing every round, not only the active role's, because
    a real loop doesn't follow the role switcher;
  - a date input (`<input type="date">`, local date) set from `at`;
  - an answer textarea;
  - the rating, if it has one, as a small Weak/OK/Solid label;
  - Delete, with a confirm.

  Text fields use `useDebouncedField`, so they also save on tab close.
- **Order:** newest `at` first, grouped under a date heading per day (Claude's
  call). One day is usually one interview, so you add the questions from a round
  together and find them together.
- **Drill:** a "Drill these" button above the list, shown once at least one entry
  has a non-empty question. It switches the view to a `Practice` over the log
  with `lapId="log"`, ordered by the existing `orderQueue`, so weak and unseen
  questions come first. A Back control returns to the list. Entries with an empty
  question are left out of the drill.
- **Empty state:** a dashed box like the Stories one: "Nothing logged yet. After
  a real round, add each question you remember while it's fresh."

### Logged questions as `Question`s

One adapter, `toQuestion(id, entry): Question`, used by the drill and the Weak
drill:

- `id: 'log:' + id` and `round: entry.round`.
- `category: 'Asked ' + local date`, which the card's category chip shows, for
  example "Asked 29 Oct".
- `question: entry.question`.
- `answer`: the answer split into non-empty lines, with a leading `- ` or `• `
  stripped. When the answer is blank it is a single line: "No answer written yet.
  Add one under Real questions."
- `keyPoints: []`. No `followUps`, `deeper` or `roles`.

QuestionCard already copes with most of this. Three changes:

- For `log:` IDs, hide the "Your note" section. One way is for Practice to
  leave out `onNote`. The builder chooses.
- With no key points, hide the key-point checklist and the "x/y key points hit ·
  suggested" line. `suggestedRating` already returns `undefined` for zero
  points; check that nothing dereferences it.
- `gradingPrompt` leaves out the "A strong answer covers:" block when there are
  no key points, and asks the assistant to judge the answer on its own merits.

The round timer uses the logged round's `targetSeconds`, which is fine.

### Weak drill

`WeakDrill` adds every weak logged question to its frozen set, whatever its
round and whichever role is active (Claude's call). These are questions you were
actually asked, so switching role shouldn't hide them. The subtitle becomes
"Everything you rated weak in your loop, plus weak real questions." The Weak
drill link on Home counts them in its "N rated weak", so the link and the drill
show the same number. Where logged questions sit in the drill order is the
builder's choice.

### Settings: export, import, reset

- The import confirmation and the "imported" summary include "N logged
  questions".
- Reset names logged questions in its list of what it deletes. `emptyState()`
  already clears them.
- The backup filename doesn't change.

## 3. Tests

Each item is a test that fails without the feature:

- `storage.test.ts`:
  - v1 and v2 backups load with an empty log;
  - a v3 round trip;
  - an invalid `round` is refused on import but salvaged out on load;
  - a future `at` imports;
  - a v4 blob blocks saving.
- `store.test.ts`:
  - `saveLogged` after `deleteLogged` is a no-op;
  - `deleteLogged` removes the entry's rating.
- `LogView.test.tsx`:
  - add, type, reload, and the entry is still there;
  - the round defaults to the previous entry's round;
  - date grouping;
  - Drill serves weak entries before solid ones;
  - an empty question is left out of the drill;
  - Delete confirms.
- `QuestionCard.test.tsx`: a question with no key points shows no checklist or
  suggestion, and its grading prompt has no "strong answer covers" block.
- `Practice.test.tsx`: a logged question shows no note field.
- `WeakDrill.test.tsx`: a weak logged question appears alongside weak bank
  questions, including one whose round is outside the active role's loop.
- `Home.test.tsx`: the weak count includes weak logged questions.
- `ExportImport.test.tsx`: the summary and the reset text count logged questions.
- `App.test.tsx`: `#log` renders and gets the title "Real questions · Interview
  Prep".

## 4. Left to the builder

- File layout, whether `toQuestion` lives in `src/lib/` or next to `LogView`, and
  component names.
- The exact Tailwind classes, following the Stories cards.
- Whether "Drill these" swaps the view in place or uses a sub-hash like
  `#log/drill`. Either way, browser Back should leave the drill.
- How Practice's lap behaves when entries are added or deleted mid-lap. Follow
  how `lapId` laps already handle a changed question list.
