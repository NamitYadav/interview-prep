import type { Persisted } from '../types';
import { BackLink } from './BackLink';
import { questions, rounds } from '../data';

const titleOf = (id: string) => rounds.find((r) => r.id === id)?.title ?? id;

export function NotesView({ state }: { state: Persisted }) {
  // Derived from the bank rather than from the notes map, so ordering follows the
  // rounds and a note left behind by a removed question simply drops out.
  const noted = questions.filter((q) => (state.notes[q.id] ?? '').trim().length > 0);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackLink />
      <h1 tabIndex={-1} className="text-2xl font-semibold">My notes</h1>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Every note you have written, in round order. Edit them on the question itself.
      </p>

      {noted.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-center text-zinc-500 dark:text-zinc-400">
          No notes yet. Write your own story under any question and it shows up here.
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">{noted.length} noted</p>
          <ol className="space-y-3">
            {noted.map((q) => (
              <li key={q.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <a href={`#${q.round}`} className="rounded bg-zinc-100 px-2 py-0.5 hover:underline dark:bg-zinc-800">
                    {titleOf(q.round)}
                  </a>
                  <span>{q.id}</span>
                </div>
                <h2 className="mb-2 text-sm font-medium">{q.question}</h2>
                <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{state.notes[q.id]}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </main>
  );
}
