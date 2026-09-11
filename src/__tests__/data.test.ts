import { describe, expect, test } from 'vitest';
import { ROUND_IDS, STORY_CATEGORIES, questions, rounds } from '../data';
import type { RoundId } from '../types';

const ID_RE = /^(hr|hm|coding|design|case|debrief|hoe)-\d{3}$/;

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
    const min: Record<RoundId, number> = { hr: 36, hm: 99, coding: 35, design: 30, case: 30, debrief: 32, hoe: 33 };
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

  // The habit the data-structures questions exist to train is saying a complexity out
  // loud. If it is not in the checklist, the drill never scores it.
  test('every data-structures question puts a complexity in its key points', () => {
    const ds = questions.filter((q) => q.category === 'Data structures & traversal');
    expect(ds.length).toBeGreaterThan(0);
    for (const q of ds) {
      expect(q.keyPoints.join(' '), `${q.id} key points name no complexity`).toMatch(/O\(/);
    }
  });

  test('every STORY_CATEGORIES entry matches at least one real question category', () => {
    const categories = new Set(questions.map((q) => q.category));
    for (const c of STORY_CATEGORIES) expect(categories.has(c), c).toBe(true);
  });
});
