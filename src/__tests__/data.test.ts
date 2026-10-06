import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { ROUND_IDS, STORY_CATEGORIES, questions, rounds } from '../data';
import { ROLE_IDS, roles } from '../data/roles';
import { MAX_DRAFTS } from '../lib/drafts';
import { buildCases, DEFAULT_LIMIT_MS, judge, preview, same, score } from '../lib/grade';
import { MAX_LAPS } from '../lib/lap';
import { compile } from '../sandbox/compile';
import type { RoundId } from '../types';

const ID_RE = /^(hr|hm|coding|algo|design|case|debrief|hoe|lead|arch|backend)-\d{3}$/;

describe('question bank', () => {
  test('rounds cover every RoundId once', () => {
    expect(rounds.map((r) => r.id).sort()).toEqual([...ROUND_IDS].sort());
  });

  test('the backend round is catalogued with the live-coding target', () => {
    const backend = rounds.find((r) => r.id === 'backend');
    expect(backend?.title).toBe('Backend & data');
    expect(backend?.targetSeconds).toBe(180);
  });

  test('ids are unique and well-formed', () => {
    const ids = questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(ID_RE);
  });

  test('id prefix matches round', () => {
    for (const q of questions) expect(q.id.startsWith(`${q.round}-`)).toBe(true);
  });

  test('required fields are non-empty', () => {
    for (const q of questions) {
      expect(q.question.trim().length, q.id).toBeGreaterThan(0);
      expect(q.category.trim().length, q.id).toBeGreaterThan(0);
      expect(q.answer.length, q.id).toBeGreaterThan(0);
      expect(q.keyPoints.length, q.id).toBeGreaterThan(0);
      for (const p of [...q.answer, ...q.keyPoints, ...(q.followUps ?? []), ...(q.deeper ?? [])]) {
        expect(p.trim().length, q.id).toBeGreaterThan(0);
      }
      if (q.code !== undefined) expect(q.code.trim().length, q.id).toBeGreaterThan(0);
    }
  });

  // A floor against accidental loss, not a growth target. Round 4 deliberately cut 17
  // questions that were fully subsumed by a named sibling; these are the post-cut counts.
  test('every round keeps at least its post-round-4 question count', () => {
    const min: Record<RoundId, number> = { hr: 36, hm: 99, coding: 35, algo: 24, design: 30, case: 30, debrief: 32, hoe: 33, lead: 30, arch: 30, backend: 36 };
    for (const id of ROUND_IDS) {
      expect(questions.filter((q) => q.round === id).length, id).toBeGreaterThanOrEqual(min[id]);
    }
  });

  // The drill UI counts `targetSeconds` down while you answer out loud. 130 wpm is a
  // deliberate, pause-inclusive interview pace, not a reading pace — an answer that only
  // fits at 160 wpm is one you cannot actually deliver. Material that does not fit belongs
  // in `deeper`, which is uncounted because you only say it if the interviewer digs.
  test('every answer can be spoken inside its round target', () => {
    const SPOKEN_WPM = 130;
    // Algorithms tasks give 30 minutes to code; the talk-track still has to be sayable in
    // the live-coding round's three.
    const budget = new Map(rounds.map((r) => [r.id, Math.round(((r.id === 'algo' ? 180 : r.targetSeconds) / 60) * SPOKEN_WPM)]));
    for (const q of questions) {
      const words = q.answer.join(' ').split(/\s+/).filter(Boolean).length;
      const max = budget.get(q.round)!;
      expect(words, `${q.id} is ${words}w against a ${max}w budget — move material to \`deeper\``).toBeLessThanOrEqual(max);
    }
  });

  // QuestionCard splits on /(\[[^\]]+\])/ to underline fill-in slots, and that pattern
  // cannot cross a ']'. A nested "[outer [inner] text]" therefore renders as an
  // underlined "[outer [inner]" plus a literal " text]" — visibly broken.
  test('placeholders never nest', () => {
    for (const q of questions) {
      const text = [q.question, ...q.answer, ...q.keyPoints, ...(q.followUps ?? []), ...(q.deeper ?? [])].join(' ');
      expect(text, q.id).not.toMatch(/\[[^\][]*\[/);
    }
  });

  // `scratch: true` turns the code block into an editable pad, but QuestionCard only
  // renders it inside `question.code && ...` — so a scratch question with no code
  // silently shows no editor at all, and the types allow exactly that.
  test('a scratch question always carries starter code', () => {
    for (const q of questions) {
      if (q.scratch) expect(q.code, `${q.id} is scratch with no code`).toBeTruthy();
    }
  });

  // `preview` is the JSX harness the sandbox mounts after the pad's code. Only ScratchPad
  // reads it, and ScratchPad only renders for scratch questions — a preview on a read-only
  // snippet would be dead data.
  // `needsDom` only decides where a console-only pad runs (frame instead of worker); on a
  // preview starter it would be dead data, and on a non-scratch question meaningless.
  test('needsDom is only set on console-only scratch starters', () => {
    for (const q of questions) {
      if (q.needsDom) expect(q.scratch && q.code && !q.preview, `${q.id} sets needsDom but is not a console-only pad`).toBeTruthy();
    }
  });

  test('a preview only appears on a scratch question with code', () => {
    for (const q of questions) {
      if (q.preview) expect(q.scratch && q.code, `${q.id} has a preview but is not a scratch pad`).toBeTruthy();
    }
  });

  test('every component starter in the coding round has a preview', () => {
    // A top-level function with a capitalised name is a component; the hooks and utilities
    // are camelCase and the caches are classes.
    const components = questions.filter((q) => q.round === 'coding' && q.scratch && /^(async )?function [A-Z]/m.test(q.code ?? ''));
    expect(components.length).toBeGreaterThan(0);
    for (const q of components) expect(q.preview, `${q.id} is a component with no preview`).toBeTruthy();
  });

  // The habit the data-structures questions exist to train is saying a complexity out
  // loud. If it is not in the checklist, the drill never scores it.
  test('every data-structures question puts a complexity in its key points', () => {
    const ds = questions.filter((q) => q.category === 'Data structures & traversal');
    expect(ds.length).toBeGreaterThan(0);
    for (const q of ds) {
      expect(q.keyPoints.join(' '), `${q.id} key points name no complexity`).toMatch(/O\(/);
    }
  });

  // The drafts store evicts oldest-first. If the cap ever sat near the number of
  // scratch questions, working through a round in one sitting would silently throw away
  // the code written at the start of it.
  test('the draft cap comfortably exceeds the number of scratch questions', () => {
    const scratch = questions.filter((q) => q.scratch).length;
    expect(scratch).toBeGreaterThan(0);
    expect(MAX_DRAFTS).toBeGreaterThan(scratch * 2);
  });

  // Every round's Practice tab and every category chip is its own lap, plus the Weak
  // drill and the mock presets, for whichever role has the most of them — only one
  // role's laps are live at a time, so evicting a dormant role's entries is fine.
  test('the lap cap holds one lap per possible question set for the largest role', () => {
    let maxSets = 0;
    for (const role of roles) {
      const roleQuestions = questions.filter((q) => role.rounds.includes(q.round) && (q.roles === undefined || q.roles.includes(role.id)));
      const perRound = role.rounds.map((r) => 1 + new Set(roleQuestions.filter((q) => q.round === r).map((q) => q.category)).size);
      const sets = perRound.reduce((a, b) => a + b, 0) + 1 + 2; // +1 weak drill, +2 mock presets
      maxSets = Math.max(maxSets, sets);
    }
    expect(MAX_LAPS).toBeGreaterThanOrEqual(maxSets);
  });

  // Backend pads are console-only, so they run in the Web Worker: no DOM, no Node
  // built-ins. jsdom would happily provide `document` here, so the source check is what
  // catches a pad that would only fail in the real worker.
  test('every backend pad is worker-safe and runs its starter to completion', async () => {
    const pads = questions.filter((q) => q.round === 'backend' && q.scratch);
    expect(pads.length).toBe(6);
    vi.useFakeTimers();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      for (const q of pads) {
        expect(q.preview, q.id).toBeUndefined();
        expect(q.needsDom, q.id).toBeUndefined();
        expect(q.code, q.id).not.toMatch(/\bnode:|\brequire\(|\bdocument\.|\bwindow\.|^\s*import\s/m);
        const run = new Function('React', '__render', compile(q.code!));
        expect(() => run(React, () => {}), q.id).not.toThrow();
      }
      // Async pads (the batchers, circuit breaker, idempotency) log after a microtask or a
      // timer; flush both so their output lands on the spy and a rejected promise surfaces.
      await vi.runAllTimersAsync();
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
      vi.useRealTimers();
    }
  });

  test('Go appears only as read-only code', () => {
    for (const q of questions.filter((x) => x.round === 'backend' && x.code && /^\s*(package|func) /m.test(x.code))) {
      expect(q.scratch, `${q.id} is Go and cannot run`).toBeUndefined();
    }
  });

  test('every STORY_CATEGORIES entry matches at least one real question category', () => {
    const categories = new Set(questions.map((q) => q.category));
    for (const c of STORY_CATEGORIES) expect(categories.has(c), c).toBe(true);
  });

  test('every roles tag holds only valid role ids and is non-empty when present', () => {
    for (const q of questions) {
      if (q.roles === undefined) continue;
      expect(q.roles.length, q.id).toBeGreaterThan(0);
      for (const r of q.roles) expect(ROLE_IDS, `${q.id}:${r}`).toContain(r);
    }
  });
});

describe('algorithms round', () => {
  const algo = questions.filter((q) => q.round === 'algo');
  // The pad as the grader worker loads it: compiled, evaluated, the named function handed back.
  const load = (code: string, fn: string) =>
    new Function('React', `${compile(code)}\n;return typeof ${fn} === 'function' ? ${fn} : undefined;`)({}) as ((...a: unknown[]) => unknown) | undefined;

  test('is catalogued with a 30-minute target', () => {
    expect(rounds.find((r) => r.id === 'algo')).toMatchObject({ title: 'Algorithms', targetSeconds: 1800 });
  });

  test('every task is a graded scratch pad whose starter defines the graded function', () => {
    expect(algo.length).toBeGreaterThan(0);
    for (const q of algo) {
      expect(q.scratch && q.statement?.trim() && q.grader, q.id).toBeTruthy();
      expect(q.preview ?? q.needsDom, q.id).toBeUndefined();
      expect(q.grader!.fn, q.id).toMatch(/^[A-Za-z_$][\w$]*$/);
      expect(typeof load(q.code!, q.grader!.fn), q.id).toBe('function');
    }
  });

  test('every task has an example, a correctness and a performance case', () => {
    for (const q of algo) {
      for (const kind of ['example', 'correctness', 'performance'] as const) {
        expect(q.grader!.cases.some((c) => c.kind === kind), `${q.id} has no ${kind} case`).toBe(true);
      }
    }
  });

  // A wrong hand-written expected would grade a correct solution as failing.
  test('the reference returns every hand-written expected value', () => {
    for (const q of algo) {
      const reference = q.grader!.reference as (...a: unknown[]) => unknown;
      for (const c of q.grader!.cases) {
        if ('gen' in c || c.expected === undefined) continue;
        expect(same(reference(...structuredClone(c.args)), c.expected), `${q.id}: ${c.name}`).toBe(true);
      }
    }
  });

  test('generated inputs come from the seeded draw, not Math.random', () => {
    for (const q of algo) {
      const fingerprint = () => buildCases(q.grader!, q.id).map((c) => preview(c.args));
      expect(fingerprint(), q.id).toEqual(fingerprint());
    }
  });

  // The limits are only meaningful if a good solution is nowhere near them; a gen that
  // builds a 10^7 input would time out the reference on a slow laptop.
  test('the reference clears every case at a fifth of its time limit', () => {
    for (const q of algo) {
      const reference = q.grader!.reference as (...a: unknown[]) => unknown;
      for (const c of buildCases(q.grader!, q.id)) {
        const args = structuredClone(c.args);
        const t0 = performance.now();
        reference(...args);
        expect(performance.now() - t0, `${q.id}: ${c.name}`).toBeLessThan(Math.min(c.limitMs, DEFAULT_LIMIT_MS) / 5);
      }
    }
  });

  test('the starter alone does not pass', () => {
    for (const q of algo) {
      const solution = load(q.code!, q.grader!.fn)!;
      const results = buildCases(q.grader!, q.id).map((c) => judge(c, { value: solution(...structuredClone(c.args)), ms: 0 }));
      expect(score(results).total, q.id).toBeLessThan(100);
    }
  });

  test('every task names a complexity in its key points', () => {
    for (const q of algo) expect(q.keyPoints.join(' '), q.id).toMatch(/O\(/);
  });

  test('every category has exactly three tasks', () => {
    const byCategory = new Map<string, number>();
    for (const q of algo) byCategory.set(q.category, (byCategory.get(q.category) ?? 0) + 1);
    expect([...byCategory.entries()]).toEqual([
      ['Arrays & hashing', 3], ['Prefix sums', 3], ['Two pointers & sliding window', 3], ['Sorting', 3],
      ['Stacks & queues', 3], ['Binary search', 3], ['Greedy', 3], ['Dynamic programming', 3],
    ]);
  });
});
