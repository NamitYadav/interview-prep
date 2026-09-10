# Interview Prep

Interactive mock-interview drill for staff frontend engineer loops in Berlin / EU.
Seven rounds, 255 curated questions with model answers, key points and likely
follow-ups. Reveal, rate yourself, and weak questions come back first.

**Live:** https://namityadav.github.io/interview-prep/

## Rounds
1. HR screen
2. Hiring manager (live code review, web fundamentals, situational, behavioral)
3. Live coding (pairing, debugging, code review)
4. Frontend system design (one prompt, 45 minutes)
5. Case study (take-home + presentation)
6. Case study debrief (panel grilling)
7. Head of engineering

## Ways to drill
- **Round practice** — a weak-first queue for one round. Filter by category, or switch
  to the **Browse** tab to search every question, answer and key point at once.
- **Weak drill** — everything you rated Weak, across all seven rounds, in one queue.
  The set is frozen on entry; re-enter it to rebuild.
- **Mock session** — a cross-round set in one sitting, weighted toward your weak spots.
  Two presets: *Full loop* (a slice of every round) and *Technical rounds* (hiring
  manager, live coding, system design). No timer. Ends in a recap of what you rated.

## Working a question
- **Reveal** the model answer, then tick off the key points you actually said out loud.
  The hit count suggests a rating.
- **Likely follow-ups** stay behind a button, so you answer before you read.
- `[bracket slots]` in an answer are yours to fill from your own experience — the
  answers are coaching scaffolds, not a script to memorise.
- Every question takes a **note**.

## Your own material
- **My notes** — every note you have written, in round order, read-only. Edit them on
  the question itself.
- **My stories** — a STAR-style story bank, independent of any one question. Sorted
  least-recently-rehearsed first, so the stale ones surface. Mark one rehearsed when
  you have said it out loud.

## Keyboard (practice queues)
`Space` reveal · `1` / `2` / `3` rate Weak / OK / Solid · `N` skip.

## Your data
- Ratings, notes and stories stay in your browser (localStorage). Nothing is sent
  anywhere. **Export** / **Import** to back up or move devices; **Reset progress**
  clears everything.
- **Theme**: Dark or Gruvbox, switchable from the top of any page. Stored per device,
  outside the backup.

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
Vite · React 19 · TypeScript · Tailwind CSS 4 · Geist / Geist Mono · Vitest · GitHub Pages
