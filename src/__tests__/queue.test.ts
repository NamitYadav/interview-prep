import { describe, expect, test } from 'vitest';
import type { Progress, Question } from '../types';
import { SOLID_DECAY_MS, nextQuestion, orderQueue, roundStats } from '../lib/queue';

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
    expect(orderQueue(qs, progress, 20).map((x) => x.id)).toEqual(['b', 'd', 'e', 'c', 'a']);
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
    expect(orderQueue(qs, progress, SOLID_DECAY_MS + 1).map((x) => x.id)).toEqual(['b', 'c', 'd', 'e', 'a']);
  });

  test('within a bucket, oldest lastSeen sorts first', () => {
    const progress: Progress = {
      a: { rating: 1, seen: 1, lastSeen: 30 },
      c: { rating: 1, seen: 1, lastSeen: 10 },
      b: { rating: 1, seen: 1, lastSeen: 20 },
    };
    expect(orderQueue(qs, progress, 40).map((x) => x.id)).toEqual(['c', 'b', 'a', 'd', 'e']);
  });

  test('ties (e.g. all unrated) preserve original order (stable sort)', () => {
    expect(orderQueue(qs, {}).map((x) => x.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('does not mutate input', () => {
    const copy = [...qs];
    orderQueue(qs, {});
    expect(qs).toEqual(copy);
  });
});

describe('nextQuestion', () => {
  test('returns head of queue', () => {
    expect(nextQuestion(qs, {})?.id).toBe('a');
  });
  test('skips excluded ids', () => {
    expect(nextQuestion(qs, {}, new Set(['a', 'b']))?.id).toBe('c');
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
    expect(roundStats(qs, progress)).toEqual({ total: 5, unrated: 2, weak: 1, ok: 1, solid: 1 });
  });
});
