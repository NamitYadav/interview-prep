import { describe, expect, test } from 'vitest';
import { ROUND_IDS, STORY_CATEGORIES, questions, rounds } from '../data';
import { ROLE_IDS, roles } from '../data/roles';
import { MAX_DRAFTS } from '../lib/drafts';
import { MAX_LAPS } from '../lib/lap';
import type { RoundId } from '../types';

const ID_RE = /^(hr|hm|coding|design|case|debrief|hoe|lead|arch)-\d{3}$/;

describe('question bank', () => {
  test('rounds cover every RoundId once', () => {
    expect(rounds.map((r) => r.id).sort()).toEqual([...ROUND_IDS].sort());
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
    const min: Record<RoundId, number> = { hr: 36, hm: 99, coding: 35, design: 30, case: 30, debrief: 32, hoe: 33, lead: 30, arch: 30 };
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
    const budget = new Map(rounds.map((r) => [r.id, Math.round((r.targetSeconds / 60) * SPOKEN_WPM)]));
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
