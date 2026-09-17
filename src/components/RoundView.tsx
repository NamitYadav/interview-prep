import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted, RoleId, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { forRole } from '../data';
import { filterByStatus, roundStats, type QuestionStatus } from '../lib/queue';
import { Browse } from './Browse';
import { Practice } from './Practice';
import { ProgressBar, statsCaption } from './ProgressBar';
import { DesignSession } from './DesignSession';
import { CategoryStrength } from './CategoryStrength';
import { ALL, STATUS_OPTIONS, Select } from './Select';

type Tab = 'practice' | 'browse' | 'design-prompt';
const TAB_LABEL: Record<Tab, string> = { practice: 'Practice', browse: 'Browse', 'design-prompt': '45-min prompt' };

export function RoundView({
  roundId, state, dispatch, strictMode, shortcuts = true, role,
}: { roundId: RoundId; state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean; shortcuts?: boolean; role: RoleId }) {
  const { rounds, byRound } = forRole(role);
  const round = rounds.find((r) => r.id === roundId);
  const all = useMemo(() => byRound(roundId), [byRound, roundId]);
  const categories = useMemo(() => [...new Set(all.map((q) => q.category))], [all]);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<QuestionStatus>('all');
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

  const byCategory = useMemo(
    () => (selected === null ? all : all.filter((q) => q.category === selected)),
    [all, selected],
  );
  // Deliberately NOT recomputed when progress changes: rating a question moves it out
  // of its bucket, and a live status filter would pull the question Practice is showing
  // out of its own queue mid-lap (`current` is looked up in this array) — the empty
  // state would flash while unseen questions remained. Frozen when you pick the filter,
  // rebuilt when you pick another, the same way Weak drill freezes its set on entry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => filterByStatus(byCategory, status, state.progress), [byCategory, status]);
  // The bar stays on the category set: on the Unseen filter a bar drawn from `filtered`
  // is 100% unrated by construction, which tells you nothing.
  const stats = roundStats(byCategory, state.progress);

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

      <CategoryStrength questions={all} progress={state.progress} selected={selected} onSelect={setSelected} />

      {/* A native select in place of a 17-chip cloud: the filter used to push the
          question itself below the fold on a laptop and most of a screen down on a phone. */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 border-b border-zinc-200 dark:border-zinc-800">
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
      <div className="mb-2 flex flex-wrap gap-2">
        <Select
          label="Category"
          value={selected ?? ALL}
          onChange={(v) => setSelected(v || null)}
          options={[{ value: ALL, label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
        <Select label="Status" value={status} onChange={(v) => setStatus(v as QuestionStatus)} options={STATUS_OPTIONS} />
      </div>
      </div>

      <div role="tabpanel" id={`tabpanel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'practice' && (filtered.length === 0 ? (
          // Practice has its own empty state, but only this view knows which filters to
          // undo — the message alone left you hunting for the select that emptied it.
          <div className="rounded border border-dashed p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <p className="mb-3">No questions match this filter.</p>
            <button
              type="button"
              onClick={() => { setStatus('all'); setSelected(null); }}
              className="rounded border border-zinc-300 px-3 py-1 hover:border-emerald-500 dark:border-zinc-700"
            >
              Show all questions
            </button>
          </div>
        ) : (
          <Practice key={`${roundId}:${selected ?? ''}:${status}`} questions={filtered} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} role={role} />
        ))}
        {tab === 'browse' && <Browse questions={filtered} state={state} dispatch={dispatch} />}
        {tab === 'design-prompt' && <DesignSession state={state} dispatch={dispatch} role={role} />}
      </div>
    </main>
  );
}
