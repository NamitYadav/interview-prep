# Drilling mechanics — bug fixes

**Goal:** Stop the app losing your work and your place. Every item here is a defect
found by independent review that costs something during a real study session; none is
a refactor and none is a new feature.

**Scope:** code only, no content. Eight fixes.

## Global constraints

- `tsc`, `eslint .`, `vitest run`, `npm run build` green. Every fix lands with a test
  that fails without it.
- Persisted prep data (`Persisted` v2: progress, notes, stories) keeps its shape, and
  old backups must still import. Per-device preferences stay OUT of backups, matching
  `useStrictMode`/`useLoopDate`.
- No new runtime dependencies.

## 1. Key-point checkboxes are dead in Browse and `#search`

`QuestionCard.tsx` does `const checkedSet = checked ?? new Set<number>()` and calls
`onCheckedChange?.(next)`. Practice passes both; **Browse passes neither**, so in Browse
and `#search` every checkbox is pinned to `checked={false}`, cannot be ticked, and the
suggested-rating line is frozen at `0/N`. No test covers it.

**Fix:** internal fallback state — `const [own, setOwn] = useState(new Set())`, use
`checked ?? own` and `onCheckedChange ?? setOwn`. Controlled where Practice needs it to
survive Back, self-managing everywhere else.

## 2. Your place in a lap is lost on reload, tab switch, or a backgrounded tab

`Practice.tsx` holds `history`, `historyPos`, `requeued`, `step` and `lapDone` as
component state. A reload — or a phone discarding a backgrounded tab — drops you back to
the top of a 287-question queue. `useAppState` already flushes ratings on
pagehide/visibilitychange; lap position was simply never included.

**Fix:** persist `{ key, history, historyPos, requeued, step }` under
`interview-prep:lap` (per-device, not in backups). `key` identifies the question set —
derived inside `Practice` from the set itself (first id, last id, length) so no caller
signature changes and a restore into the wrong set is impossible. A key mismatch starts a
fresh lap rather than restoring.

## 3. Three text fields discard what you type

- **`yourAnswer`** (`QuestionCard`) — ephemeral by design, but `key={current.id}`
  discards it on Back, which is inconsistent with `checkedByQuestion`, deliberately
  hoisted into `Practice` for exactly that reason.
- **The scratch editor** (`QuestionCard`, `question.scratch` questions) — an
  *uncontrolled* `<textarea defaultValue={question.code}>` with no `onChange` at all, so
  code written during a live-coding drill is captured nowhere and dies on advance.
- **The 45-minute design scratch pad** (`DesignSession.tsx:57`) — plain `useState`, no
  persistence, no `beforeunload`. A stray navigation loses an entire design write-up.

**Fix, two mechanisms by lifetime:**
- `yourAnswer` is hoisted into `Practice` alongside `checkedByQuestion` (survives Back,
  still cleared when the lap ends — it is a self-check, not an artefact).
- The scratch editor and the design pad are real work, so they persist to a new
  per-device `interview-prep:drafts` store keyed `${questionId}:${field}`, committed
  through the existing `useDebouncedField`. Deliberately NOT routed into `state.notes`:
  notes are a first-class user-facing list and scratch code would pollute it.

## 4. Import replaces everything with no confirmation

`ExportImport.importJson` dispatches `{type:'import'}` the instant a file is picked — no
confirm, no summary, no undo. Reset *does* confirm and destroys strictly less. This fires
exactly when the user is recovering after clearing browser data.

**Fix:** parse first, then confirm with real counts from the parsed backup and the
current state ("Replace 42 rated questions with this backup's 30?"), then dispatch, then
show a `role="status"` confirmation. A parse failure keeps showing the existing error and
never prompts.

## 5. A question rated Solid never comes back

`queue.ts` `bucket()` puts rating 3 in bucket 3, and a lap only ends once every question
has been shown — with 287 questions that never happens in a sitting, so bucket 3 is
functionally unreachable and a week-1 Solid is gone for the rest of your prep.

Meanwhile `types.ts` still declares `dueAt`, `interval` and `easeFactor`; `storage.ts`
validates them and `storage.test.ts` tests that validation. **Nothing writes or reads
them** — `queue.ts` is explicit that it is deliberately not SM-2. The app carries an SM-2
schema and gets none of the benefit.

**Fix:** make ordering time-aware in one line — a Solid decays to the OK bucket after
seven days — and delete the three dead fields with their validation and test row. Old
backups still import: `validate` ignores unknown keys.

## 6. Deleting a story within 300ms of typing resurrects it

`useDebouncedField`'s unmount flush fires after `deleteStory`, and `saveStory` recreates
the record from `state.stories[action.id] ?? { title: '', body: '' }`. The user deletes,
confirms, and it comes back with a blank title. Same shape re-adds a note after Reset.

**Fix:** make `saveStory` merge-only — `if (!state.stories[action.id]) return state` —
and add an explicit `createStory` action for the "+ New" button. A late commit against a
deleted story then correctly does nothing.

## 7. Two tabs silently overwrite each other

`useAppState` writes the whole `Persisted` blob on a debounce and nothing listens for
`storage`. Two tabs open across a study session means the last write wins and the other
tab's ratings, notes and stories are gone. This is the only unbounded data-loss path left.

**Fix:** a `storage` listener on `STORAGE_KEY` that surfaces a banner reusing the
existing `saveFailed` shape — "another tab changed your progress, reload to see it" —
rather than silently merging or silently clobbering. Detection, not resolution: a real
merge needs per-field causality this app has no reason to carry.

## 8. Hold-to-record can leave the mic open, and is keyboard-inoperable

`useRecorder.start()` awaits `getUserMedia` while `stop()` reads a still-null
`recorderRef`, no-ops, and then the await resolves and starts a recording nothing will
stop. A quick tap — or the first-use permission prompt — leaves the mic live for the
session. The control is `onPointerDown`/`onPointerUp` only, so keyboard and switch users
cannot record at all (WCAG 2.1.1, Level A).

**Fix:** one click-to-toggle button with `aria-pressed`. Removes the press/release
pairing that creates the race, and deletes three handlers. Unmount cleanup also detaches
`onstop` before stopping tracks, so the teardown cannot mint a leaked object URL and set
state on a dead hook.

## Out of scope

Extracting the `Practice` lap reducer; deduping the rating radiogroup and the
four-times-duplicated localStorage hook; `Record<RoundId, Round>`; the `code`/`scratch`
discriminated union; bundle splitting; PWA/offline; all content work.
