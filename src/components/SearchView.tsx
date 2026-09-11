import type { Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { questions } from '../data';
import { Browse } from './Browse';

export function SearchView({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackLink />
      <h1 tabIndex={-1} className="mb-1 text-2xl font-semibold">Search</h1>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Every question, every round, in one search.</p>
      <Browse questions={questions} state={state} dispatch={dispatch} />
    </main>
  );
}
