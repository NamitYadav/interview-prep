import { useMemo, useState, type Dispatch } from 'react';
import type { Persisted, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound, rounds } from '../data';
import { roundStats } from '../lib/queue';
import { Browse } from './Browse';
import { Practice } from './Practice';
import { ProgressBar } from './ProgressBar';

type Tab = 'practice' | 'browse';

export function RoundView({ roundId, state, dispatch }: { roundId: RoundId; state: Persisted; dispatch: Dispatch<Action> }) {
  const round = rounds.find((r) => r.id === roundId)!;
  const all = useMemo(() => questionsByRound(roundId), [roundId]);
  const categories = useMemo(() => [...new Set(all.map((q) => q.category))], [all]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [tab, setTab] = useState<Tab>('practice');

  const filtered = useMemo(
    () => (selected.size === 0 ? all : all.filter((q) => selected.has(q.category))),
    [all, selected],
  );
  const stats = roundStats(all, state.progress);

  const toggle = (c: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-zinc-300 dark:border-zinc-700'}`;
  const tabBtn = (active: boolean) =>
    `border-b-2 px-3 py-2 text-sm ${active ? 'border-emerald-500 font-medium' : 'border-transparent text-zinc-500 dark:text-zinc-400'}`;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <a href="#" className="mb-4 inline-block text-sm text-zinc-500 dark:text-zinc-400 hover:underline">← All rounds</a>
      <h1 className="text-2xl font-semibold">{round.title}</h1>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{round.blurb}</p>
      <ProgressBar value={stats.solid} max={stats.total} label={`${round.title} progress`} />
      <p className="mb-4 mt-1 text-xs text-zinc-500 dark:text-zinc-400">{stats.solid}/{stats.total} solid · {stats.ok} ok · {stats.weak} weak · {stats.unrated} unrated</p>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button type="button" className={chip(selected.size === 0)} aria-pressed={selected.size === 0} onClick={() => setSelected(new Set())}>All</button>
        {categories.map((c) => (
          <button key={c} type="button" className={chip(selected.has(c))} aria-pressed={selected.has(c)} onClick={() => toggle(c)}>{c}</button>
        ))}
      </div>

      <div className="mb-4 flex border-b border-zinc-200 dark:border-zinc-800">
        <button type="button" aria-pressed={tab === 'practice'} className={tabBtn(tab === 'practice')} onClick={() => setTab('practice')}>Practice</button>
        <button type="button" aria-pressed={tab === 'browse'} className={tabBtn(tab === 'browse')} onClick={() => setTab('browse')}>Browse</button>
      </div>

      {tab === 'practice'
        ? <Practice key={[...selected].sort().join('|')} questions={filtered} state={state} dispatch={dispatch} />
        : <Browse questions={filtered} state={state} dispatch={dispatch} />}
    </main>
  );
}
