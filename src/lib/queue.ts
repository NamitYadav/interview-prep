import type { Progress, Question } from '../types';

// ponytail: bucket sort, not SM-2. Upgrade to SM-2 intervals if the queue feels repetitive.
// Weak surfaces first (you need the reps most), then unrated, then ok, then solid.
const bucket = (progress: Progress, id: string): number => {
  const rating = progress[id]?.rating;
  if (rating === 1) return 0;
  if (rating === undefined) return 1;
  return rating;
};
const lastSeen = (progress: Progress, id: string): number => progress[id]?.lastSeen ?? 0;

export function orderQueue(questions: Question[], progress: Progress): Question[] {
  return [...questions].sort(
    (a, b) =>
      bucket(progress, a.id) - bucket(progress, b.id) ||
      lastSeen(progress, a.id) - lastSeen(progress, b.id),
  );
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
