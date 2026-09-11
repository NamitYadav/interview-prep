import { useState, type Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { questions, questionsByRound, rounds } from '../data';
import { roundStats } from '../lib/queue';
import { useLoopDate } from '../hooks/useLoopDate';
import { ExportImport, LAST_EXPORT_KEY } from './ExportImport';
import { ProgressBar } from './ProgressBar';

// Every card in a grid shares this shape so a short blurb never leaves the card
// shorter than its neighbors: min-h reserves two lines' worth of space up front,
// line-clamp caps it there if a future blurb runs longer.
const cardLink = 'flex flex-col rounded-lg border border-zinc-200 bg-white p-4 hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900';
const cardBlurb = 'line-clamp-2 min-h-10 text-sm text-zinc-600 dark:text-zinc-400';

const daysUntil = (dateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

const EXPORT_STALE_MS = 7 * 86_400_000;

export function Home({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  const weak = questions.filter((q) => state.progress[q.id]?.rating === 1).length;
  const noted = questions.filter((q) => (state.notes[q.id] ?? '').trim().length > 0).length;
  const stories = Object.values(state.stories);
  const neverRehearsed = stories.filter((s) => s.lastRehearsed === undefined).length;

  const [loopDate, setLoopDate] = useLoopDate();
  const daysLeft = loopDate ? daysUntil(loopDate) : null;

  const [lastExport, setLastExport] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_EXPORT_KEY);
    } catch {
      return null;
    }
  });
  // Captured once at mount rather than read fresh each render — Date.now() is
  // impure, and a millisecond-stale "now" makes no visible difference to a
  // week-scale staleness check.
  const [now] = useState(() => Date.now());
  const hasProgress = Object.keys(state.progress).length > 0;
  const exportIsStale = hasProgress && (!lastExport || now - Number(lastExport) > EXPORT_STALE_MS);

  // Original data order (Round 1..7) is preserved as the label even when a loop
  // date is set and the cards themselves get reordered by urgency.
  const roundCards = rounds.map((round, index) => ({
    round,
    index,
    stats: roundStats(questionsByRound(round.id), state.progress),
  }));
  const orderedCards = loopDate
    ? [...roundCards].sort((a, b) => (b.stats.weak * 2 + b.stats.unrated) - (a.stats.weak * 2 + a.stats.unrated))
    : roundCards;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 tabIndex={-1} className="text-2xl font-semibold">Interview Prep</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Staff frontend · Berlin / EU loop</p>
        </div>
        <ExportImport state={state} dispatch={dispatch} onExport={() => setLastExport(String(Date.now()))} />
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
      </div>

      {exportIsStale && (
        <p role="status" className="mb-4 rounded bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          Back up your progress — {lastExport ? 'it has been over a week since your last export' : "you haven't exported yet"}.
        </p>
      )}

      <ol className="grid gap-3 sm:grid-cols-2">
        {orderedCards.map(({ round, index, stats: s }) => (
          <li key={round.id} className="flex">
            <a href={`#${round.id}`} className={`w-full text-left ${cardLink}`}>
              <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Round {index + 1}</div>
              <h2 className="font-medium">{round.title}</h2>
              <p className={`mb-3 ${cardBlurb}`}>{round.blurb}</p>
              <div className="mt-auto">
                <ProgressBar value={s.solid} max={s.total} label={`${round.title} progress`} />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {s.solid}/{s.total} solid · {s.ok} ok · {s.weak} weak · {s.unrated} unrated
                </p>
                {daysLeft !== null && (
                  <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {s.unrated} unseen · {s.weak} weak · {daysLeft} days
                  </p>
                )}
              </div>
            </a>
          </li>
        ))}
      </ol>

      <nav className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Drills">
        <a href="#weak" className={cardLink}>
          <h2 className="font-medium">Weak drill</h2>
          <p className={cardBlurb}>{weak} rated weak across every round.</p>
        </a>
        <a href="#notes" className={cardLink}>
          <h2 className="font-medium">My notes</h2>
          <p className={cardBlurb}>{noted} questions with a note.</p>
        </a>
        <a href="#stories" className={cardLink}>
          <h2 className="font-medium">My stories</h2>
          <p className={cardBlurb}>{stories.length} {stories.length === 1 ? 'story' : 'stories'} · {neverRehearsed} never rehearsed.</p>
        </a>
        <a href="#mock" className={cardLink}>
          <h2 className="font-medium">Mock session</h2>
          <p className={cardBlurb}>A curated, cross-round set in one sitting.</p>
        </a>
        <a href="#search" className={cardLink}>
          <h2 className="font-medium">Search</h2>
          <p className={cardBlurb}>Every question, every round, in one search.</p>
        </a>
        <a href="#print" className={cardLink}>
          <h2 className="font-medium">Print cheat sheet</h2>
          <p className={cardBlurb}>Weak questions and notes, grouped by round, ready to print.</p>
        </a>
      </nav>
    </main>
  );
}
