import type { Progress, Question } from '../types';

// Bucket by how well you know it, not a spaced-repetition schedule: weak first
// (it needs the work), then unseen, then ok, then solid — a real loop doesn't wait
// days for a rating to come due. Tiebreak oldest-seen-first within a bucket so a
// stale rating surfaces before one you just gave a moment ago.
// A lap only ends once every question has been shown, and with ~287 questions that
// never happens in one sitting — so without decay, bucket 3 is unreachable and a
// question rated Solid in week 1 never comes back for the rest of your prep. Seven days
// is the whole benefit of spacing for this use case, without carrying a scheduler.
export const SOLID_DECAY_MS = 7 * 24 * 60 * 60 * 1000;

const bucket = (progress: Progress, id: string, now: number): number => {
  const entry = progress[id];
  if (entry?.rating === 1) return 0;
  if (entry === undefined) return 1;
  if (entry.rating === 2) return 2;
  return now - entry.lastSeen > SOLID_DECAY_MS ? 2 : 3;
};

const lastSeen = (progress: Progress, id: string): number => progress[id]?.lastSeen ?? 0;

export function orderQueue(questions: Question[], progress: Progress, now: number = Date.now()): Question[] {
  return [...questions].sort(
    (a, b) =>
      bucket(progress, a.id, now) - bucket(progress, b.id, now) ||
      lastSeen(progress, a.id) - lastSeen(progress, b.id),
  );
}

// undefined means every question has already been shown this lap — the caller decides
// what "lap done" looks like instead of this silently wrapping back to the top.
export function nextQuestion(
  questions: Question[],
  progress: Progress,
  exclude: ReadonlySet<string> = new Set(),
  now: number = Date.now(),
): Question | undefined {
  return orderQueue(questions, progress, now).find((q) => !exclude.has(q.id));
}

export interface RoundStats {
  total: number;
  unrated: number;
  weak: number;
  ok: number;
  solid: number;
}

// Counted through the same bucket() the queue orders by, so a Solid that has decayed
// back into the OK bucket is reported as OK rather than the progress bar claiming
// "solid" for a question the drill is about to serve you again.
export function roundStats(questions: Question[], progress: Progress, now: number = Date.now()): RoundStats {
  const stats: RoundStats = { total: questions.length, unrated: 0, weak: 0, ok: 0, solid: 0 };
  for (const q of questions) {
    switch (bucket(progress, q.id, now)) {
      case 0: stats.weak++; break;
      case 1: stats.unrated++; break;
      case 2: stats.ok++; break;
      default: stats.solid++;
    }
  }
  return stats;
}
