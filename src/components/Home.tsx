import { useState } from 'react';
import type { Persisted } from '../types';
import { questions, questionsByRound, rounds } from '../data';
import { roundStats } from '../lib/queue';
import { useLoopDate } from '../hooks/useLoopDate';
import { ExportButton, useLastExport } from './ExportImport';
import { ProgressBar, statsCaption } from './ProgressBar';

// Every card in a grid shares this shape so a short blurb never leaves the card
// shorter than its neighbors: min-h reserves two lines' worth of space up front,
// line-clamp caps it there if a future blurb runs longer.
const cardLink = 'flex flex-col rounded-lg border border-zinc-200 bg-white p-4 hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900';
const cardBlurb = 'line-clamp-2 min-h-10 text-sm text-zinc-600 dark:text-zinc-400';

// Drills are utilities, not the sequence: a quiet list beside the round cards rather
// than six more cards that look like rounds.
const drillLink = 'flex items-baseline justify-between gap-4 py-3 hover:text-emerald-600 dark:hover:text-emerald-400';
const drillMeta = 'text-right text-sm text-zinc-500 dark:text-zinc-400';

const daysUntil = (dateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

const EXPORT_STALE_MS = 7 * 86_400_000;

export function Home({ state }: { state: Persisted }) {
  const weak = questions.filter((q) => state.progress[q.id]?.rating === 1).length;
  const noted = questions.filter((q) => (state.notes[q.id] ?? '').trim().length > 0).length;
  const stories = Object.values(state.stories);
  const neverRehearsed = stories.filter((s) => s.lastRehearsed === undefined).length;

  const [loopDate, setLoopDate] = useLoopDate();
  const daysLeft = loopDate ? daysUntil(loopDate) : null;

  const lastExport = useLastExport();
  // Captured once at mount rather than read fresh each render — Date.now() is
  // impure, and a millisecond-stale "now" makes no visible difference to a
  // week-scale staleness check.
  const [now] = useState(() => Date.now());
  const hasProgress = Object.keys(state.progress).length > 0;
  const exportIsStale = hasProgress && (!lastExport || now - Number(lastExport) > EXPORT_STALE_MS);

  const roundCards = rounds.map((round, index) => ({
    round,
    index,
    stats: roundStats(questionsByRound(round.id), state.progress),
  }));
  // With a loop date the cards sort by urgency, and a "Round 3" label on the first
  // card would contradict its position — so the label only shows in data order.
  const orderedCards = loopDate
    ? [...roundCards].sort((a, b) => (b.stats.weak * 2 + b.stats.unrated) - (a.stats.weak * 2 + a.stats.unrated))
    : roundCards;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 tabIndex={-1} className="text-2xl font-semibold">Interview Prep</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Staff frontend · Berlin / EU loop</p>
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
        <p role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          <span>Back up your progress — {lastExport ? 'it has been over a week since your last export' : "you haven't exported yet"}.</span>
          <ExportButton state={state} className="font-medium underline underline-offset-2" />
        </p>
      )}

      <ol className="grid gap-3 sm:grid-cols-2">
        {orderedCards.map(({ round, index, stats: s }) => (
          <li key={round.id} className="flex">
            <a href={`#${round.id}`} className={`w-full text-left ${cardLink}`}>
              {!loopDate && <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Round {index + 1}</div>}
              <h2 className="font-medium">{round.title}</h2>
              <p className={`mb-3 ${cardBlurb}`}>{round.blurb}</p>
              <div className="mt-auto">
                <ProgressBar stats={s} label={`${round.title} progress`} />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{statsCaption(s, daysLeft)}</p>
              </div>
            </a>
          </li>
        ))}
      </ol>

      <nav className="mt-8 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800" aria-label="Drills">
        <a href="#weak" className={drillLink}>
          <span className="font-medium">Weak drill</span>
          <span className={drillMeta}>{weak} rated weak</span>
        </a>
        <a href="#mock" className={drillLink}>
          <span className="font-medium">Mock session</span>
          <span className={drillMeta}>A cross-round set in one sitting</span>
        </a>
        <a href="#notes" className={drillLink}>
          <span className="font-medium">My notes</span>
          <span className={drillMeta}>{noted} with a note</span>
        </a>
        <a href="#stories" className={drillLink}>
          <span className="font-medium">My stories</span>
          <span className={drillMeta}>{stories.length} {stories.length === 1 ? 'story' : 'stories'} · {neverRehearsed} never rehearsed</span>
        </a>
        <a href="#search" className={drillLink}>
          <span className="font-medium">Search</span>
          <span className={drillMeta}>Every question, every round</span>
        </a>
        <a href="#print" className={drillLink}>
          <span className="font-medium">Print cheat sheet</span>
          <span className={drillMeta}>Weak questions and notes, by round</span>
        </a>
      </nav>
    </main>
  );
}
