import { useEffect, useRef } from 'react';
import type { Question, Rating } from '../types';

const RATINGS: { value: Rating; label: string; className: string }[] = [
  { value: 1, label: 'Weak', className: 'border-red-500 text-red-600 dark:text-red-400' },
  { value: 2, label: 'OK', className: 'border-amber-500 text-amber-600 dark:text-amber-400' },
  { value: 3, label: 'Solid', className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
];

export function QuestionCard({
  question, revealed, note, rating, onReveal, onNote, onRate,
}: {
  question: Question; revealed: boolean; note: string; rating?: Rating;
  onReveal: () => void; onNote: (text: string) => void; onRate: (r: Rating) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  // Declared before the heading effect so that on mount (Browse renders revealed) the
  // heading wins; on a Practice reveal only this one re-runs and focus lands on the answer
  // instead of falling to <body> when the Reveal button unmounts.
  useEffect(() => {
    if (revealed) answerRef.current?.focus();
  }, [revealed]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [question.id]);

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span className="rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{question.category}</span>
        <span>{question.id}</span>
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="mb-4 text-lg font-medium outline-none">{question.question}</h2>

      {!revealed ? (
        <button
          type="button"
          onClick={onReveal}
          className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Reveal <kbd className="ml-2 text-xs opacity-70">Space</kbd>
        </button>
      ) : (
        <div ref={answerRef} tabIndex={-1} className="space-y-4 text-sm outline-none">
          <section className="space-y-2">
            {question.answer.map((p, i) => <p key={i}>{p}</p>)}
          </section>
          <section>
            <h3 className="mb-1 font-semibold">Key points</h3>
            <ul className="list-disc space-y-1 pl-5">{question.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
          </section>
          {question.followUps && question.followUps.length > 0 && (
            <section>
              <h3 className="mb-1 font-semibold">Likely follow-ups</h3>
              <ul className="list-disc space-y-1 pl-5">{question.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </section>
          )}
          <section>
            <label htmlFor={`note-${question.id}`} className="mb-1 block font-semibold">Your note</label>
            <textarea
              id={`note-${question.id}`}
              value={note}
              onChange={(e) => onNote(e.target.value)}
              rows={3}
              placeholder="Your real story for this question. Stays in this browser only."
              className="w-full rounded border border-zinc-300 bg-transparent p-2 dark:border-zinc-700"
            />
          </section>
          <section className="flex flex-wrap gap-2" aria-label="Rate yourself">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => onRate(r.value)}
                aria-pressed={rating === r.value}
                className={`rounded border px-4 py-2 ${r.className} ${rating === r.value ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
              >
                {r.label} <kbd className="ml-1 text-xs opacity-70">{r.value}</kbd>
              </button>
            ))}
          </section>
        </div>
      )}
    </article>
  );
}
