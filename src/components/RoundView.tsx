import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound, rounds } from '../data';
import { roundStats } from '../lib/queue';
import { Browse } from './Browse';
import { Practice } from './Practice';
import { ProgressBar } from './ProgressBar';

type Tab = 'practice' | 'browse';
const TABS: Tab[] = ['practice', 'browse'];

export function RoundView({
  roundId, state, dispatch, strictMode,
}: { roundId: RoundId; state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean }) {
  const round = rounds.find((r) => r.id === roundId);
  const all = useMemo(() => questionsByRound(roundId), [roundId]);
  const categories = useMemo(() => [...new Set(all.map((q) => q.category))], [all]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('practice');

  // Switching tabs remounts Practice/Browse's content, and QuestionCard grabs focus
  // for its own heading on mount — this runs after that child effect (React commits
  // child effects before parent ones), so it reliably wins and keeps focus on the
  // tab itself, matching the roving-tabindex pattern above. Skip the first run
  // (mount) the same way App's own route-focus effect does — landing straight on
  // this round is not a tab switch the user asked for, so don't steal focus onto
  // the tab button for it.
  const isFirstTab = useRef(true);
  useEffect(() => {
    if (isFirstTab.current) {
      isFirstTab.current = false;
      return;
    }
    document.getElementById(`tab-${tab}`)?.focus();
  }, [tab]);

  const filtered = useMemo(
    () => (selected === null ? all : all.filter((q) => q.category === selected)),
    [all, selected],
  );
  const stats = roundStats(filtered, state.progress);

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? 'border-emerald-500 bg-emerald-50 font-medium dark:bg-emerald-950' : 'border-zinc-300 dark:border-zinc-700'}`;
  const tabBtn = (active: boolean) =>
    `border-b-2 px-3 py-2 text-sm ${active ? 'border-emerald-500 font-medium' : 'border-transparent text-zinc-500 dark:text-zinc-400'}`;

  if (!round) {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <p className="mb-2">Round not found.</p>
        <BackLink className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackLink />
      <h1 tabIndex={-1} className="text-2xl font-semibold">{round.title}</h1>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{round.blurb}</p>
      <ProgressBar value={stats.solid} max={stats.total} label={`${round.title} progress`} />
      <p className="mb-4 mt-1 text-xs text-zinc-500 dark:text-zinc-400">{stats.solid}/{stats.total} solid · {stats.ok} ok · {stats.weak} weak · {stats.unrated} unrated</p>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button type="button" className={chip(selected === null)} aria-pressed={selected === null} onClick={() => setSelected(null)}>All</button>
        {categories.map((c) => (
          <button key={c} type="button" className={chip(selected === c)} aria-pressed={selected === c} onClick={() => setSelected(c)}>{c}</button>
        ))}
      </div>

      <div role="tablist" aria-label="View" className="mb-4 flex border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`tabpanel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            className={tabBtn(tab === t)}
            onClick={() => setTab(t)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
              e.preventDefault();
              const i = TABS.indexOf(tab);
              const nextIndex =
                e.key === 'Home' ? 0 :
                e.key === 'End' ? TABS.length - 1 :
                e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length :
                (i + 1) % TABS.length;
              const next = TABS[nextIndex]!;
              setTab(next);
              document.getElementById(`tab-${next}`)?.focus();
            }}
          >
            {t === 'practice' ? 'Practice' : 'Browse'}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'practice'
          ? <Practice key={selected ?? ''} questions={filtered} state={state} dispatch={dispatch} strictMode={strictMode} />
          : <Browse questions={filtered} state={state} dispatch={dispatch} />}
      </div>
    </main>
  );
}
