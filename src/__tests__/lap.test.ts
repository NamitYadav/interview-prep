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
    writeLap(lap);
    expect(readLap(key)).toEqual(lap);
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
    localStorage.setItem('interview-prep:lap', 'not json');
    expect(readLap(key)).toBeUndefined();
    localStorage.setItem('interview-prep:lap', JSON.stringify({ key, history: 'nope', historyPos: 0, requeued: [], step: 0 }));
    expect(readLap(key)).toBeUndefined();
  });

  test('drops malformed requeue entries but keeps the lap', () => {
    localStorage.setItem(
      'interview-prep:lap',
      JSON.stringify({ key, history: ['a'], historyPos: 0, step: 1, requeued: [{ id: 'a', at: 3 }, { id: 5 }, null, 'x'] }),
    );
    expect(readLap(key)?.requeued).toEqual([{ id: 'a', at: 3 }]);
  });

  test('clearLap removes it', () => {
    writeLap(lap);
    clearLap();
    expect(readLap(key)).toBeUndefined();
  });
});
