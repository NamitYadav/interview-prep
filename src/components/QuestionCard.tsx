import { useEffect, useRef, useState } from 'react';
import type { Question, Rating } from '../types';
import { rounds } from '../data';

const RATINGS: { value: Rating; label: string; className: string }[] = [
  { value: 1, label: 'Weak', className: 'border-red-500 text-red-600 dark:text-red-400' },
  { value: 2, label: 'OK', className: 'border-amber-500 text-amber-600 dark:text-amber-400' },
  { value: 3, label: 'Solid', className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
];

const suggestedRating = (hits: number, total: number): Rating | undefined =>
  total === 0 ? undefined : hits === total ? 3 : hits === 0 ? 1 : 2;

const formatTime = (ms: number) => {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const PLACEHOLDER_SPLIT = /(\[[^\]]+\])/;
const isPlaceholder = (s: string) => /^\[[^\]]+\]$/.test(s);

// "[your current role]"-style bracket slots are a fill-in-your-own-details cue, not
// a rating or status color — dashed underline keeps that distinct from everything else.
const withPlaceholders = (text: string) =>
  text.split(PLACEHOLDER_SPLIT).map((part, i) =>
    isPlaceholder(part) ? (
      <span key={i} className="underline decoration-dashed decoration-zinc-400 underline-offset-2 dark:decoration-zinc-500">
        {part}
      </span>
    ) : (
      part
    ),
  );

export function QuestionCard({
  question, revealed, note, rating, onReveal, onNote, onRate,
}: {
  question: Question; revealed: boolean; note: string; rating?: Rating;
  onReveal: () => void; onNote: (text: string) => void; onRate: (r: Rating) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [followUpsShown, setFollowUpsShown] = useState(false);

  // Runs from mount to the Reveal click — a stopwatch, not a countdown, so it never
  // forces a hide. Stays null in Browse, which renders already-revealed and never
  // fires this click. Set in an effect, not `useRef(Date.now())` in the render body —
  // Date.now() is impure, and the effect always commits before a user could click
  // Reveal, so the timing is equivalent in practice.
  const mountedAt = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const targetSeconds = rounds.find((r) => r.id === question.round)?.targetSeconds;
  const handleReveal = () => {
    setElapsedMs(Date.now() - mountedAt.current!);
    onReveal();
  };

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

      {question.code && (
        <pre className="mb-4 overflow-x-auto rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800">
          <code>{question.code}</code>
        </pre>
      )}

      {!revealed ? (
        <button
          type="button"
          onClick={handleReveal}
          className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Reveal <kbd className="ml-2 text-xs opacity-70 [@media(hover:none)]:hidden">Space</kbd>
        </button>
      ) : (
        <div ref={answerRef} tabIndex={-1} className="animate-fade-in space-y-4 text-sm outline-none">
          {elapsedMs !== null && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Answered in {formatTime(elapsedMs)}{targetSeconds !== undefined && ` · target ${formatTime(targetSeconds * 1000)}`}
            </p>
          )}
          <section className="space-y-2">
            {question.answer.map((p, i) => <p key={i}>{withPlaceholders(p)}</p>)}
          </section>
          <section>
            <h3 className="mb-1 font-semibold">Key points</h3>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Check off what you actually said out loud.</p>
            <ul className="space-y-1">
              {question.keyPoints.map((k, i) => (
                <li key={i}>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={checked.has(i)}
                      onChange={(e) => {
                        const next = new Set(checked);
                        if (e.target.checked) next.add(i); else next.delete(i);
                        setChecked(next);
                      }}
                      className="mt-1"
                    />
                    <span>{k}</span>
                  </label>
                </li>
              ))}
            </ul>
            {(() => {
              const s = suggestedRating(checked.size, question.keyPoints.length);
              return s && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {checked.size}/{question.keyPoints.length} key points hit · suggested: {RATINGS.find((r) => r.value === s)!.label}
                </p>
              );
            })()}
          </section>
          {question.followUps && question.followUps.length > 0 && (
            <section>
              <h3 className="mb-1 font-semibold">Likely follow-ups</h3>
              {!followUpsShown ? (
                <button
                  type="button"
                  onClick={() => setFollowUpsShown(true)}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-xs hover:border-emerald-500 dark:border-zinc-700"
                >
                  Answer the follow-up
                </button>
              ) : (
                <ul className="animate-fade-in list-disc space-y-1 pl-5">{question.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul>
              )}
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
                {r.label} <kbd className="ml-1 text-xs opacity-70 [@media(hover:none)]:hidden">{r.value}</kbd>
              </button>
            ))}
          </section>
        </div>
      )}
    </article>
  );
}
