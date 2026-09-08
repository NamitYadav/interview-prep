import type { Progress, Question } from '../types';

// ponytail: bucket sort, not SM-2. Upgrade to SM-2 intervals if the queue feels repetitive.
const bucket = (progress: Progress, id: string): number => progress[id]?.rating ?? 0;
const lastSeen = (progress: Progress, id: string): number => progress[id]?.lastSeen ?? 0;

export function orderQueue(questions: Question[], progress: Progress): Question[] {
  return [...questions].sort(
    (a, b) =>
      bucket(progress, a.id) - bucket(progress, b.id) ||
      lastSeen(progress, a.id) - lastSeen(progress, b.id),
  );
}

export function nextQuestion(
  questions: Question[],
  progress: Progress,
  exclude: ReadonlySet<string> = new Set(),
): Question | undefined {
  const ordered = orderQueue(questions, progress);
  return ordered.find((q) => !exclude.has(q.id)) ?? ordered[0];
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
