import { useState, type Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted, Question, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound } from '../data';
import { Practice } from './Practice';
import { clearBaseline, clearLap, lapKey, readBaseline, writeBaseline, type Baseline } from '../lib/lap';

interface Preset { id: string; title: string; blurb: string; composition: Partial<Record<RoundId, number>> }

const PRESETS: Preset[] = [
  {
    id: 'full-loop',
    title: 'Full loop',
    blurb: 'A slice of every round, in round order.',
    composition: { hr: 4, hm: 6, coding: 4, design: 3, case: 4, debrief: 4, hoe: 3 },
  },
  {
    id: 'technical',
    title: 'Technical rounds',
    blurb: 'Hiring manager, live coding, and system design only — no HR or case study.',
    composition: { hm: 8, coding: 6, design: 6 },
  },
];

// Plain array order, not weak-weighted — a real loop doesn't let you pick your
// weakest questions in each round, so neither does this preset.
function buildSet(composition: Preset['composition']): Question[] {
  const picked: Question[] = [];
  for (const [roundId, count] of Object.entries(composition) as [RoundId, number][]) {
    picked.push(...questionsByRound(roundId).slice(0, count));
  }
  return picked;
}

export function MockSession({
  state, dispatch, strictMode,
}: { state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean }) {
  const [session, setSession] = useState<{ preset: Preset; drill: Question[]; baseline: Baseline } | null>(null);
  const [finished, setFinished] = useState(false);

  const start = (preset: Preset) => {
    const drill = buildSet(preset.composition);
    const key = lapKey(drill);
    // Frozen on entry, like the weak drill: freezing the baseline too, so the recap can
    // tell "rated this session" apart from ratings you already had. Persisted rather
    // than kept in state alone, because a mid-session reload lands the user back on
    // this list: re-picking the preset restores the lap, and re-freezing the baseline
    // here against progress that already contains the session's ratings made every one
    // of them look pre-existing — a 28-question session recapping as "3 of 28 rated".
    const baseline = readBaseline(key) ?? Object.fromEntries(
      drill.flatMap((q) => { const e = state.progress[q.id]; return e ? [[q.id, e.seen] as const] : []; }),
    );
    writeBaseline(key, baseline);
    setSession({ preset, drill, baseline });
    setFinished(false);
  };

  // Ending a session any way other than completing the lap — the Finish link, or
  // walking back to the presets — still has to clear the stored lap. Practice only
  // clears it on genuine completion, so without this, re-picking the same preset
  // resumed at the question the user abandoned. The baseline is the same session and
  // goes at the same moments; left behind, it would count the NEXT session's ratings
  // against the previous one's starting point.
  const endSession = () => {
    if (!session) return;
    clearLap(lapKey(session.drill));
    clearBaseline(lapKey(session.drill));
  };
  const finishSession = () => {
    endSession();
    setFinished(true);
  };
  const backToPresets = () => {
    endSession();
    setSession(null);
  };

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <BackLink />
        <h1 tabIndex={-1} className="text-2xl font-semibold">Mock session</h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          A curated, cross-round set in round order, like a real loop day. Go at your own pace — each question shows how long you took once you reveal it, but nothing forces a hide.
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
    // flatMap over the entry itself (not the question) so a mid-session Reset —
    // which clears state.progress entirely — drops these rather than crashing on
    // a non-null assertion against an entry that no longer exists.
    const rated = drill.flatMap((q) => {
      const e = state.progress[q.id];
      // `seen` is bumped by every rating, so a count that differs from the baseline is
      // exactly "rated since this session started" — and unlike the entry-identity
      // check this replaces, it still means that after a reload.
      return e && e.seen !== baseline[q.id] ? [e] : [];
    });
    const counts = { weak: 0, ok: 0, solid: 0 };
    for (const entry of rated) {
      if (entry.rating === 1) counts.weak++;
      else if (entry.rating === 2) counts.ok++;
      else counts.solid++;
    }
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <BackLink />
        <h1 tabIndex={-1} className="text-2xl font-semibold">Session recap</h1>
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
      <BackLink />
      <h1 tabIndex={-1} className="text-2xl font-semibold">{preset.title}</h1>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{drill.length} questions. Rate as you go, finish whenever.</p>
      <Practice questions={drill} state={state} dispatch={dispatch} strictMode={strictMode} ordered onLapComplete={finishSession} />
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={finishSession} className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
          Finish session
        </button>
      </div>
    </main>
  );
}
