import type { Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound, rounds } from '../data';
import { roundStats } from '../lib/queue';
import { ExportImport } from './ExportImport';
import { ProgressBar } from './ProgressBar';

export function Home({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
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
            <li key={round.id}>
              <a
                href={`#${round.id}`}
                className="block w-full rounded-lg border border-zinc-200 bg-white p-4 text-left hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Round {i + 1}</div>
                <h2 className="font-medium">{round.title}</h2>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{round.blurb}</p>
                <ProgressBar value={s.solid} max={s.total} label={`${round.title} progress`} />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {s.solid}/{s.total} solid · {s.ok} ok · {s.weak} weak · {s.unrated} unrated
                </p>
              </a>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
