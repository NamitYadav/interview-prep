import { useState, type Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { questions } from '../data';
import { Practice } from './Practice';

export function WeakDrill({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  // Frozen on entry: re-filtering as you rate would pull the current question out
  // from under Practice mid-drill. Re-enter the drill to pick up a fresh set.
  const [drill] = useState(() => questions.filter((q) => state.progress[q.id]?.rating === 1));
  const remaining = drill.filter((q) => state.progress[q.id]?.rating === 1).length;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <a href="#" className="mb-4 inline-block text-sm text-zinc-500 dark:text-zinc-400 hover:underline">← All rounds</a>
      <h1 className="text-2xl font-semibold">Weak drill</h1>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Everything you rated weak, across every round.
      </p>

      {drill.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-center text-zinc-500 dark:text-zinc-400">
          Nothing rated weak yet. Rate questions in any round and they collect here.
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            {remaining} of {drill.length} still weak · re-enter the drill to rebuild the set
          </p>
          <Practice questions={drill} state={state} dispatch={dispatch} />
        </>
      )}
    </main>
  );
}
