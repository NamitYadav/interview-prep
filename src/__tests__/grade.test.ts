import { describe, expect, test } from 'vitest';
import type { Grader } from '../types';
import { DEFAULT_LIMIT_MS, buildCases, judge, preview, rng, same, score, seedFor, type BuiltCase } from '../lib/grade';

const sum = (A: number[]) => A.reduce((s, v) => s + v, 0);
const grader: Grader = {
  fn: 'solution',
  reference: sum,
  cases: [
    { name: 'example', kind: 'example', args: [[1, 2]], expected: 3 },
    { name: 'empty', kind: 'correctness', args: [[]] },
    { name: 'large', kind: 'performance', limitMs: 500, gen: (r) => [Array.from({ length: 5 }, () => Math.floor(r() * 10))] },
  ],
};

describe('rng', () => {
  test('is deterministic per seed and stays in [0, 1)', () => {
    const a = rng(42), b = rng(42), c = rng(43);
    const xs = Array.from({ length: 100 }, () => a());
    expect(xs).toEqual(Array.from({ length: 100 }, () => b()));
    expect(xs).not.toEqual(Array.from({ length: 100 }, () => c()));
    for (const x of xs) expect(x >= 0 && x < 1).toBe(true);
  });

  test('seedFor differs by question and by case index', () => {
    expect(seedFor('algo-001', 0)).not.toBe(seedFor('algo-001', 1));
    expect(seedFor('algo-001', 0)).not.toBe(seedFor('algo-002', 0));
  });
});

describe('buildCases', () => {
  test('keeps a hand-written expected, computes a missing one, and generates seeded inputs', () => {
    const built = buildCases(grader, 'algo-900');
    expect(built.map((c) => c.name)).toEqual(['example', 'empty', 'large']);
    expect(built[0]).toMatchObject({ args: [[1, 2]], expected: 3, limitMs: DEFAULT_LIMIT_MS });
    expect(built[1]!.expected).toBe(0);
    expect(built[2]!.limitMs).toBe(500);
    expect(built[2]!.expected).toBe(sum(built[2]!.args[0] as number[]));
    expect(buildCases(grader, 'algo-900')[2]!.args).toEqual(built[2]!.args);
  });

  test('filters by kind', () => {
    expect(buildCases(grader, 'algo-900', new Set(['example'])).map((c) => c.name)).toEqual(['example']);
  });

  test('the reference cannot corrupt the args the pad receives', () => {
    const sorting: Grader = { fn: 'solution', reference: (A: number[]) => A.sort((x, y) => x - y)[0], cases: [{ name: 'x', kind: 'correctness', args: [[3, 1, 2]] }] };
    expect(buildCases(sorting, 'algo-900')[0]!.args).toEqual([[3, 1, 2]]);
  });
});

describe('same / preview', () => {
  test('compares by JSON, so a string never equals a number', () => {
    expect(same([1, 2], [1, 2])).toBe(true);
    expect(same('3', 3)).toBe(false);
    expect(same(undefined, 0)).toBe(false);
  });

  test('truncates long input and says by how much', () => {
    expect(preview([1, 2])).toBe('[1,2]');
    const long = preview(Array.from({ length: 1000 }, () => 7));
    expect(long.startsWith('[7,7,')).toBe(true);
    expect(long).toMatch(/… \(\d+ more chars\)$/);
  });
});

describe('judge / score', () => {
  const [example, empty, large] = buildCases(grader, 'algo-900') as [BuiltCase, BuiltCase, BuiltCase];

  test('pass, fail, error and timeout', () => {
    expect(judge(example, { value: 3, ms: 1 }).status).toBe('pass');
    expect(judge(example, { value: 4, ms: 1 })).toMatchObject({ status: 'fail', got: '4', expected: '3', input: '[1,2]' });
    expect(judge(empty, { error: 'TypeError: x', ms: 1 })).toMatchObject({ status: 'error', detail: 'TypeError: x' });
    expect(judge(large, 'timeout')).toMatchObject({ status: 'timeout', detail: 'timed out after 500ms' });
  });

  test('scores correctness (example + correctness) and performance separately', () => {
    const results = [judge(example, { value: 3, ms: 1 }), judge(empty, { value: 1, ms: 1 }), judge(large, 'timeout')];
    expect(score(results)).toEqual({ correctness: 50, performance: 0, total: 33, passed: 1, count: 3 });
  });
});
