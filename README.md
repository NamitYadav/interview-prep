# Interview Prep

Interactive mock-interview drill for staff frontend engineer loops in Berlin / EU.
Nine rounds, 355 curated questions with model answers, key points and likely
follow-ups. Reveal, rate yourself, and weak questions come back first.

**Live:** https://namityadav.github.io/interview-prep/

## Rounds
1. HR screen (compensation, negotiation, German employment basics)
2. Hiring manager (live code review, web fundamentals, security, regulated & payments FE,
   TypeScript, i18n, reliability, situational, behavioral)
3. Live coding (pairing, debugging, code review, build prompts)
4. Frontend system design (one prompt, 45 minutes)
5. Case study (take-home + presentation)
6. Case study debrief (panel grilling)
7. Head of engineering
8. Tech lead round (people management, delivery, hiring, conflict, technical direction)
9. Architecture deep-dive (cross-team platform, migration strategy, ADRs, design-system
   governance, build/runtime architecture)

## Ways to drill
- **Round practice** — a priority queue for one round: weak questions come first,
  then unseen, then ok, then solid. Rating a question Weak doesn't just leave it —
  it comes back around roughly 8 questions later, in the same lap, instead of
  waiting for a whole different lap. Filter by category and by status —
  *Unseen* (never rated), *Weak*, *OK*, *Solid* — or switch to the
  **Browse** tab to search every question, answer and key point at once (a Top
  button appears once you have scrolled a way down it). The status filter is frozen
  when you pick it, so rating a question doesn't pull it out from under the lap; pick
  it again to rebuild the set. The progress bar keeps describing the whole category
  either way. A lap
  ends once every question (and every requeued one) has been shown, with a
  summary and a way to start another.
- **By category** — a collapsed panel on every round showing where you stand in each
  of its categories: a bar of the weak/ok/solid split and a one-word verdict (Weak,
  OK, Solid, or Unrated), averaged over the questions you have actually rated. A
  Solid that has gone stale counts as OK here, same as everywhere else. Click a row to
  drill that category, click it again to go back to all — the category select beside the
  tabs moves with it, and stays the way to change the filter without opening the panel.
- **Weak drill** — everything you rated Weak, across all seven rounds, in one queue.
  The set is frozen on entry; re-enter it to rebuild.
- **Mock session** — a cross-round set in one sitting, in round order, like a real
  loop day. Two presets: *Full loop* (a slice of every round) and *Technical rounds*
  (hiring manager, live coding, system design). A banner marks each round
  transition. Ends in a recap, either by hitting Finish or once you have gone
  through the whole set.
- **Frontend system design → 45-min prompt** — a third tab on the design round: one
  prompt, a visible (non-forcing) 45-minute clock, and the requirements → API/data →
  components → state → performance → a11y/i18n → observability → rollout phase
  checklist to work through out loud, plus a scratch pad. Finish reveals the model
  answer and lets you rate yourself.
- **Search** — every question, every round, in one search box, with the same status
  filter (Unseen / Weak / OK / Solid).
- **Print cheat sheet** — everything rated Weak plus everything you have a note on,
  grouped by round, laid out for printing before you walk in.

## Working a question
- Write **your answer** in three bullets first — before you reveal anything. It
  stays visible above the model answer once revealed, so you're comparing what you
  actually said, not just reading key points cold.
- If your browser supports it, **hold to record** a spoken answer; play it back
  once revealed. Nothing is saved or sent anywhere — it's gone the moment you move
  to the next question.
- **Reveal** the model answer, then tick off the key points you actually said out loud.
  The hit count suggests a rating. Once revealed, the card shows how long you took and
  the round's target time — a stopwatch, not a countdown, so nothing forces a hide,
  unless you turn on **Strict mode** (below).
- **Back** steps to the previous question if you want to re-rate it; disabled at the
  start of a lap.
- **Likely follow-ups** — probe yourself on one at a time, before you reveal, each
  with its own running clock from the moment you asked for it. Once revealed, they're
  listed in full for reference.
- On categories that call for a real story (from your CV, motivation, leadership,
  situational, and similar), your **story bank** shows up before you answer — pick
  one with "Use this" and it expands inline and marks itself rehearsed.
- `[bracket slots]` in an answer are yours to fill from your own experience — the
  answers are coaching scaffolds, not a script to memorise.
- Every question takes a **note**.
- The **Live coding** build prompts and the data-structures questions give you an
  editable scratch pad pre-filled with the starter code, instead of a read-only
  snippet — write your approach out before revealing. What you type is kept per
  question on this device, so a reload or a switch to another question doesn't lose
  it; it stays out of export/import backups.

## Your own material
- **My notes** — every note you have written, in round order, read-only. Edit them on
  the question itself.
- **My stories** — a STAR-style story bank, independent of any one question. Sorted
  least-recently-rehearsed first, so the stale ones surface. Mark one rehearsed when
  you have said it out loud, or pull one up mid-question via "Use this".

## Readiness
Set a **Loop date** on the home screen and every round card shows how many
questions are unseen, how many are weak, and how many days you have left; cards
themselves reorder by urgency (weak and unseen count more) while the Round N label
stays fixed to its usual position. A banner nudges you to export if you have
progress and haven't backed it up in the last week.

## Keyboard (practice queues)
`Space` reveal · `1` / `2` / `3` rate Weak / OK / Solid · `N` skip · `B` back.

## Your data
- Ratings, notes and stories stay in your browser (localStorage). Nothing is sent
  anywhere. **Export** / **Import** to back up or move devices; **Reset progress**
  clears everything.
- **Theme**: Dark, Gruvbox or Light, switchable from the top of any page. Stored per
  device, outside the backup.
- **Strict mode**: switchable from the top of any page. When on, running out of a
  round's target time auto-reveals the answer instead of waiting for you to click
  Reveal. Stored per device, outside the backup.
- **Focus sound**: white, pink or brown noise synthesized in the browser (Web Audio)
  and looped while you drill, with a volume slider, in Settings. No audio files are
  downloaded. The chosen sound and volume are stored per device, outside the backup;
  playback never starts on its own, so press Play after a reload. While it plays, the
  Settings button shows a ♪.
- **Scratch pads** (Build-prompt code, 45-minute design write-ups), lap positions and
  the running design session are working state, stored per device and outside the
  backup: a new machine starts them fresh. Anything worth keeping goes in a note.

## Adding questions
Edit `src/data/<round>.ts`. Ids are `<round>-<nnn>`. `npm test` validates shape and uniqueness.

## Development
```bash
npm install
npm run dev        # http://localhost:5173/interview-prep/
npm test           # vitest watch
npm run build      # tsc + vite build
```

## Stack
Vite · React 19 · TypeScript · Tailwind CSS 4 · GeistMono Nerd Font (self-hosted from
public/fonts) · Vitest · GitHub Pages

One JS bundle, ~300KB gzipped — most of it is the question bank's own text, not
code. Measured, not optimized: code-splitting would trim the initial load, but this
is a single-user app run from a laptop, so it isn't worth the added complexity.
Skipped for the same reason: a CSP `<meta>` tag (the inline pre-paint theme script
would need a build-time hash to keep it, which is fragile for the gain on a static
page with no user input to sanitize), type-aware ESLint rules (`recommendedTypeChecked`
surfaces a long tail of findings unrelated to this app's actual bugs), and Prettier
(the codebase is formatted consistently by hand).
