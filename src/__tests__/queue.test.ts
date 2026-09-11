import { describe, expect, test } from 'vitest';
import type { Progress, Question } from '../types';
import { nextInterval, nextQuestion, orderQueue, roundStats } from '../lib/queue';

const q = (id: string): Question => ({
  id, round: 'hm', category: 'X', question: id, answer: ['a'], keyPoints: ['k'],
});
const qs = ['a', 'b', 'c', 'd', 'e'].map(q);

describe('orderQueue', () => {
  test('never scheduled first, then by dueAt ascending', () => {
    const progress: Progress = {
      a: { rating: 3, seen: 2, lastSeen: 10, dueAt: 500 },
      b: { rating: 1, seen: 1, lastSeen: 10, dueAt: 100 },
      c: { rating: 2, seen: 1, lastSeen: 10, dueAt: 300 },
      // d, e never rated -> no dueAt -> sort first
    };
    expect(orderQueue(qs, progress).map((x) => x.id)).toEqual(['d', 'e', 'b', 'c', 'a']);
  });

  test('ties preserve original order (stable sort)', () => {
    const progress: Progress = {
      a: { rating: 1, seen: 1, lastSeen: 30, dueAt: 100 },
      c: { rating: 1, seen: 1, lastSeen: 20, dueAt: 100 },
    };
    expect(orderQueue(qs, progress).map((x) => x.id)).toEqual(['b', 'd', 'e', 'a', 'c']);
  });

  test('does not mutate input', () => {
    const copy = [...qs];
    orderQueue(qs, {});
    expect(qs).toEqual(copy);
  });
});

describe('nextInterval', () => {
  test('weak resets interval to 1 day and drops ease', () => {
    const { interval, easeFactor } = nextInterval(1, 6, 2.5);
    expect(interval).toBe(1);
    expect(easeFactor).toBeCloseTo(2.18, 5);
  });

  test('first-ever pass (ok or solid) sets interval to 1 day', () => {
    expect(nextInterval(2, 0, 2.5).interval).toBe(1);
    expect(nextInterval(3, 0, 2.5).interval).toBe(1);
  });

  test('second pass sets interval to 6 days', () => {
    expect(nextInterval(3, 1, 2.5).interval).toBe(6);
  });

  test('later passes multiply interval by ease factor', () => {
    const { interval } = nextInterval(3, 6, 2.5);
    expect(interval).toBe(Math.round(6 * nextInterval(3, 6, 2.5).easeFactor));
  });

  test('ease factor never drops below the floor', () => {
    let ease = 1.3;
    for (let i = 0; i < 10; i++) ease = nextInterval(1, 1, ease).easeFactor;
    expect(ease).toBe(1.3);
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
