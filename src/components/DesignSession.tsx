import { useEffect, useRef, useState, type Dispatch } from 'react';
import type { Persisted, Question } from '../types';
import type { Action } from '../hooks/useAppState';
import { questionsByRound } from '../data';
import { nextQuestion } from '../lib/queue';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { DRAFT_SAVE_FAILED, useDraft } from '../hooks/useDraft';
import { draftKey } from '../lib/drafts';
import { formatTime } from '../lib/format';
import { RatingRadios } from './RatingRadios';

// The phases from design-013's answer skeleton — requirements through rollout.
const PHASES = [
  'Requirements', 'API / data shape', 'Component tree', 'State ownership',
  'Performance', 'Accessibility / i18n', 'Observability', 'Rollout',
];

const TARGET_SECONDS = 45 * 60;

const noop = () => {};

export function DesignSession({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  const designQuestions = questionsByRound('design');
  // Excludes the prompt just shown: without this, nextQuestion is memoryless of what's
  // on screen, and a question sitting in the lowest bucket (unrated, or just rated
  // Weak — Weak keeps it there) got served again on the very next restart, over and
  // over, rather than "Another prompt" ever moving on.
  const pickQuestionId = (excludeId?: string) => {
    const exclude = excludeId ? new Set([excludeId]) : undefined;
    return nextQuestion(designQuestions, state.progress, exclude)?.id ?? excludeId;
  };
  const [questionId, setQuestionId] = useState(() => pickQuestionId());
  // Bumped on every restart so the key below changes even when the next prompt
  // happens to be the very same question (e.g. only one prompt exists at all) —
  // relying on question.id alone wouldn't force a remount in that case.
  const [attempt, setAttempt] = useState(0);

  const question = designQuestions.find((q) => q.id === questionId);
  if (!question) {
    return <p className="rounded border border-dashed p-6 text-center text-zinc-500 dark:text-zinc-400">No design prompts available.</p>;
  }

  return (
    <DesignPrompt
      // A fresh prompt must be a full remount, not just a state reset —
      // useQuestionTimer's clock starts from its own mount, so without this every
      // later prompt in the same visit would inherit the very first prompt's
      // deadline instead of getting its own 45 minutes.
      key={`${question.id}-${attempt}`}
      question={question}
      state={state}
      dispatch={dispatch}
      onRestart={() => {
        setQuestionId(pickQuestionId(question.id));
        setAttempt((a) => a + 1);
      }}
    />
  );
}

function DesignPrompt({
  question, state, dispatch, onRestart,
}: { question: Question; state: Persisted; dispatch: Dispatch<Action>; onRestart: () => void }) {
  const [finished, setFinished] = useState(false);
  const [checkedPhases, setCheckedPhases] = useState<Set<number>>(new Set());
  // Keyed by question id alone, not id+attempt: `attempt` is an in-memory counter that
  // restarts at 0 on every fresh mount, so a reload after "Another prompt" (attempt 1+)
  // read back attempt 0's key — which for that question may hold nothing, or an older
  // draft — making whatever was written at the later attempt unreachable, not merely
  // reset. Keying by question id means a reload always finds this question's latest
  // scratch, and a genuinely fresh prompt naturally starts empty since it has none yet.
  const scratch = useDraft(draftKey(question.id, 'design-scratch'));

  // Finish unmounts the button under the user, dropping focus to <body> with nothing
  // announced. Send it to the heading of the answer that replaced the working area.
  const answerHeadingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (finished) answerHeadingRef.current?.focus();
  }, [finished]);

  // Visible 45-minute countdown that never forces anything — a real loop doesn't
  // cut you off, it just tells you the clock is running.
  const { remainingMs } = useQuestionTimer({
    targetSeconds: TARGET_SECONDS, strictMode: true, revealed: finished, onAutoReveal: noop, autoReveal: false,
  });

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
              value={scratch.draft}
              onChange={(e) => scratch.onChange(e.target.value)}
              onBlur={scratch.onBlur}
              rows={10}
              placeholder="Sketch your design out loud as you go — requirements, API shape, components, trade-offs."
              className="w-full rounded border border-zinc-300 bg-transparent p-2 text-sm dark:border-zinc-700"
            />
            {scratch.saveFailed && (
              <p role="alert" className="mt-1 text-xs text-amber-700 dark:text-amber-400">{DRAFT_SAVE_FAILED}</p>
            )}
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
            <h3 ref={answerHeadingRef} tabIndex={-1} className="mb-1 font-semibold">Model answer</h3>
            {question.answer.map((p, i) => <p key={i}>{p}</p>)}
          </section>
          {question.deeper && question.deeper.length > 0 && (
            <section className="border-l-2 border-zinc-300 pl-3 dark:border-zinc-600">
              <h3 className="mb-1 font-semibold">If they dig deeper</h3>
              <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
                {question.deeper.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </section>
          )}
          <section>
            <h3 className="mb-1 font-semibold">Key points</h3>
            <ul className="list-disc space-y-1 pl-5">
              {question.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          </section>
          <RatingRadios
            rating={rating}
            onRate={(r) => dispatch({ type: 'rate', id: question.id, rating: r, now: Date.now() })}
          />
          <button
            type="button"
            onClick={onRestart}
            className="rounded border border-zinc-300 px-4 py-2 text-sm hover:border-emerald-500 dark:border-zinc-700"
          >
            Another prompt
          </button>
        </div>
      )}
    </article>
  );
}
