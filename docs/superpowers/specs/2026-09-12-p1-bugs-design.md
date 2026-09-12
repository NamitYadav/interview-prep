# P1 bug fixes

Six defects found by a review of the running app plus two adversarial hunts. Four are
regressions from the drilling-mechanics branch merged yesterday (#29) — that branch fixed
eight bugs and introduced four, because its review checked the code that changed rather
than the flows that code participates in.

Each fix lands with a test that fails without it.

## 1. Reset destroys stories without disclosing it

`ExportImport.reset` confirms with *"Delete all ratings and notes?"*, but `reset` returns
`emptyState()` — which is `{ progress: {}, notes: {}, stories: {} }`. Verified against the
running app: two seeded stories, Reset, accepted, both gone.

Stories are the highest-effort, least-reproducible content in the app. A destructive
confirm must name everything it destroys.

**Fix:** the confirm names ratings, notes AND stories, with live counts so the user sees
what they are about to lose.

## 2. A Weak rating is silently discarded near the end of a lap

`Practice.advance`, drain branch:

```ts
const [first, ...rest] = requeued;
setRequeued(rest);            // non-functional — clobbers rate()'s append
```

`rate()` does `setRequeued(r => [...r, entry])` and then calls `advance()`. The due-index
branch a few lines up correctly uses a functional update, so the append survives there;
the drain branch overwrites state with `rest`, computed from the pre-append closure.

Repro: rate Q1 Weak, rate Q2..Q4 Solid, rate Q5 Weak. The queue is exhausted and Q1 is not
yet due, so the drain branch fires and Q5's requeue vanishes. The user rates a question
Weak and never sees it again.

**Fix:** `setRequeued((r) => r.slice(1))`.

## 3. Reloading on a requeued repeat rewinds the whole lap

`Practice`'s restore maps the stored position with `history.indexOf(currentId)`. A
requeued question appears **twice** in `history`, so `indexOf` returns its first
occurrence. A lap stored at `historyPos: 9` restores at `0`, and the next advance
truncates history — the user re-does the entire lap.

Fires even when the `known` filter drops nothing, so it is not the deleted-id path.

**Fix:** map the position by counting surviving entries before `stored.historyPos`
instead of searching by id.

## 4. A finished mock session restores at its last question

`clearLap(key)` runs from an effect gated on `lapDone`. `advance()` sets `lapDone` and
calls `onLapComplete()` in the same batch; `MockSession` flips to the recap, unmounting
`Practice` before it ever commits a render with `lapDone === true`. The effect never runs,
the lap persists, and re-picking the same preset restores the finished lap at its last
question.

**Fix:** call `clearLap(key)` synchronously in `advance()` alongside `setLapDone(true)`.
The effect stays as the cleanup path for laps that end while still mounted.

## 5. Hash-navigating between rounds leaves RoundView broken

`App` renders `<RoundView roundId={route} />` with no `key`, so `#design` → `#hr` in one
`hashchange` preserves the component's state:

- `tab` stays `'design-prompt'`, which `hr` has no entry for — empty tab panel, both tabs
  `aria-selected="false"` and `tabIndex={-1}`, tablist unreachable by keyboard.
- `selected` keeps a category from the old round, filtering the new round to zero.
- `Practice`'s `key={selected ?? ''}` omits `roundId`, so it keeps a history of old-round
  ids and renders nothing.

**Fix:** `key={route}` on `RoundView`, and include `roundId` in `Practice`'s key.

## 6. Recording cannot be stopped after reveal, and the take is discarded

The recorder toggle renders only inside the `!revealed` branch of `QuestionCard`. Reveal
while recording — by button, by Space, or by strict mode auto-revealing — and the only
Stop control unmounts while `wantRecordingRef` is still true. The mic stays live, and on
advance the unmount cleanup detaches `onstop` before stopping tracks, so the audio is
thrown away: no `recorder.url`, and the post-reveal player never appears.

This is a regression from the click-to-toggle change. Hold-to-record could not strand
itself, because releasing the pointer always fired.

**Fix:** stop recording when the answer is revealed, so the take is captured and the mic
released at exactly the moment the user stops talking.

## Out of scope

Every P2 and P3 from the same review — the mock recap baseline, Browse focus theft, the
dead ErrorBoundary link, uncapped drafts, the spurious stale-tab banner, `document.title`,
the rating radiogroup's arrow keys, focus after unmount, live-region mounting, Reset not
clearing laps/drafts, the MediaRecorder constructor stream leak, and the print defects.
