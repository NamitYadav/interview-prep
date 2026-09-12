import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound, rounds } from '../data';
import { roundStats } from '../lib/queue';
import { Browse } from './Browse';
import { Practice } from './Practice';
import { ProgressBar, statsCaption } from './ProgressBar';
import { DesignSession } from './DesignSession';

type Tab = 'practice' | 'browse' | 'design-prompt';
const TAB_LABEL: Record<Tab, string> = { practice: 'Practice', browse: 'Browse', 'design-prompt': '45-min prompt' };

export function RoundView({
  roundId, state, dispatch, strictMode, shortcuts = true,
}: { roundId: RoundId; state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean; shortcuts?: boolean }) {
  const round = rounds.find((r) => r.id === roundId);
  const all = useMemo(() => questionsByRound(roundId), [roundId]);
  const categories = useMemo(() => [...new Set(all.map((q) => q.category))], [all]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('practice');
  const TABS: Tab[] = roundId === 'design' ? ['practice', 'browse', 'design-prompt'] : ['practice', 'browse'];

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
      <ProgressBar stats={stats} label={`${round.title} progress`} />
      <p className="mb-4 mt-1 text-xs text-zinc-500 dark:text-zinc-400">{statsCaption(stats)}</p>

      {/* A native select in place of a 17-chip cloud: the filter used to push the
          question itself below the fold on a laptop and most of a screen down on a phone. */}
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800">
      <div role="tablist" aria-label="View" className="flex">
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
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>
      <select
        aria-label="Category"
        value={selected ?? ''}
        onChange={(e) => setSelected(e.target.value || null)}
        className="mb-2 min-w-0 max-w-[55%] rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
      >
        <option value="">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      </div>

      <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'practice' && <Practice key={`${roundId}:${selected ?? ''}`} questions={filtered} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} />}
        {tab === 'browse' && <Browse questions={filtered} state={state} dispatch={dispatch} />}
        {tab === 'design-prompt' && <DesignSession state={state} dispatch={dispatch} />}
      </div>
    </main>
  );
}
