import { useState, type Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound } from '../data';
import { nextQuestion } from '../lib/queue';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { formatTime } from '../lib/format';
import { RATINGS } from './QuestionCard';

// The phases from design-013's answer skeleton — requirements through rollout.
const PHASES = [
  'Requirements', 'API / data shape', 'Component tree', 'State ownership',
  'Performance', 'Accessibility / i18n', 'Observability', 'Rollout',
];

const TARGET_SECONDS = 45 * 60;

const noop = () => {};

export function DesignSession({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  const designQuestions = questionsByRound('design');
  const pickQuestionId = () => nextQuestion(designQuestions, state.progress)?.id;

  const [questionId, setQuestionId] = useState(pickQuestionId);
  const [finished, setFinished] = useState(false);
  const [checkedPhases, setCheckedPhases] = useState<Set<number>>(new Set());
  const [scratch, setScratch] = useState('');

  const question = designQuestions.find((q) => q.id === questionId);

  // Visible 45-minute countdown that never forces anything — a real loop doesn't
  // cut you off, it just tells you the clock is running.
  const { remainingMs } = useQuestionTimer({
    targetSeconds: TARGET_SECONDS, strictMode: true, revealed: finished, onAutoReveal: noop, autoReveal: false,
  });

  const restart = () => {
    setQuestionId(pickQuestionId());
    setFinished(false);
    setCheckedPhases(new Set());
    setScratch('');
  };

  if (!question) {
    return <p className="rounded border border-dashed p-6 text-center text-zinc-500 dark:text-zinc-400">No design prompts available.</p>;
  }

  const rating = state.progress[question.id]?.rating;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span className="rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{question.category}</span>
        <span>{question.id}</span>
      </div>
      <h2 className="mb-4 text-lg font-medium">{question.question}</h2>

      {!finished && remainingMs !== null && (
        <p role="timer" aria-live="off" className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
          Time left: {formatTime(remainingMs)}
        </p>
      )}

      {!finished ? (
        <div className="space-y-4">
          <section>
            <h3 className="mb-1 font-semibold">Phases</h3>
            <ul className="space-y-1 text-sm">
              {PHASES.map((phase, i) => (
                <li key={i}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checkedPhases.has(i)}
                      onChange={(e) => {
                        const next = new Set(checkedPhases);
                        if (e.target.checked) next.add(i); else next.delete(i);
                        setCheckedPhases(next);
                      }}
                    />
                    {phase}
                  </label>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <label htmlFor="design-scratch" className="mb-1 block font-semibold">Scratch</label>
            <textarea
              id="design-scratch"
              value={scratch}
              onChange={(e) => setScratch(e.target.value)}
              rows={10}
              placeholder="Sketch your design out loud as you go — requirements, API shape, components, trade-offs."
              className="w-full rounded border border-zinc-300 bg-transparent p-2 text-sm dark:border-zinc-700"
            />
          </section>
          <button
            type="button"
            onClick={() => setFinished(true)}
            className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Finish
          </button>
        </div>
      ) : (
        <div className="animate-fade-in space-y-4 text-sm">
          <section className="space-y-2">
            {question.answer.map((p, i) => <p key={i}>{p}</p>)}
          </section>
          <section>
            <h3 className="mb-1 font-semibold">Key points</h3>
            <ul className="list-disc space-y-1 pl-5">
              {question.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          </section>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rate yourself">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                onClick={() => dispatch({ type: 'rate', id: question.id, rating: r.value, now: Date.now() })}
                aria-checked={rating === r.value}
                className={`rounded border px-4 py-2 ${r.className} ${rating === r.value ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={restart}
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:border-emerald-500 dark:border-zinc-700"
          >
            Another prompt
          </button>
        </div>
      )}
    </article>
  );
}
