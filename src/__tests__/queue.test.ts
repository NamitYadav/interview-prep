import { describe, expect, test } from 'vitest';
import type { Progress, Question } from '../types';
import { nextQuestion, orderQueue, roundStats } from '../lib/queue';

const q = (id: string): Question => ({
  id, round: 'hm', category: 'X', question: id, answer: ['a'], keyPoints: ['k'],
});
const qs = ['a', 'b', 'c', 'd', 'e'].map(q);

describe('orderQueue', () => {
  test('weak first, then unrated, ok, solid', () => {
    const progress: Progress = {
      a: { rating: 3, seen: 1, lastSeen: 10 },
      b: { rating: 1, seen: 1, lastSeen: 10 },
      c: { rating: 2, seen: 1, lastSeen: 10 },
    };
    expect(orderQueue(qs, progress).map((x) => x.id)).toEqual(['b', 'd', 'e', 'c', 'a']);
  });

  test('within a bucket, oldest lastSeen first', () => {
    const progress: Progress = {
      a: { rating: 1, seen: 1, lastSeen: 30 },
      b: { rating: 1, seen: 1, lastSeen: 10 },
      c: { rating: 1, seen: 1, lastSeen: 20 },
      d: { rating: 1, seen: 1, lastSeen: 10 },
      e: { rating: 1, seen: 1, lastSeen: 5 },
    };
    expect(orderQueue(qs, progress).map((x) => x.id)).toEqual(['e', 'b', 'd', 'c', 'a']);
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
