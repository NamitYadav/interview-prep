import { useEffect, useRef, useState } from 'react';
import type { Question, Rating, Stories } from '../types';
import { rounds, isStoryPrompt } from '../data';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { useDebouncedField } from '../hooks/useDebouncedField';
import { useRecorder } from '../hooks/useRecorder';
import { formatTime } from '../lib/format';

export const RATINGS: { value: Rating; label: string; className: string }[] = [
  { value: 1, label: 'Weak', className: 'border-red-500 text-red-600 dark:text-red-400' },
  { value: 2, label: 'OK', className: 'border-amber-500 text-amber-600 dark:text-amber-400' },
  { value: 3, label: 'Solid', className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
];

const suggestedRating = (hits: number, total: number): Rating | undefined =>
  total === 0 ? undefined : hits === total ? 3 : hits === 0 ? 1 : 2;

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
  question, revealed, note, rating, strictMode = false, checked, onCheckedChange, focusOnMount = true,
  stories, onRehearse, onReveal, onNote, onRate,
}: {
  question: Question; revealed: boolean; note: string; rating?: Rating; strictMode?: boolean;
  checked?: Set<number>; onCheckedChange?: (next: Set<number>) => void; focusOnMount?: boolean;
  stories?: Stories; onRehearse?: (id: string) => void;
  onReveal: () => void; onNote: (text: string) => void; onRate: (r: Rating) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  // Practice controls this so ticks survive Back; Browse and #search pass neither prop,
  // and without a fallback every checkbox there was pinned to false and unticka-ble.
  const [ownChecked, setOwnChecked] = useState<Set<number>>(() => new Set());
  const checkedSet = checked ?? ownChecked;
  const setChecked = onCheckedChange ?? setOwnChecked;

  const targetSeconds = rounds.find((r) => r.id === question.round)?.targetSeconds;
  const { elapsedMs, remainingMs, autoRevealed, markRevealed } = useQuestionTimer({
    targetSeconds, strictMode, revealed, onAutoReveal: onReveal,
  });
  const handleReveal = () => {
    markRevealed();
    onReveal();
  };
  const showCountdown = strictMode && !revealed && targetSeconds !== undefined && remainingMs !== null;

  const note_ = useDebouncedField(note, onNote);
  const recorder = useRecorder();

  // Ephemeral, never persisted — a self-check against the model answer, not a
  // stored draft. Resets per question via Practice's `key={current.id}` remount,
  // same as every other piece of local state here.
  const [yourAnswer, setYourAnswer] = useState('');

  // Reveal one follow-up at a time, pre-reveal, each with its own running clock
  // from the moment it was probed — rehearsing the follow-up before you've even
  // seen the main model answer.
  const [followUpsProbed, setFollowUpsProbed] = useState(0);
  const [probeTimes, setProbeTimes] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (followUpsProbed === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [followUpsProbed]);
  const probeFollowUp = () => {
    const at = Date.now();
    setProbeTimes((t) => [...t, at]);
    setFollowUpsProbed((n) => n + 1);
    // Without this, `now` stays at its stale mount-time value until the first
    // interval tick a second later, making the freshly-probed follow-up's elapsed
    // time render as negative for that first frame.
    setNow(at);
  };

  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  // Declared before the heading effect so that on mount (Browse renders revealed) the
  // heading wins; on a Practice reveal only this one re-runs and focus lands on the answer
  // instead of falling to <body> when the Reveal button unmounts.
  useEffect(() => {
    if (revealed) answerRef.current?.focus();
  }, [revealed]);

  useEffect(() => {
    if (focusOnMount) headingRef.current?.focus();
  }, [question.id, focusOnMount]);

  const storyEntries = stories ? Object.entries(stories).sort(([, a], [, b]) => (a.lastRehearsed ?? 0) - (b.lastRehearsed ?? 0)) : [];

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span className="rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{question.category}</span>
        <span>{question.id}</span>
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="mb-4 text-lg font-medium outline-none">{question.question}</h2>

      {question.code && (
        question.scratch ? (
          <textarea
            key={question.id}
            defaultValue={question.code}
            spellCheck={false}
            wrap="off"
            rows={question.code.split('\n').length + 2}
            aria-label="Scratch editor"
            className="mb-4 w-full overflow-x-auto rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800"
          />
        ) : (
          <pre className="mb-4 overflow-x-auto rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800">
            <code>{question.code}</code>
          </pre>
        )
      )}

      {!revealed ? (
        <div className="space-y-4">
          {showCountdown && (
            <p role="timer" aria-live="off" className="text-xs text-zinc-500 dark:text-zinc-400">
              Time left: {formatTime(remainingMs!)}
            </p>
          )}

          {isStoryPrompt(question) && storyEntries.length > 0 && (
            <section>
              <h3 className="mb-1 font-semibold">Your stories</h3>
              <ul className="space-y-1">
                {storyEntries.map(([id, story]) => (
                  <li key={id} className="rounded border border-zinc-200 p-2 text-sm dark:border-zinc-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{story.title || '(untitled story)'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedStoryId(id);
                          onRehearse?.(id);
                        }}
                        className="shrink-0 rounded border border-zinc-300 px-2 py-1 text-xs hover:border-emerald-500 dark:border-zinc-700"
                      >
                        Use this
                      </button>
                    </div>
                    {expandedStoryId === id && <p className="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{story.body}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {question.followUps && question.followUps.length > 0 && (
            <section>
              <h3 className="mb-1 font-semibold">Likely follow-ups</h3>
              {followUpsProbed > 0 && (
                <ul className="mb-2 space-y-1">
                  {question.followUps.slice(0, followUpsProbed).map((f, i) => (
                    <li key={i}>
                      {f} <span className="text-xs text-zinc-500 dark:text-zinc-400">({formatTime(now - probeTimes[i]!)})</span>
                    </li>
                  ))}
                </ul>
              )}
              {followUpsProbed < question.followUps.length && (
                <button
                  type="button"
                  onClick={probeFollowUp}
                  className="rounded border border-zinc-300 px-3 py-1.5 text-xs hover:border-emerald-500 dark:border-zinc-700"
                >
                  Probe me ({followUpsProbed + 1}/{question.followUps.length})
                </button>
              )}
            </section>
          )}

          <section>
            <label htmlFor={`your-answer-${question.id}`} className="mb-1 block font-semibold">Your answer</label>
            <textarea
              id={`your-answer-${question.id}`}
              value={yourAnswer}
              onChange={(e) => setYourAnswer(e.target.value)}
              rows={3}
              placeholder="Your answer in 3 bullets, before you look"
              aria-label="Your answer"
              className="w-full rounded border border-zinc-300 bg-transparent p-2 text-sm dark:border-zinc-700"
            />
          </section>

          {recorder.supported && (
            <div>
              <button
                type="button"
                onPointerDown={recorder.start}
                onPointerUp={recorder.stop}
                onPointerLeave={recorder.stop}
                className={`rounded border px-3 py-1.5 text-xs ${recorder.recording ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-zinc-300 hover:border-emerald-500 dark:border-zinc-700'}`}
              >
                {recorder.recording ? 'Recording…' : 'Hold to record'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleReveal}
            className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Reveal <kbd className="ml-2 text-xs opacity-70 [@media(hover:none)]:hidden">Space</kbd>
          </button>
        </div>
      ) : (
        <div ref={answerRef} tabIndex={-1} className="animate-fade-in space-y-4 text-sm outline-none">
          {autoRevealed && (
            <p role="status" className="sr-only">Time&apos;s up — answer revealed</p>
          )}
          {elapsedMs !== null && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {autoRevealed ? 'Out of time' : `Answered in ${formatTime(elapsedMs)}`}
              {targetSeconds !== undefined && ` · target ${formatTime(targetSeconds * 1000)}`}
            </p>
          )}
          {yourAnswer.trim() !== '' && (
            <section>
              <h3 className="mb-1 font-semibold">Your answer</h3>
              <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{yourAnswer}</p>
            </section>
          )}
          {recorder.url && (
            <section>
              <h3 className="mb-1 font-semibold">Your recording</h3>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- an in-browser self-recording has no source to caption */}
              <audio controls src={recorder.url} className="w-full" />
            </section>
          )}
          <section className="space-y-2">
            {question.answer.map((p, i) => <p key={i}>{withPlaceholders(p)}</p>)}
          </section>
          {question.deeper && question.deeper.length > 0 && (
            <section className="border-l-2 border-zinc-300 pl-3 dark:border-zinc-600">
              <h3 className="mb-1 font-semibold">If they dig deeper</h3>
              <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
                {question.deeper.map((p, i) => <p key={i}>{withPlaceholders(p)}</p>)}
              </div>
            </section>
          )}
          <section>
            <h3 className="mb-1 font-semibold">Key points</h3>
            <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Check off what you actually said out loud.</p>
            <ul className="space-y-1">
              {question.keyPoints.map((k, i) => (
                <li key={i}>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={checkedSet.has(i)}
                      onChange={(e) => {
                        const next = new Set(checkedSet);
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
              const s = suggestedRating(checkedSet.size, question.keyPoints.length);
              return s && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {checkedSet.size}/{question.keyPoints.length} key points hit · suggested: {RATINGS.find((r) => r.value === s)!.label}
                </p>
              );
            })()}
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
              value={note_.draft}
              onChange={(e) => note_.onChange(e.target.value)}
              onBlur={note_.onBlur}
              rows={3}
              placeholder="Your real story for this question. Stays in this browser only."
              className="w-full rounded border border-zinc-300 bg-transparent p-2 dark:border-zinc-700"
            />
          </section>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rate yourself">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                onClick={() => onRate(r.value)}
                aria-checked={rating === r.value}
                className={`rounded border px-4 py-2 ${r.className} ${rating === r.value ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
              >
                {r.label} <kbd className="ml-1 text-xs opacity-70 [@media(hover:none)]:hidden">{r.value}</kbd>
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
