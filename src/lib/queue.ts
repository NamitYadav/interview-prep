import type { Progress, Question, Rating } from '../types';

export const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE = 1.3;

// SM-2, quality collapsed from our 3-value rating: weak=fail (quality 2), ok=pass
// (quality 3), solid=pass (quality 5). A fail is due again immediately (interval 0,
// not a day out) — both so a just-failed card still surfaces before ones you already
// know, and so prevInterval<=0 correctly reads "start the 1-day/6-day ramp over" on
// the next pass instead of jumping straight to 6 (which `interval: 1` on fail would
// have caused, since 1 is indistinguishable from a genuine first pass).
export function nextInterval(
  rating: Rating,
  prevInterval: number,
  prevEase: number,
): { interval: number; easeFactor: number } {
  const quality = rating === 1 ? 2 : rating === 2 ? 3 : 5;
  const easeFactor = Math.max(MIN_EASE, prevEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  if (quality < 3) return { interval: 0, easeFactor };
  if (prevInterval <= 0) return { interval: 1, easeFactor };
  if (prevInterval === 1) return { interval: 6, easeFactor };
  return { interval: Math.round(prevInterval * easeFactor), easeFactor };
}

export const nextDueAt = (now: number, interval: number): number => now + interval * 86_400_000;

// dueAt absent means either never rated, or rated before this feature shipped (old
// saved data has no dueAt and never will on its own) — both sort ahead of anything
// with a real schedule. Never-rated sorts first of the two (no lastSeen at all);
// legacy-rated falls back to lastSeen so a returning user's old history keeps some
// recency order instead of collapsing into raw array order. Ties preserve the input's
// original order via a stable sort.
const dueAt = (progress: Progress, id: string): number => {
  const entry = progress[id];
  if (entry?.dueAt !== undefined) return entry.dueAt;
  return entry ? entry.lastSeen : 0;
};

export function orderQueue(questions: Question[], progress: Progress): Question[] {
  return [...questions].sort((a, b) => dueAt(progress, a.id) - dueAt(progress, b.id));
}

// undefined means every question has already been shown this lap — the caller decides
// what "lap done" looks like instead of this silently wrapping back to the top.
export function nextQuestion(
  questions: Question[],
  progress: Progress,
  exclude: ReadonlySet<string> = new Set(),
): Question | undefined {
  return orderQueue(questions, progress).find((q) => !exclude.has(q.id));
}

export interface RoundStats {
  total: number;
  unrated: number;
  weak: number;
  ok: number;
  solid: number;
}

export function roundStats(questions: Question[], progress: Progress): RoundStats {
  const stats: RoundStats = { total: questions.length, unrated: 0, weak: 0, ok: 0, solid: 0 };
  for (const q of questions) {
    const r = progress[q.id]?.rating;
    if (r === 1) stats.weak++;
    else if (r === 2) stats.ok++;
    else if (r === 3) stats.solid++;
    else stats.unrated++;
  }
  return stats;
}
