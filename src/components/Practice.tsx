import { useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import type { Persisted, Question, Rating } from '../types';
import type { Action } from '../hooks/useAppState';
import { nextQuestion } from '../lib/queue';
import { reducer } from '../hooks/useAppState';
import { QuestionCard } from './QuestionCard';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT');

export function Practice({ questions, state, dispatch }: { questions: Question[]; state: Persisted; dispatch: Dispatch<Action> }) {
  const [currentId, setCurrentId] = useState<string | undefined>(() => nextQuestion(questions, state.progress)?.id);
  const [revealed, setRevealed] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());

  const current = useMemo(() => questions.find((q) => q.id === currentId), [questions, currentId]);

  const advance = (progress: Persisted['progress'], exclude: Set<string>) => {
    let ordered = nextQuestion(questions, progress, exclude);
    const exhausted = ordered !== undefined && exclude.has(ordered.id);
    if (exhausted) {
      // Every question has been seen this lap. Restart the lap (skipped clears) but still
      // don't just redisplay the question we're leaving - exclude only that one.
      ordered = nextQuestion(questions, progress, current ? new Set([current.id]) : new Set());
    }
    setSkipped(exhausted ? new Set() : exclude);
    setCurrentId(ordered?.id);
    setRevealed(false);
  };

  const rate = (rating: Rating) => {
    if (!current) return;
    const action = { type: 'rate' as const, id: current.id, rating, now: Date.now() };
    dispatch(action);
    advance(reducer(state, action).progress, new Set([...skipped, current.id]));
  };

  const skip = () => {
    if (!current) return;
    advance(state.progress, new Set([...skipped, current.id]));
  };

  // Keydown handler is registered once; latest closures are read through this ref
  // so skip/rate/revealed never go stale without re-subscribing on every render.
  const latest = useRef({ skip, rate, revealed });
  useEffect(() => {
    latest.current = { skip, rate, revealed };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const isButton = e.target instanceof HTMLElement && e.target.tagName === 'BUTTON';
      if (e.key === ' ') { if (isButton) return; e.preventDefault(); setRevealed(true); }
      else if (e.key === 'n' || e.key === 'N') latest.current.skip();
      else if (latest.current.revealed && (e.key === '1' || e.key === '2' || e.key === '3')) latest.current.rate(Number(e.key) as Rating);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        onReveal={() => setRevealed(true)}
        onNote={(text) => dispatch({ type: 'note', id: current.id, text })}
        onRate={rate}
      />
      <div className="flex justify-end">
        <button type="button" onClick={skip} className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline">
          Skip <kbd className="ml-1 text-xs">N</kbd>
        </button>
      </div>
    </div>
  );
}
