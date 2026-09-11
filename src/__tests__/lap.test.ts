import { beforeEach, describe, expect, test } from 'vitest';
import type { Question } from '../types';
import { clearLap, lapKey, readLap, writeLap } from '../lib/lap';

beforeEach(() => localStorage.clear());

const q = (id: string): Question => ({ id, round: 'hm', category: 'X', question: id, answer: ['a'], keyPoints: ['k'] });
const set = ['a', 'b', 'c'].map(q);
const key = lapKey(set);
const lap = { key, history: ['a', 'b'], historyPos: 1, requeued: [{ id: 'a', at: 9 }], step: 2 };

describe('lap', () => {
  test('round-trips a lap', () => {
    writeLap(lap, 111);
    expect(readLap(key)).toEqual({ ...lap, savedAt: 111 });
  });

  test('a different question set does not restore', () => {
    writeLap(lap);
    expect(readLap(lapKey(['a', 'b'].map(q)))).toBeUndefined();
    expect(readLap(lapKey(['a', 'b', 'd'].map(q)))).toBeUndefined();
  });

  test('lapKey distinguishes length and endpoints', () => {
    expect(lapKey(set)).not.toBe(lapKey(['a', 'b'].map(q)));
    expect(lapKey(set)).not.toBe(lapKey(['a', 'b', 'd'].map(q)));
    expect(lapKey(set)).toBe(lapKey(['a', 'b', 'c'].map(q)));
  });

  test('rejects a position outside the stored history', () => {
    writeLap({ ...lap, historyPos: 5 });
    expect(readLap(key)).toBeUndefined();
    writeLap({ ...lap, historyPos: -1 });
    expect(readLap(key)).toBeUndefined();
  });

  test('rejects malformed stored data rather than throwing', () => {
    localStorage.setItem('interview-prep:laps', 'not json');
    expect(readLap(key)).toBeUndefined();
    localStorage.setItem('interview-prep:laps', JSON.stringify({ [key]: { history: 'nope', historyPos: 0, requeued: [], step: 0 } }));
    expect(readLap(key)).toBeUndefined();
  });

  test('drops malformed requeue entries but keeps the lap', () => {
    localStorage.setItem(
      'interview-prep:laps',
      JSON.stringify({ [key]: { history: ['a'], historyPos: 0, step: 1, requeued: [{ id: 'a', at: 3 }, { id: 5 }, null, 'x'] } }),
    );
    expect(readLap(key)?.requeued).toEqual([{ id: 'a', at: 3 }]);
  });

  test('clearLap removes only the named lap', () => {
    const otherKey = lapKey(['x', 'y'].map(q));
    writeLap(lap);
    writeLap({ ...lap, key: otherKey });
    clearLap(key);
    expect(readLap(key)).toBeUndefined();
    expect(readLap(otherKey)).toBeDefined();
  });

  // One global slot meant opening any other Practice set — another round, a category
  // chip, the Weak drill — destroyed the lap you were part-way through.
  test('laps for different sets coexist', () => {
    const a = lapKey(['a', 'b', 'c'].map(q));
    const b = lapKey(['x', 'y'].map(q));
    writeLap({ key: a, history: ['a', 'b'], historyPos: 1, requeued: [], step: 1 });
    writeLap({ key: b, history: ['x'], historyPos: 0, requeued: [], step: 0 });
    expect(readLap(a)?.historyPos).toBe(1);
    expect(readLap(b)?.historyPos).toBe(0);
  });

  test('evicts the oldest laps past the cap', () => {
    for (let i = 0; i < 20; i++) {
      writeLap({ key: `k${i}`, history: ['a'], historyPos: 0, requeued: [], step: 0 }, i);
    }
    expect(readLap('k19')).toBeDefined();
    expect(readLap('k0')).toBeUndefined();
    const stored: unknown = JSON.parse(localStorage.getItem('interview-prep:laps')!);
    expect(Object.keys(stored as object).length).toBe(12);
  });
});
