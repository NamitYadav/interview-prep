# Staff Frontend Interview Prep — Design

**Date:** 2026-09-08
**Repo:** `/Users/namit/personal/interview-prep` → `github.com/NamitYadav/interview-prep`
**Deploy:** GitHub Pages at `https://namityadav.github.io/interview-prep/`

## Purpose

A single-user, static, interactive mock-interview app for staff frontend
engineer interviews in Berlin/EU. It asks questions per interview round,
reveals a model answer on demand, records a self-rating, and resurfaces weak
questions first. Public repo; no employer-internal or personal data committed.

## Interview rounds

| id        | Round                          | Focus                                                                 | Target count |
|-----------|--------------------------------|-----------------------------------------------------------------------|--------------|
| `hr`      | HR / Recruiter screen          | Motivation, logistics, comp framing, German employment specifics      | 25           |
| `hm`      | Hiring Manager                 | Technical depth + behavioral, staff-level scope                       | 50           |
| `case`    | Case Study                     | Take-home assignment + presentation                                   | 35           |
| `debrief` | Case Study Debrief             | Panel grills the presentation: trade-offs, edge cases, what to change | 30           |
| `hoe`     | Head of Engineering            | Vision, org impact, strategy, culture, questions to ask them          | 30           |

Total ≈ 170 questions. Each round includes a `From your CV` category
(~30 questions overall) with probes derived from the candidate's resume
bullets: React 17→18 migration across 6 apps, Snyk findings 734→215,
feature-flag infra (Firebase Remote Config, GA4), tanstack-table ADR for 95+
grids, visual regression + CI quality gates, Slack code-review bot, Module
Federation micro-frontend, legally operative document generation, Cypress
introduction, 3.5 years in Berlin at a prior employer, relocation Nov 2026 with
no sponsorship needed.

## Content stance

- Answers are generic, staff-level, written as "what a strong answer covers",
  using `[your project]` style placeholders. No real STAR stories committed.
- Berlin/EU specifics where relevant: Blue Card / permanent residence,
  Probezeit, Kündigungsfrist, Anmeldung timing, salary framing in EUR,
  works-council culture, English-first teams. HR round assumes someone
  re-entering Germany, not a first-timer.
- Case Study round assumes a take-home + presentation format. Debrief round
  assumes a panel grilling that presentation.
- Each question has: model answer paragraphs, key points a staff-level answer
  must hit, likely follow-ups.

## Architecture

- **Stack:** Vite 7, React 19, TypeScript (strict), Tailwind CSS v4.
  Vitest + React Testing Library. No router, no state library, no markdown
  library, no UI kit.
- **Navigation:** view state `home | round` mirrored to `location.hash`
  (`#hm`, `#case`) for deep links and back-button support.
- **State:** one `useReducer` for app state; one `useLocalStorage` hook
  persisting `progress` and `notes` under a single key `interview-prep:v1`.
- **Theme:** dark mode via `prefers-color-scheme`. Mobile-first layout.
- **Deploy:** GitHub Actions workflow builds `dist/` and publishes to Pages.
  Vite `base` is `/interview-prep/`.

## Data model

```ts
type RoundId = 'hr' | 'hm' | 'case' | 'debrief' | 'hoe';

interface Round {
  id: RoundId;
  title: string;
  blurb: string;          // one line on what this round tests
}

interface Question {
  id: string;             // `${round}-${nnn}`, e.g. 'hm-012'
  round: RoundId;
  category: string;       // 'Architecture' | 'Leadership' | 'From your CV' | …
  question: string;
  answer: string[];       // paragraphs, plain text
  keyPoints: string[];    // bullets a staff-level answer must hit
  followUps?: string[];   // likely probes
}

type Rating = 1 | 2 | 3;  // 1 weak, 2 ok, 3 solid

interface ProgressEntry { rating: Rating; seen: number; lastSeen: number }
type Progress = Record<string, ProgressEntry>;     // by question id
type Notes = Record<string, string>;               // by question id

interface Persisted { version: 1; progress: Progress; notes: Notes }
```

Content lives in `src/data/<round>.ts`, one file per round, exported as
`Question[]`. `src/data/index.ts` concatenates them and exports `rounds`.

## Screens

### Home
- Header: app title, `Export` and `Import` buttons, `Reset progress`
  (confirm dialog).
- Five round cards: title, blurb, question count, progress bar
  (`rated 3 / total`), counts of weak/ok/unrated. Click → round view.

### Round view
Tabs: **Practice** | **Browse**. Category filter chips (multi-select, "All"
default) apply to both tabs. Back link to Home.

**Practice**
- Shows one card: category chip, question text, `Reveal` button.
- After reveal: answer paragraphs, key points list, follow-ups list, private
  note textarea (auto-saves to `notes`), three rating buttons `Weak / OK / Solid`.
- Rating records `{rating, seen+1, lastSeen: Date.now()}` and advances.
- `Skip` advances without rating.
- Keyboard: `Space` reveal, `1`/`2`/`3` rate, `N` skip. Ignored while typing
  in the note textarea.
- Empty state when the filter yields no questions.

**Browse**
- Search input filters on question text and category.
- List of questions; each expands to answer, key points, follow-ups, note,
  and current rating (editable).

### Queue ordering (Practice)
Sort the filtered questions into buckets: unrated → weak (1) → ok (2) →
solid (3). Within a bucket, oldest `lastSeen` first (unseen = 0). Take the
head as the current card. After rating, recompute; the just-rated card cannot
be the immediate next card unless it is the only one left.

`// ponytail: bucket sort, not SM-2. Upgrade to SM-2 intervals if the queue
feels repetitive.`

## Export / Import
- Export: downloads `interview-prep-backup-<yyyy-mm-dd>.json` containing the
  `Persisted` object.
- Import: `<input type="file">`, parses JSON, validates `version === 1` and
  object shapes, then replaces `progress` and `notes`. Invalid file → inline
  error message, no state change.

## Error handling
- localStorage read wrapped in try/catch; on parse failure start empty and
  keep the corrupt value under `interview-prep:v1:corrupt` for recovery.
- localStorage write failures (quota, private mode) are caught and surfaced
  as a non-blocking banner "Progress is not being saved".
- Import validation errors are shown inline; nothing else can fail at runtime
  since all data is static.

## Testing (Vitest)
1. `queue.test.ts` — bucket order, tie-break by `lastSeen`, no immediate
   repeat.
2. `store.test.ts` — reducer: rate, skip, note, import, reset; persistence
   round-trip; corrupt storage recovery.
3. `data.test.ts` — all question ids unique and match `^${round}-\d{3}$`;
   `question`, `answer`, `keyPoints` non-empty; every question's round exists;
   every round has ≥ 20 questions.
4. `Practice.test.tsx` — RTL: reveal shows answer, rating advances to a new
   question, keyboard shortcuts work and are ignored inside the textarea.

## Repo layout

```
interview-prep/
  .github/workflows/pages.yml
  docs/superpowers/specs/2026-09-08-interview-prep-design.md
  index.html
  package.json  vite.config.ts  tsconfig.json  vitest.config.ts
  src/
    main.tsx  App.tsx  index.css
    types.ts
    data/{index,hr,hm,case,debrief,hoe}.ts
    lib/{queue,storage}.ts
    hooks/useAppState.ts
    components/{Home,RoundView,Practice,Browse,QuestionCard,ProgressBar,ExportImport}.tsx
    __tests__/{queue,store,data}.test.ts  __tests__/Practice.test.tsx
  README.md
```

## Out of scope (YAGNI)
AI-generated follow-ups, timed mode, typed-answer comparison, accounts or
backend sync, multiple languages, spaced-repetition scheduling beyond bucket
sort, analytics.

## Delivery
1. Scaffold + spec commit.
2. App shell, types, storage, queue, tests.
3. Content per round, one commit each.
4. Pages workflow + README.
5. User: `ssh-add ~/.ssh/id_ed25519`, confirm key on GitHub, create empty
   public repo `interview-prep`. Then set remote and push `main`.
