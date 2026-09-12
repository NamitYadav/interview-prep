import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import type { Persisted, Question, Rating, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { nextQuestion, roundStats } from '../lib/queue';
import { rounds } from '../data';
import { formatTime } from '../lib/format';
import { clearLap, lapKey, readLap, writeLap } from '../lib/lap';
import { QuestionCard } from './QuestionCard';

// Single-character shortcuts on `window` are only safe while nothing else on the page
// wants that key. A focused <audio> is the one that bit: the recording player owns the
// arrow keys AND Space, and `n` while scrubbing your own take skipped the question.
// contenteditable is here for the same reason a textarea is.
const ownsKeys = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' ||
    target.tagName === 'AUDIO' || target.tagName === 'VIDEO' ||
    // closest, not isContentEditable: it covers a focused descendant of an editable
    // host the same way, and unlike the property it is implemented in jsdom.
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null);

// A weak rating requeues instead of ending the question's turn on the spot — it
// comes back around after roughly this many further questions, not immediately
// (which would just repeat it) and not "eventually" (which would let it get lost).
const REQUEUE_GAP = 8;

interface RequeueEntry { id: string; at: number }

export function Practice({
  questions, state, dispatch, strictMode, shortcuts = true, ordered = false, onLapComplete,
}: {
  questions: Question[]; state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean;
  shortcuts?: boolean;
  ordered?: boolean; onLapComplete?: () => void;
}) {
  // In `ordered` mode (a curated, round-shaped set) the array's own order is the
  // queue; otherwise the weak/unrated/ok/solid bucket order from lib/queue.
  const pickNext = (progress: Persisted['progress'], seen: ReadonlySet<string>): Question | undefined =>
    ordered ? questions.find((q) => !seen.has(q.id)) : nextQuestion(questions, progress, seen);

  // `history` is every question id shown this lap, in order; `historyPos` is which one
  // is on screen. Advancing appends and moves the pointer to the end; Back just moves
  // the pointer back over ids already recorded, no separate undo stack needed.
  // A reload — or a phone discarding a backgrounded tab — used to drop you back to the
  // top of a 287-question queue. `saved` restores the lap when the stored position
  // belongs to THIS question set; a key mismatch starts fresh.
  const key = useMemo(() => lapKey(questions), [questions]);
  // lapKey is a heuristic (length + endpoints), and the bank's content changes between
  // sessions, so a restored history can name ids this set no longer contains — which
  // would render "No questions match" with no way out. Drop those, and fall back to a
  // fresh lap if the position no longer survives.
  const [saved] = useState(() => {
    const stored = readLap(key);
    if (!stored) return undefined;
    const known = new Set(questions.map((q) => q.id));
    const history = stored.history.filter((id) => known.has(id));
    if (history.length === 0) return undefined;
    // Count surviving entries BEFORE the stored position rather than searching by id:
    // a requeued question appears twice in history, so indexOf would find its first
    // appearance and rewind the lap to near the start.
    const survivingBefore = stored.history
      .slice(0, stored.historyPos)
      .filter((id) => known.has(id)).length;
    const currentId = stored.history[stored.historyPos];
    const historyPos = currentId !== undefined && known.has(currentId)
      ? survivingBefore
      : Math.min(survivingBefore, history.length - 1);
    return {
      ...stored,
      history,
      historyPos,
      requeued: stored.requeued.filter((r) => known.has(r.id)),
    };
  });

  const [history, setHistory] = useState<string[]>(() => {
    if (saved) return saved.history;
    const first = pickNext(state.progress, new Set())?.id;
    return first ? [first] : [];
  });
  const [historyPos, setHistoryPos] = useState(() => saved?.historyPos ?? 0);
  const [revealed, setRevealed] = useState(false);
  const [lapDone, setLapDone] = useState(false);

  // A weak rating doesn't end its question's turn for the lap — it schedules a
  // requeue instead, so the same question comes back around roughly REQUEUE_GAP
  // questions later rather than being marked "seen" and gone for the rest of the lap.
  const [requeued, setRequeued] = useState<RequeueEntry[]>(() => saved?.requeued ?? []);
  const [step, setStep] = useState(() => saved?.step ?? 0);

  // Hoisted out of QuestionCard so Back doesn't discard ticks: QuestionCard used to
  // keep this as its own state, reset by Practice's `key={current.id}` remount, which
  // meant re-visiting a question via Back always showed an empty checklist.
  const [checkedByQuestion, setCheckedByQuestion] = useState<Record<string, Set<number>>>({});

  // Same reason as checkedByQuestion: the card remounts per question, so going Back
  // used to discard whatever you had drafted before revealing. Lap-scoped on purpose —
  // it is a self-check against the model answer, not an artefact worth persisting.
  const [answerByQuestion, setAnswerByQuestion] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lapDone) {
      clearLap(key);
      return;
    }
    if (history.length === 0) return;
    // Nothing has happened yet — don't write a lap that is just "question 1", which
    // would otherwise let merely opening a set count as progress in it.
    if (!saved && historyPos === 0 && step === 0) return;
    writeLap({ key, history, historyPos, requeued, step });
  }, [key, saved, history, historyPos, requeued, step, lapDone]);

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
  // Only in `ordered` mode does "Round k of n" mean anything — a bucket-sorted set
  // (plain round Practice, Weak drill) jumps between rounds by rating recency, not
  // round order, so the same banner there would flicker on every jump rather than
  // marking a real transition.
  const roundBoundary = ordered && current && (!previousQuestion || previousQuestion.round !== current.round)
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
  const advance = (
    progress: Persisted['progress'],
    seen: ReadonlySet<string>,
    // The caller's view of the requeue list. rate() passes its own append explicitly,
    // because that setRequeued has not landed in state yet when advance() runs.
    pending: RequeueEntry[] = requeued,
  ) => {
    const dueIndex = pending.findIndex((r) => r.at <= step);
    if (dueIndex !== -1) {
      const due = pending[dueIndex]!;
      setRequeued((r) => r.filter((e) => e !== due));
      serveNext(due.id);
      return;
    }
    const next = pickNext(progress, seen);
    if (next) {
      serveNext(next.id);
      return;
    }
    // Nothing left in the regular queue — drain whatever's pending, in the order it
    // was scheduled, rather than making the lap wait out the rest of the gap. The
    // question just rated is excluded: re-serving it on the spot is a pure repeat with
    // nothing interleaved, and it would keep repeating until rated something else.
    const drainable = pending.filter((e) => e.id !== current?.id);
    if (drainable.length > 0) {
      const first = drainable[0]!;
      // Functional, and filtered by identity rather than index: rate() may have just
      // queued an append, and overwriting with a pre-computed tail silently dropped it.
      setRequeued((r) => r.filter((e) => e !== first));
      serveNext(first.id);
      return;
    }
    // Cleared here, not only from the lapDone effect: a parent that unmounts Practice
    // on this callback (MockSession swapping in its recap) means no render with
    // lapDone === true ever commits, so the effect would never fire and the finished
    // lap would restore at its last question.
    clearLap(key);
    setLapDone(true);
    onLapComplete?.();
  };

  const rate = (rating: Rating) => {
    if (!current) return;
    dispatch({ type: 'rate', id: current.id, rating, now: Date.now() });
    // A weak rating requeues the question. The setRequeued below has not landed in
    // state by the time advance() runs in this same closure, so the entry is handed
    // over explicitly — otherwise advance() sees a list without it and can end the lap
    // on a question the user just rated weak.
    const entry = rating === 1 ? { id: current.id, at: step + REQUEUE_GAP } : undefined;
    if (entry) setRequeued((r) => [...r, entry]);
    // The current id is excluded from `seen` either way, so the pre-rate progress
    // is fine here — re-running the reducer just to get progress with this one
    // entry updated was a provable no-op for what advance() actually uses it for.
    advance(state.progress, seenInPath(), entry ? [...requeued, entry] : requeued);
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

  // Rating the last question of a lap unmounts the button that was just activated, and
  // focus falls to <body>: nothing is announced and a keyboard user is back at the top
  // of the document. Move it to the heading of what replaced the card instead.
  const lapDoneRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (lapDone) lapDoneRef.current?.focus();
  }, [lapDone]);

  // Keydown handler is registered once; latest closures are read through this ref
  // so skip/rate/revealed never go stale without re-subscribing on every render.
  const latest = useRef({ skip, rate, back, revealed });
  useEffect(() => {
    latest.current = { skip, rate, back, revealed };
  });

  useEffect(() => {
    // Nothing is registered when shortcuts are off, rather than a listener that returns
    // early — WCAG 2.2 SC 2.1.4 wants the shortcut gone, and it means Space goes back to
    // scrolling the page instead of being swallowed.
    if (!shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (ownsKeys(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
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
  }, [shortcuts]);

  if (lapDone) {
    const stats = roundStats(questions, state.progress);
    return (
      <div className="rounded border border-dashed p-6 text-center text-sm">
        <h2 ref={lapDoneRef} tabIndex={-1} className="mb-1 font-medium">Lap done</h2>
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
        shortcuts={shortcuts}
        checked={checkedByQuestion[current.id]}
        onCheckedChange={(next) => setCheckedByQuestion((prev) => ({ ...prev, [current.id]: next }))}
        yourAnswer={answerByQuestion[current.id] ?? ''}
        onYourAnswerChange={(next) => setAnswerByQuestion((prev) => ({ ...prev, [current.id]: next }))}
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
          {shortcuts && <kbd className="mr-1 text-xs">B</kbd>} Back
        </button>
        <button type="button" onClick={skip} className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
          Skip {shortcuts && <kbd className="ml-1 text-xs">N</kbd>}
        </button>
      </div>
    </div>
  );
}
