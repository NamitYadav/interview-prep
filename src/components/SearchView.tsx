import { useMemo, useState, type Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted, RoleId } from '../types';
import type { Action } from '../hooks/useAppState';
import { forRole } from '../data';
import { filterByStatus, type QuestionStatus } from '../lib/queue';
import { Browse } from './Browse';
import { STATUS_OPTIONS, Select } from './Select';

export function SearchView({ state, dispatch, role }: { state: Persisted; dispatch: Dispatch<Action>; role: RoleId }) {
  const { questions } = forRole(role);
  const [status, setStatus] = useState<QuestionStatus>('all');
  // Frozen on the filter, not on progress, for the same reason RoundView freezes: rating
  // a question from the list would otherwise make the card you are looking at vanish.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => filterByStatus(questions, status, state.progress), [status, questions]);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackLink />
      <h1 tabIndex={-1} className="mb-1 text-2xl font-semibold">Search</h1>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Every question, every round, in one search.</p>
      <Select label="Status" value={status} onChange={(v) => setStatus(v as QuestionStatus)} options={STATUS_OPTIONS} />
      <Browse questions={filtered} state={state} dispatch={dispatch} />
    </main>
  );
}
