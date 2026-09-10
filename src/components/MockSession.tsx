import { useState, type Dispatch } from 'react';
import type { Persisted, Question, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound } from '../data';
import { orderQueue } from '../lib/queue';
import { Practice } from './Practice';

interface Preset { id: string; title: string; blurb: string; composition: Partial<Record<RoundId, number>> }

const PRESETS: Preset[] = [
  {
    id: 'full-loop',
    title: 'Full loop',
    blurb: 'A slice of every round, weighted toward your weak spots in each.',
    composition: { hr: 4, hm: 6, coding: 4, design: 3, case: 4, debrief: 4, hoe: 3 },
  },
  {
    id: 'technical',
    title: 'Technical rounds',
    blurb: 'Hiring manager, live coding, and system design only — no HR or case study.',
    composition: { hm: 8, coding: 6, design: 6 },
  },
];

function buildSet(composition: Preset['composition'], progress: Persisted['progress']): Question[] {
  const picked: Question[] = [];
  for (const [roundId, count] of Object.entries(composition) as [RoundId, number][]) {
    picked.push(...orderQueue(questionsByRound(roundId), progress).slice(0, count));
  }
  return picked;
}

export function MockSession({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  const [session, setSession] = useState<{ preset: Preset; drill: Question[]; baseline: Persisted['progress'] } | null>(null);
  const [finished, setFinished] = useState(false);

  const start = (preset: Preset) => {
    // Frozen on entry, like the weak drill: freezing baseline progress too, so the
    // recap can tell "rated this session" apart from ratings you already had.
    setSession({ preset, drill: buildSet(preset.composition, state.progress), baseline: state.progress });
    setFinished(false);
  };

  const backToPresets = () => setSession(null);

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <a href="#" className="mb-4 inline-block text-sm text-zinc-500 dark:text-zinc-400 hover:underline">← All rounds</a>
        <h1 className="text-2xl font-semibold">Mock session</h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          A curated, cross-round set in one sitting. Go at your own pace — each question shows how long you took once you reveal it, but nothing forces a hide.
        </p>
        <ul className="space-y-3">
          {PRESETS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => start(p)}
                className="flex w-full flex-col rounded-lg border border-zinc-200 bg-white p-4 text-left hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <h2 className="font-medium">{p.title}</h2>
                <p className="line-clamp-2 min-h-10 text-sm text-zinc-600 dark:text-zinc-400">{p.blurb}</p>
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const { preset, drill, baseline } = session;

  if (finished) {
    const rated = drill.filter((q) => state.progress[q.id] !== baseline[q.id]);
    const counts = { weak: 0, ok: 0, solid: 0 };
    for (const q of rated) {
      const rating = state.progress[q.id]!.rating;
      if (rating === 1) counts.weak++;
      else if (rating === 2) counts.ok++;
      else counts.solid++;
    }
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <a href="#" className="mb-4 inline-block text-sm text-zinc-500 dark:text-zinc-400 hover:underline">← All rounds</a>
        <h1 className="text-2xl font-semibold">Session recap</h1>
        <p className="mb-1 text-sm text-zinc-600 dark:text-zinc-400">{preset.title} · {rated.length} of {drill.length} rated</p>
        <p className="mb-4 text-sm">{counts.solid} solid · {counts.ok} ok · {counts.weak} weak</p>
        <button
          type="button"
          onClick={backToPresets}
          className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Back to presets
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <a href="#" className="mb-4 inline-block text-sm text-zinc-500 dark:text-zinc-400 hover:underline">← All rounds</a>
      <h1 className="text-2xl font-semibold">{preset.title}</h1>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{drill.length} questions. Rate as you go, finish whenever.</p>
      <Practice questions={drill} state={state} dispatch={dispatch} onLapComplete={() => setFinished(true)} />
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={() => setFinished(true)} className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
          Finish session
        </button>
      </div>
    </main>
  );
}
