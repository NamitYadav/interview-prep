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

// Exported so the status filters name the same five states the queue orders by — a
// Solid that has decayed back into the OK bucket filters as OK, exactly as the progress
// bar and the category verdicts already report it.
export const questionBucket = (progress: Progress, id: string, now: number): number => {
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
      questionBucket(progress, a.id, now) - questionBucket(progress, b.id, now) ||
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

// Counted through the same questionBucket() the queue orders by, so a Solid that has decayed
// back into the OK bucket is reported as OK rather than the progress bar claiming
// "solid" for a question the drill is about to serve you again.
export function roundStats(questions: Question[], progress: Progress, now: number = Date.now()): RoundStats {
  const stats: RoundStats = { total: questions.length, unrated: 0, weak: 0, ok: 0, solid: 0 };
  for (const q of questions) {
    switch (questionBucket(progress, q.id, now)) {
      case 0: stats.weak++; break;
      case 1: stats.unrated++; break;
      case 2: stats.ok++; break;
      default: stats.solid++;
    }
  }
  return stats;
}

export type Verdict = 'weak' | 'ok' | 'solid' | 'unrated';

// One word for a whole category, derived from the same RoundStats the bar draws so the
// two can never disagree. Mean of the ratings you have actually given (weak 1, ok 2,
// solid 3); unrated questions are left out rather than counted as zero — a category you
// have barely touched should report what you know about it so far, not be dragged to
// Weak by its own unseen half. The thresholds sit either side of OK: a category averaging
// below halfway between weak and ok reads Weak, one averaging past halfway between ok and
// solid reads Solid.
export function categoryVerdict(stats: RoundStats): Verdict {
  const rated = stats.weak + stats.ok + stats.solid;
  if (rated === 0) return 'unrated';
  const mean = (stats.weak + stats.ok * 2 + stats.solid * 3) / rated;
  if (mean < 1.7) return 'weak';
  return mean < 2.5 ? 'ok' : 'solid';
}

export type QuestionStatus = 'all' | 'unseen' | 'weak' | 'ok' | 'solid';

const STATUS_BUCKET: Record<Exclude<QuestionStatus, 'all'>, number> = { weak: 0, unseen: 1, ok: 2, solid: 3 };

// "Unseen" is unrated: a progress entry only exists once you have rated the question, so
// there is nothing else for it to mean.
export function filterByStatus(
  questions: Question[],
  status: QuestionStatus,
  progress: Progress,
  now: number = Date.now(),
): Question[] {
  if (status === 'all') return questions;
  return questions.filter((q) => questionBucket(progress, q.id, now) === STATUS_BUCKET[status]);
}
