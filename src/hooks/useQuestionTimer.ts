import { useEffect, useRef, useState } from 'react';

// Runs from mount to Reveal — a stopwatch, not a countdown, so it never forces a
// hide. In strict mode, one shared `deadline` (mountedAt + targetSeconds*1000)
// drives both the auto-reveal timeout and the visible countdown, so toggling
// strict mode mid-question can't show a countdown reaching 0:00 while the actual
// reveal is still minutes out — restarting the effect always re-derives the
// timeout from time-remaining-until-that-same-deadline, never a fresh full
// duration.
export function useQuestionTimer({
  targetSeconds, strictMode, revealed, onAutoReveal,
}: {
  targetSeconds: number | undefined; strictMode: boolean; revealed: boolean; onAutoReveal: () => void;
}) {
  // Set in an effect, not `useRef(Date.now())` in the render body — Date.now() is
  // impure, and the effect always commits before a user could click Reveal, so the
  // timing is equivalent in practice.
  const mountedAt = useRef<number | null>(null);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [autoRevealed, setAutoRevealed] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  // Latest onAutoReveal in a ref so this effect doesn't need it as a dependency —
  // it's a fresh closure every render, and depending on it would restart the timer
  // any time the parent re-renders for an unrelated reason.
  const onAutoRevealRef = useRef(onAutoReveal);
  useEffect(() => {
    onAutoRevealRef.current = onAutoReveal;
  });

  useEffect(() => {
    if (!strictMode || revealed || targetSeconds === undefined) return;
    const deadline = (mountedAt.current ?? Date.now()) + targetSeconds * 1000;
    const timeout = setTimeout(() => {
      setElapsedMs(Date.now() - mountedAt.current!);
      setAutoRevealed(true);
      onAutoRevealRef.current();
    }, Math.max(0, deadline - Date.now()));
    const interval = setInterval(() => setRemainingMs(Math.max(0, deadline - Date.now())), 250);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [strictMode, revealed, targetSeconds]);

  const markRevealed = () => {
    setElapsedMs(Date.now() - mountedAt.current!);
  };

  return { elapsedMs, remainingMs, autoRevealed, markRevealed };
}
