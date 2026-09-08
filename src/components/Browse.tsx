import { useState, type Dispatch } from 'react';
import type { Persisted, Question } from '../types';
import type { Action } from '../hooks/useAppState';
import { QuestionCard } from './QuestionCard';

const RATING_LABEL = { 1: 'Weak', 2: 'OK', 3: 'Solid' } as const;

export function Browse({ questions, state, dispatch }: { questions: Question[]; state: Persisted; dispatch: Dispatch<Action> }) {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const needle = search.trim().toLowerCase();
  const visible = needle
    ? questions.filter((q) => q.question.toLowerCase().includes(needle) || q.category.toLowerCase().includes(needle))
    : questions;

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
      <p className="text-xs text-zinc-500">{visible.length} of {questions.length}</p>
      <ul className="space-y-2">
        {visible.map((q) => {
          const rating = state.progress[q.id]?.rating;
          const open = openId === q.id;
          return (
            <li key={q.id}>
              {open ? (
                <div>
                  <QuestionCard
                    question={q}
                    revealed
                    note={state.notes[q.id] ?? ''}
                    rating={rating}
                    onReveal={() => {}}
                    onNote={(text) => dispatch({ type: 'note', id: q.id, text })}
                    onRate={(r) => dispatch({ type: 'rate', id: q.id, rating: r, now: Date.now() })}
                  />
                  <button type="button" onClick={() => setOpenId(null)} className="mt-1 text-sm text-zinc-500 hover:underline">Collapse</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenId(q.id)}
                  className="flex w-full items-start justify-between gap-3 rounded border border-zinc-200 bg-white p-3 text-left text-sm hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span>
                    <span className="mr-2 text-xs text-zinc-500">{q.category}</span>
                    {q.question}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">{rating ? RATING_LABEL[rating] : '—'}</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
