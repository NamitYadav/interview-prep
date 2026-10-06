import type { CaseKind, Grader } from '../types';

// Grading for the Algorithms round, everything that does not need a worker. The runner
// (gradeRun.ts) and the report (GradeReport.tsx) are built on these.

// ponytail: a fixed per-case limit. O(N log N) at N = 100,000 runs in ~20ms and O(N²) needs
// ~10^10 steps, so the gap is wide; a slow machine timing out a correct solution is the
// ceiling. Calibrate with a case's own `limitMs`, or this constant.
export const DEFAULT_LIMIT_MS = 1500;

export interface BuiltCase { name: string; kind: CaseKind; limitMs: number; args: unknown[]; expected: unknown }
export type CaseStatus = 'pass' | 'fail' | 'error' | 'timeout';
export interface CaseResult {
  name: string; kind: CaseKind; status: CaseStatus; ms?: number;
  input: string; expected: string; got?: string; detail?: string;
}
export interface Score { correctness: number; performance: number; total: number; passed: number; count: number }

// mulberry32: small, fast, good enough to build test inputs, and seedable — which is the
// point: a failing performance case must fail the same way on the next Submit.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a over "<question id>:<case index>", so every case of every task gets its own draw.
export function seedFor(questionId: string, index: number): number {
  let h = 2166136261;
  for (const ch of `${questionId}:${index}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Args and expected value for each case, optionally only some kinds. The reference gets
 *  a clone, so a reference that sorts in place cannot change what the pad is sent. */
export function buildCases(grader: Grader, questionId: string, kinds?: ReadonlySet<CaseKind>): BuiltCase[] {
  const reference = grader.reference as (...args: unknown[]) => unknown;
  return grader.cases.flatMap((c, i) => {
    if (kinds && !kinds.has(c.kind)) return [];
    const args = 'gen' in c ? c.gen(rng(seedFor(questionId, i))) : c.args;
    const expected = !('gen' in c) && c.expected !== undefined ? c.expected : reference(...structuredClone(args));
    return [{ name: c.name, kind: c.kind, limitMs: c.limitMs ?? DEFAULT_LIMIT_MS, args, expected }];
  });
}

// Algorithm outputs are numbers, strings, booleans and arrays of them; JSON equality is
// exact for those and makes "3" vs 3 a failure, as Codility does.
export const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export function preview(value: unknown, max = 120): string {
  let s: string;
  try {
    s = JSON.stringify(value) ?? String(value);
  } catch {
    s = String(value);
  }
  return s.length > max ? `${s.slice(0, max)}… (${s.length - max} more chars)` : s;
}

export function judge(
  c: BuiltCase,
  outcome: { value: unknown; ms: number } | { error: string; ms?: number } | 'timeout',
): CaseResult {
  const base = { name: c.name, kind: c.kind, input: preview(c.args.length === 1 ? c.args[0] : c.args), expected: preview(c.expected) };
  if (outcome === 'timeout') return { ...base, status: 'timeout', detail: `timed out after ${c.limitMs}ms` };
  if ('error' in outcome) return { ...base, status: 'error', ms: outcome.ms, detail: outcome.error };
  return { ...base, status: same(outcome.value, c.expected) ? 'pass' : 'fail', ms: outcome.ms, got: preview(outcome.value) };
}

const percent = (results: CaseResult[]) =>
  results.length === 0 ? 100 : Math.round((100 * results.filter((r) => r.status === 'pass').length) / results.length);

export function score(results: CaseResult[]): Score {
  return {
    correctness: percent(results.filter((r) => r.kind !== 'performance')),
    performance: percent(results.filter((r) => r.kind === 'performance')),
    total: percent(results),
    passed: results.filter((r) => r.status === 'pass').length,
    count: results.length,
  };
}
