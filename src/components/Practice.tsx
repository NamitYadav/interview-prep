import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import type { Persisted, Question, Rating, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { nextQuestion, roundStats } from '../lib/queue';
import { rounds } from '../data';
import { formatTime } from '../lib/format';
import { QuestionCard } from './QuestionCard';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT');

// A weak rating requeues instead of ending the question's turn on the spot — it
// comes back around after roughly this many further questions, not immediately
// (which would just repeat it) and not "eventually" (which would let it get lost).
const REQUEUE_GAP = 8;

interface RequeueEntry { id: string; at: number }

export function Practice({
  questions, state, dispatch, strictMode, ordered = false, onLapComplete,
}: {
  questions: Question[]; state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean;
  ordered?: boolean; onLapComplete?: () => void;
}) {
  // In `ordered` mode (a curated, round-shaped set) the array's own order is the
  // queue; otherwise the weak/unrated/ok/solid bucket order from lib/queue.
  const pickNext = (progress: Persisted['progress'], seen: ReadonlySet<string>): Question | undefined =>
    ordered ? questions.find((q) => !seen.has(q.id)) : nextQuestion(questions, progress, seen);

  // `history` is every question id shown this lap, in order; `historyPos` is which one
  // is on screen. Advancing appends and moves the pointer to the end; Back just moves
  // the pointer back over ids already recorded, no separate undo stack needed.
  const [history, setHistory] = useState<string[]>(() => {
    const first = pickNext(state.progress, new Set())?.id;
    return first ? [first] : [];
  });
  const [historyPos, setHistoryPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [lapDone, setLapDone] = useState(false);

  // A weak rating doesn't end its question's turn for the lap — it schedules a
  // requeue instead, so the same question comes back around roughly REQUEUE_GAP
  // questions later rather than being marked "seen" and gone for the rest of the lap.
  const [requeued, setRequeued] = useState<RequeueEntry[]>([]);
  const [step, setStep] = useState(0);

  // Hoisted out of QuestionCard so Back doesn't discard ticks: QuestionCard used to
  // keep this as its own state, reset by Practice's `key={current.id}` remount, which
  // meant re-visiting a question via Back always showed an empty checklist.
  const [checkedByQuestion, setCheckedByQuestion] = useState<Record<string, Set<number>>>({});

  const currentId = history[historyPos];
  const current = useMemo(() => questions.find((q) => q.id === currentId), [questions, currentId]);

  // The distinct rounds present in this set, in the order they first appear —
  // used for the "Round k of n" boundary banner in ordered (mock-session) mode.
  const distinctRounds = useMemo(() => {
    const seen = new Set<RoundId>();
    for (const q of questions) seen.add(q.round);
    return [...seen];
  }, [questions]);
  const previousId = historyPos > 0 ? history[historyPos - 1] : undefined;
  const previousQuestion = useMemo(() => questions.find((q) => q.id === previousId), [questions, previousId]);
  const roundBoundary = current && (!previousQuestion || previousQuestion.round !== current.round)
    ? { index: distinctRounds.indexOf(current.round), total: distinctRounds.length, round: rounds.find((r) => r.id === current.round) }
    : null;

  // Ids already used in the current path — derived from history up to the current
  // position rather than a separately-tracked set, so a Back-then-advance that
  // overwrites the old forward path automatically drops those ids from "seen" too.
  // Known edge case: a multi-step Back followed by re-rating can land on a question
  // further along than the one immediately after it (re-rating moves a question to
  // a new bucket, or to the back of its bucket by lastSeen, changing queue order),
  // silently un-seeing whatever sat in between — that
  // question resurfaces later in the same lap rather than being lost, so a lap can
  // occasionally need more ratings than it has questions. No data loss, no stuck
  // state; see the "extra rating after a double Back" test in Practice.test.tsx.
  const seenInPath = () => new Set(history.slice(0, historyPos + 1));

  const serveNext = (id: string) => {
    setStep((s) => s + 1);
    setHistory((h) => [...h.slice(0, historyPos + 1), id]);
    setHistoryPos((p) => p + 1);
    setRevealed(false);
  };

  // A lap ends only once nextQuestion has nothing left AND every requeue has been
  // served — a pending requeue keeps the lap open past the point every question
  // would otherwise have been "shown once".
  const advance = (progress: Persisted['progress'], seen: ReadonlySet<string>) => {
    const dueIndex = requeued.findIndex((r) => r.at <= step);
    if (dueIndex !== -1) {
      setRequeued((r) => r.filter((_, i) => i !== dueIndex));
      serveNext(requeued[dueIndex]!.id);
      return;
    }
    const next = pickNext(progress, seen);
    if (next) {
      serveNext(next.id);
      return;
    }
    if (requeued.length > 0) {
      // Nothing left in the regular queue — drain whatever's pending, in the order
      // it was scheduled, rather than making the lap wait out the rest of the gap.
      const [first, ...rest] = requeued;
      setRequeued(rest);
      serveNext(first!.id);
      return;
    }
    setLapDone(true);
    onLapComplete?.();
  };

  const rate = (rating: Rating) => {
    if (!current) return;
    dispatch({ type: 'rate', id: current.id, rating, now: Date.now() });
    if (rating === 1) setRequeued((r) => [...r, { id: current.id, at: step + REQUEUE_GAP }]);
    // The current id is excluded from `seen` either way, so the pre-rate progress
    // is fine here — re-running the reducer just to get progress with this one
    // entry updated was a provable no-op for what advance() actually uses it for.
    advance(state.progress, seenInPath());
  };

  const skip = () => {
    if (!current) return;
    advance(state.progress, seenInPath());
  };

  const back = () => {
    if (historyPos === 0) return;
    setHistoryPos((p) => p - 1);
    setRevealed(true);
  };

  const startAnotherLap = () => {
    const first = pickNext(state.progress, new Set())?.id;
    setHistory(first ? [first] : []);
    setHistoryPos(0);
    setRequeued([]);
    setStep(0);
    setRevealed(false);
    setLapDone(false);
  };

  // Keydown handler is registered once; latest closures are read through this ref
  // so skip/rate/revealed never go stale without re-subscribing on every render.
  const latest = useRef({ skip, rate, back, revealed });
  useEffect(() => {
    latest.current = { skip, rate, back, revealed };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const isButton = e.target instanceof HTMLElement && e.target.tagName === 'BUTTON';
      if (e.key === ' ') {
        if (isButton) return;
        // Only claim Space as the reveal shortcut before reveal — once revealed, a
        // revealed answer can be long enough to scroll, and Space is the standard
        // page-scroll key.
        if (!latest.current.revealed) { e.preventDefault(); setRevealed(true); }
      }
      else if (e.key === 'n' || e.key === 'N') latest.current.skip();
      else if (e.key === 'b' || e.key === 'B') latest.current.back();
      else if (latest.current.revealed && (e.key === '1' || e.key === '2' || e.key === '3')) latest.current.rate(Number(e.key) as Rating);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (lapDone) {
    const stats = roundStats(questions, state.progress);
    return (
      <div className="rounded border border-dashed p-6 text-center text-sm">
        <p className="mb-1 font-medium">Lap done</p>
        <p className="mb-4 text-zinc-600 dark:text-zinc-400">{stats.weak} weak · {stats.ok} ok · {stats.solid} solid</p>
        <button
          type="button"
          onClick={startAnotherLap}
          className="rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Start another lap
        </button>
      </div>
    );
  }

  if (!current) {
    return <p className="rounded border border-dashed p-6 text-center text-zinc-500 dark:text-zinc-400">No questions match this filter.</p>;
  }

  return (
    <div className="space-y-3">
      {roundBoundary && roundBoundary.round && (
        <p className="rounded border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Round {roundBoundary.index + 1} of {roundBoundary.total} — {roundBoundary.round.title} · target {formatTime(roundBoundary.round.targetSeconds * 1000)}
        </p>
      )}
      <QuestionCard
        key={current.id}
        question={current}
        revealed={revealed}
        note={state.notes[current.id] ?? ''}
        rating={state.progress[current.id]?.rating}
        strictMode={strictMode}
        checked={checkedByQuestion[current.id]}
        onCheckedChange={(next) => setCheckedByQuestion((prev) => ({ ...prev, [current.id]: next }))}
        stories={state.stories}
        onRehearse={(id) => dispatch({ type: 'rehearseStory', id, now: Date.now() })}
        onReveal={() => setRevealed(true)}
        onNote={(text) => dispatch({ type: 'note', id: current.id, text })}
        onRate={rate}
      />
      <div className="flex justify-between">
        <button
          type="button"
          onClick={back}
          disabled={historyPos === 0}
          className="text-sm text-zinc-500 disabled:opacity-40 dark:text-zinc-400 hover:enabled:underline"
        >
          <kbd className="mr-1 text-xs">B</kbd> Back
        </button>
        <button type="button" onClick={skip} className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
          Skip <kbd className="ml-1 text-xs">N</kbd>
        </button>
      </div>
    </div>
  );
}
