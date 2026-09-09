import type { Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { questions, questionsByRound, rounds } from '../data';
import { roundStats } from '../lib/queue';
import { ExportImport } from './ExportImport';
import { ProgressBar } from './ProgressBar';

// Every card in a grid shares this shape so a short blurb never leaves the card
// shorter than its neighbors: min-h reserves two lines' worth of space up front,
// line-clamp caps it there if a future blurb runs longer.
const cardLink = 'flex flex-col rounded-lg border border-zinc-200 bg-white p-4 hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900';
const cardBlurb = 'line-clamp-2 min-h-10 text-sm text-zinc-600 dark:text-zinc-400';

export function Home({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  const weak = questions.filter((q) => state.progress[q.id]?.rating === 1).length;
  const noted = questions.filter((q) => (state.notes[q.id] ?? '').trim().length > 0).length;
  const stories = Object.values(state.stories);
  const neverRehearsed = stories.filter((s) => s.lastRehearsed === undefined).length;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Interview Prep</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Staff frontend · Berlin / EU loop</p>
        </div>
        <ExportImport state={state} dispatch={dispatch} />
      </header>
      <ol className="grid gap-3 sm:grid-cols-2">
        {rounds.map((round, i) => {
          const s = roundStats(questionsByRound(round.id), state.progress);
          return (
            <li key={round.id} className="flex">
              <a href={`#${round.id}`} className={`w-full text-left ${cardLink}`}>
                <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Round {i + 1}</div>
                <h2 className="font-medium">{round.title}</h2>
                <p className={`mb-3 ${cardBlurb}`}>{round.blurb}</p>
                <div className="mt-auto">
                  <ProgressBar value={s.solid} max={s.total} label={`${round.title} progress`} />
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {s.solid}/{s.total} solid · {s.ok} ok · {s.weak} weak · {s.unrated} unrated
                  </p>
                </div>
              </a>
            </li>
          );
        })}
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
      </nav>
    </main>
  );
}
