import type { Dispatch } from 'react';
import { BackLink } from './BackLink';
import type { Persisted, Story } from '../types';
import type { Action } from '../hooks/useAppState';
import { useDebouncedField } from '../hooks/useDebouncedField';

const daysAgo = (ts: number): string => {
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

export function StoriesView({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  // Never-rehearsed first, then longest since rehearsed — same weak-first spirit as the queue.
  const entries = Object.entries(state.stories).sort(
    ([, a], [, b]) => (a.lastRehearsed ?? 0) - (b.lastRehearsed ?? 0),
  );

  const addStory = () => {
    dispatch({ type: 'saveStory', id: crypto.randomUUID(), title: '', body: '' });
  };

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackLink />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 tabIndex={-1} className="text-2xl font-semibold">My stories</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Reusable STAR stories. Write once, reach for them under any question that fits.
          </p>
        </div>
        <button
          type="button"
          onClick={addStory}
          className="shrink-0 rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + New story
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-center text-zinc-500 dark:text-zinc-400">
          No stories yet. Add one and reuse it across every question it fits.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map(([id, story]) => (
            <StoryEditor key={id} id={id} story={story} dispatch={dispatch} />
          ))}
        </ul>
      )}
    </main>
  );
}

function StoryEditor({ id, story, dispatch }: { id: string; story: Story; dispatch: Dispatch<Action> }) {
  // Each field dispatches only its own value — the reducer merges it against
  // whatever is currently stored, so committing one field never overwrites a
  // concurrent, still-in-flight edit to the other with a stale snapshot of it.
  const title = useDebouncedField(story.title, (text) => dispatch({ type: 'saveStory', id, title: text }));
  const body = useDebouncedField(story.body, (text) => dispatch({ type: 'saveStory', id, body: text }));

  return (
    <li className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <input
        value={title.draft}
        onChange={(e) => title.onChange(e.target.value)}
        onBlur={title.onBlur}
        placeholder="Story title (e.g. the migration you led)"
        aria-label="Story title"
        className="mb-2 w-full rounded border border-zinc-300 bg-transparent px-2 py-1 font-medium dark:border-zinc-700"
      />
      <textarea
        value={body.draft}
        onChange={(e) => body.onChange(e.target.value)}
        onBlur={body.onBlur}
        rows={5}
        placeholder="Situation, Task, Action, Result — your real story, specifics included."
        aria-label="Story body"
        className="mb-2 w-full rounded border border-zinc-300 bg-transparent p-2 text-sm dark:border-zinc-700"
      />
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{story.lastRehearsed ? `Last rehearsed ${daysAgo(story.lastRehearsed)}` : 'Never rehearsed'}</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'rehearseStory', id, now: Date.now() })}
            className="rounded border border-zinc-300 px-2 py-1 hover:border-emerald-500 dark:border-zinc-700"
          >
            Mark rehearsed
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this story?')) dispatch({ type: 'deleteStory', id });
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-red-600 hover:border-red-500 dark:border-zinc-700 dark:text-red-400"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
