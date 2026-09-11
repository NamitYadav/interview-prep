import type { Progress, Question, Rating } from '../types';

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

// SM-2, quality collapsed from our 3-value rating: weak=fail (quality 2), ok=pass
// (quality 3), solid=pass (quality 5). A fail always resets the interval to 1 day; a
// pass grows it (first pass = 1 day, second = 6 days, later passes = interval * ease).
export function nextInterval(
  rating: Rating,
  prevInterval: number,
  prevEase: number,
): { interval: number; easeFactor: number } {
  const quality = rating === 1 ? 2 : rating === 2 ? 3 : 5;
  const easeFactor = Math.max(MIN_EASE, prevEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  if (quality < 3) return { interval: 1, easeFactor };
  if (prevInterval <= 0) return { interval: 1, easeFactor };
  if (prevInterval === 1) return { interval: 6, easeFactor };
  return { interval: Math.round(prevInterval * easeFactor), easeFactor };
}

export const nextDueAt = (now: number, interval: number): number => now + interval * 86_400_000;

export const DEFAULT_EASE_FACTOR = DEFAULT_EASE;

// dueAt absent means never scheduled (not yet rated) — sorts first, same priority the
// old bucket sort gave unrated questions. Ties (including every never-rated question,
// all at 0) preserve the input's original order via a stable sort.
const dueAt = (progress: Progress, id: string): number => progress[id]?.dueAt ?? 0;

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
