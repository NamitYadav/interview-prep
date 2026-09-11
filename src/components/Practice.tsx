import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import type { Persisted, Question, Rating } from '../types';
import type { Action } from '../hooks/useAppState';
import { nextQuestion, roundStats } from '../lib/queue';
import { reducer } from '../hooks/useAppState';
import { QuestionCard } from './QuestionCard';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT');

export function Practice({
  questions, state, dispatch, strictMode, onLapComplete,
}: {
  questions: Question[]; state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean; onLapComplete?: () => void;
}) {
  // `history` is every question id shown this lap, in order; `historyPos` is which one
  // is on screen. Advancing appends and moves the pointer to the end; Back just moves
  // the pointer back over ids already recorded, no separate undo stack needed.
  const [history, setHistory] = useState<string[]>(() => {
    const first = nextQuestion(questions, state.progress)?.id;
    return first ? [first] : [];
  });
  const [historyPos, setHistoryPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seenThisLap, setSeenThisLap] = useState<Set<string>>(() => new Set());
  const [lapDone, setLapDone] = useState(false);

  const currentId = history[historyPos];
  const current = useMemo(() => questions.find((q) => q.id === currentId), [questions, currentId]);

  // A lap ends when every question in this set has been shown once — nextQuestion
  // returns undefined rather than silently wrapping back to the top of the queue.
  const advance = (progress: Persisted['progress'], seen: Set<string>) => {
    const next = nextQuestion(questions, progress, seen);
    setSeenThisLap(seen);
    if (!next) {
      setLapDone(true);
      onLapComplete?.();
      return;
    }
    // Truncate anything past the current position before appending, so advancing
    // after a Back overwrites the old forward path instead of stranding it — the
    // same semantics as browser history after navigating back then clicking a link.
    setHistory((h) => [...h.slice(0, historyPos + 1), next.id]);
    setHistoryPos((p) => p + 1);
    setRevealed(false);
  };

  const rate = (rating: Rating) => {
    if (!current) return;
    const action = { type: 'rate' as const, id: current.id, rating, now: Date.now() };
    dispatch(action);
    advance(reducer(state, action).progress, new Set([...seenThisLap, current.id]));
  };

  const skip = () => {
    if (!current) return;
    advance(state.progress, new Set([...seenThisLap, current.id]));
  };

  const back = () => {
    if (historyPos === 0) return;
    setHistoryPos((p) => p - 1);
    setRevealed(true);
  };

  const startAnotherLap = () => {
    const first = nextQuestion(questions, state.progress)?.id;
    setHistory(first ? [first] : []);
    setHistoryPos(0);
    setSeenThisLap(new Set());
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
      if (e.key === ' ') { if (isButton) return; e.preventDefault(); setRevealed(true); }
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
      <QuestionCard
        key={current.id}
        question={current}
        revealed={revealed}
        note={state.notes[current.id] ?? ''}
        rating={state.progress[current.id]?.rating}
        strictMode={strictMode}
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
