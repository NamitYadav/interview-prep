import { describe, expect, test } from 'vitest';
import type { Progress, Question } from '../types';
import { SOLID_DECAY_MS, categoryVerdict, filterByStatus, nextQuestion, orderQueue, roundStats } from '../lib/queue';

const q = (id: string): Question => ({
  id, round: 'hm', category: 'X', question: id, answer: ['a'], keyPoints: ['k'],
});
const qs = ['a', 'b', 'c', 'd', 'e'].map(q);

describe('orderQueue', () => {
  test('buckets weak, then unrated, then ok, then solid', () => {
    const progress: Progress = {
      a: { rating: 3, seen: 1, lastSeen: 10 },
      b: { rating: 1, seen: 1, lastSeen: 10 },
      c: { rating: 2, seen: 1, lastSeen: 10 },
      // d, e never rated
    };
    // `now` is pinned just after lastSeen so nothing has decayed yet.
    expect(orderQueue(qs, progress, 20, () => 0).map((x) => x.id)).toEqual(['b', 'd', 'e', 'c', 'a']);
  });

  test('a solid decays into the ok bucket after the decay window', () => {
    const progress: Progress = {
      a: { rating: 3, seen: 1, lastSeen: 0 },
      c: { rating: 2, seen: 1, lastSeen: 100 },
    };
    // Fresh: the solid stays behind the ok.
    expect(orderQueue([q('a'), q('c')], progress, 1000).map((x) => x.id)).toEqual(['c', 'a']);
    // Stale: it joins the ok bucket, and the oldest-lastSeen tiebreak puts it first.
    expect(orderQueue([q('a'), q('c')], progress, SOLID_DECAY_MS + 1).map((x) => x.id)).toEqual(['a', 'c']);
  });

  test('a decayed solid still ranks behind weak and unrated', () => {
    const progress: Progress = { a: { rating: 3, seen: 1, lastSeen: 0 }, b: { rating: 1, seen: 1, lastSeen: 0 } };
    expect(orderQueue(qs, progress, SOLID_DECAY_MS + 1, () => 0).map((x) => x.id)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  test('within a bucket, oldest lastSeen sorts first', () => {
    const progress: Progress = {
      a: { rating: 1, seen: 1, lastSeen: 30 },
      c: { rating: 1, seen: 1, lastSeen: 10 },
      b: { rating: 1, seen: 1, lastSeen: 20 },
    };
    expect(orderQueue(qs, progress, 40, () => 0).map((x) => x.id)).toEqual(['c', 'b', 'a', 'd', 'e']);
  });

  test('ties (e.g. all unrated) fall back to original order when the draw is constant', () => {
    expect(orderQueue(qs, {}, 0, () => 0).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  // The first lap of every round used to walk the bank in file order: every unrated
  // question ties on lastSeen 0 and the sort is stable.
  test('ties are broken by the random draw, never across buckets', () => {
    const draws = [0.9, 0.1, 0.5, 0.3, 0.7];
    let i = 0;
    const progress: Progress = { a: { rating: 1, seen: 1, lastSeen: 0 } };
    // a is weak and stays first however it draws; b..e are unrated and reorder by draw.
    expect(orderQueue(qs, progress, 1, () => draws[i++]!).map((x) => x.id)).toEqual(['a', 'b', 'd', 'c', 'e']);
  });

  test('a real random draw still keeps every question exactly once', () => {
    const ids = orderQueue(qs, {}).map((x) => x.id).sort();
    expect(ids).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('does not mutate input', () => {
    const copy = [...qs];
    orderQueue(qs, {});
    expect(qs).toEqual(copy);
  });
});

describe('nextQuestion', () => {
  const first = () => 0;
  test('returns head of queue', () => {
    expect(nextQuestion(qs, {}, new Set(), 0, first)?.id).toBe('a');
  });
  test('skips excluded ids', () => {
    expect(nextQuestion(qs, {}, new Set(['a', 'b']), 0, first)?.id).toBe('c');
  });
  test('undefined when everything is excluded (lap done)', () => {
    expect(nextQuestion(qs, {}, new Set(['a', 'b', 'c', 'd', 'e']))).toBeUndefined();
  });
  test('undefined for empty list', () => {
    expect(nextQuestion([], {})).toBeUndefined();
  });
});

describe('roundStats', () => {
  test('counts buckets', () => {
    const progress: Progress = {
      a: { rating: 3, seen: 1, lastSeen: 1 },
      b: { rating: 1, seen: 1, lastSeen: 1 },
      c: { rating: 2, seen: 1, lastSeen: 1 },
      zzz: { rating: 3, seen: 1, lastSeen: 1 }, // not in this round, ignored
    };
    // `now` pinned just after lastSeen so nothing has decayed.
    expect(roundStats(qs, progress, 2)).toEqual({ total: 5, unrated: 2, weak: 1, ok: 1, solid: 1 });
  });

  // Counts go through the same bucket() the queue orders by, so the progress bar can't
  // claim "solid" for a question the drill is about to serve you again as OK.
  test('a decayed solid is counted as ok, matching the queue', () => {
    const progress: Progress = { a: { rating: 3, seen: 1, lastSeen: 0 } };
    expect(roundStats(qs, progress, 1)).toMatchObject({ solid: 1, ok: 0 });
    expect(roundStats(qs, progress, SOLID_DECAY_MS + 1)).toMatchObject({ solid: 0, ok: 1 });
  });
});

describe('categoryVerdict', () => {
  const stats = (weak: number, ok: number, solid: number, unrated = 0) =>
    ({ total: weak + ok + solid + unrated, weak, ok, solid, unrated });

  test('nothing rated reads unrated, however many questions are waiting', () => {
    expect(categoryVerdict(stats(0, 0, 0, 12))).toBe('unrated');
    expect(categoryVerdict(stats(0, 0, 0, 0))).toBe('unrated');
  });

  test('unrated questions do not drag the verdict down', () => {
    // One solid and nineteen untouched is still what you know so far: solid.
    expect(categoryVerdict(stats(0, 0, 1, 19))).toBe('solid');
  });

  test('the thresholds sit either side of ok', () => {
    // mean 1.6 -> weak; 1.8 -> ok; 2.4 -> ok; 2.6 -> solid.
    expect(categoryVerdict(stats(4, 6, 0))).toBe('weak');
    expect(categoryVerdict(stats(2, 8, 0))).toBe('ok');
    expect(categoryVerdict(stats(0, 6, 4))).toBe('ok');
    expect(categoryVerdict(stats(0, 4, 6))).toBe('solid');
  });

  test('all of one rating reads as that rating', () => {
    expect(categoryVerdict(stats(5, 0, 0))).toBe('weak');
    expect(categoryVerdict(stats(0, 5, 0))).toBe('ok');
    expect(categoryVerdict(stats(0, 0, 5))).toBe('solid');
  });
});

describe('filterByStatus', () => {
  const now = 1_000_000;
  const progress: Progress = {
    a: { rating: 1, seen: 1, lastSeen: now },
    b: { rating: 2, seen: 1, lastSeen: now },
    c: { rating: 3, seen: 1, lastSeen: now },
    d: { rating: 3, seen: 1, lastSeen: now - SOLID_DECAY_MS - 1 },
    // e: never rated
  };
  const ids = (status: Parameters<typeof filterByStatus>[1]) =>
    filterByStatus(qs, status, progress, now).map((x) => x.id);

  test('all returns the same array untouched', () => {
    expect(filterByStatus(qs, 'all', progress, now)).toBe(qs);
  });

  test('unseen is exactly the unrated questions', () => {
    expect(ids('unseen')).toEqual(['e']);
  });

  test('each rating filters to its own bucket', () => {
    expect(ids('weak')).toEqual(['a']);
    expect(ids('solid')).toEqual(['c']);
  });

  // The same bucket() the queue orders by, so the filter agrees with the bar and the
  // verdicts: a Solid past the decay window is OK everywhere.
  test('a decayed solid filters as ok, not solid', () => {
    expect(ids('ok')).toEqual(['b', 'd']);
  });
});
