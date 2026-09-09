# Interview Prep

Interactive mock-interview drill for staff frontend engineer loops in Berlin / EU.
Seven rounds, ~227 curated questions with model answers, key points and likely
follow-ups. Reveal, rate yourself, and weak questions come back first.

**Live:** https://namityadav.github.io/interview-prep/

## Rounds
1. HR screen
2. Hiring manager (technical + behavioral)
3. Live coding (pairing, debugging, code review)
4. Frontend system design (one prompt, 45 minutes)
5. Case study (take-home + presentation)
6. Case study debrief (panel grilling)
7. Head of engineering

## Using it
- **Practice**: `Space` reveal · `1` / `2` / `3` rate Weak / OK / Solid · `N` skip.
- **Browse**: search and expand any question.
- Notes and ratings stay in your browser (localStorage). Use **Export** / **Import** to back up or move devices.

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
Vite · React 19 · TypeScript · Tailwind CSS 4 · Vitest · GitHub Pages
