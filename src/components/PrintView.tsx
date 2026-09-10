import type { Persisted } from '../types';
import { questionsByRound, rounds } from '../data';

export function PrintView({ state }: { state: Persisted }) {
  const sections = rounds
    .map((round) => ({
      round,
      items: questionsByRound(round.id).filter(
        (q) => state.progress[q.id]?.rating === 1 || (state.notes[q.id] ?? '').trim().length > 0,
      ),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href="#" className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">← All rounds</a>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Print
        </button>
      </div>
      <h1 className="mb-4 text-2xl font-semibold">Cheat sheet</h1>
      {sections.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">Nothing rated weak or noted yet.</p>
      ) : (
        sections.map(({ round, items }) => (
          <section key={round.id} className="mb-6 break-inside-avoid-page">
            <h2 className="mb-2 border-b border-zinc-200 pb-1 text-lg font-medium dark:border-zinc-800">{round.title}</h2>
            <ul className="space-y-3">
              {items.map((q) => {
                const note = (state.notes[q.id] ?? '').trim();
                return (
                  <li key={q.id} className="break-inside-avoid-page">
                    <p className="font-medium">{q.question}</p>
                    {note && <p className="text-sm italic">{note}</p>}
                    <ul className="list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                      {q.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
