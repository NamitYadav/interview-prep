import { useMemo, useState, type Dispatch } from 'react';
import type { Persisted, Question } from '../types';
import type { Action } from '../hooks/useAppState';
import { QuestionCard } from './QuestionCard';

const RATING_LABEL = { 1: 'Weak', 2: 'OK', 3: 'Solid' } as const;

export function Browse({ questions, state, dispatch }: { questions: Question[]; state: Persisted; dispatch: Dispatch<Action> }) {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  // Recomputed only when the question set itself changes (a round or category
  // switch), not per keystroke — the filter below is then a plain lookup.
  const haystack = useMemo(
    () => new Map(questions.map((q) => [q.id, `${q.question} ${q.category} ${q.answer.join(' ')} ${(q.deeper ?? []).join(' ')} ${q.keyPoints.join(' ')}`.toLowerCase()])),
    [questions],
  );
  const needle = search.trim().toLowerCase();
  const visible = useMemo(
    () => (needle ? questions.filter((q) => haystack.get(q.id)?.includes(needle)) : questions),
    [questions, haystack, needle],
  );

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search questions…"
        aria-label="Search questions"
        className="w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{visible.length} of {questions.length}</p>
      <ul className="space-y-2">
        {visible.map((q) => {
          const rating = state.progress[q.id]?.rating;
          const open = openId === q.id;
          return (
            <li key={q.id}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : q.id)}
                className={`flex w-full items-start justify-between gap-3 rounded border p-3 text-left text-sm hover:border-emerald-500 dark:bg-zinc-900 ${open ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-zinc-200 bg-white dark:border-zinc-800'}`}
              >
                <span>
                  <span className="mr-2 text-xs text-zinc-500 dark:text-zinc-400">{q.category}</span>
                  {q.question}
                </span>
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{rating ? RATING_LABEL[rating] : '—'}</span>
              </button>
              {open && (
                <QuestionCard
                  question={q}
                  revealed
                  note={state.notes[q.id] ?? ''}
                  rating={rating}
                  focusOnMount={false}
                  onReveal={() => {}}
                  onNote={(text) => dispatch({ type: 'note', id: q.id, text })}
                  onRate={(r) => dispatch({ type: 'rate', id: q.id, rating: r, now: Date.now() })}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
