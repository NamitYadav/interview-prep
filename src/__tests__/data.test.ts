import { describe, expect, test } from 'vitest';
import { ROUND_IDS, questions, rounds } from '../data';

const ID_RE = /^(hr|hm|case|debrief|hoe)-\d{3}$/;

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
      for (const p of [...q.answer, ...q.keyPoints, ...(q.followUps ?? [])]) {
        expect(p.trim().length, q.id).toBeGreaterThan(0);
      }
    }
  });

  test('every round has its expected exact question count', () => {
    const expected: Record<string, number> = { hr: 26, hm: 50, case: 37, debrief: 35, hoe: 31 };
    for (const id of ROUND_IDS) {
      expect(questions.filter((q) => q.round === id).length, id).toBe(expected[id]);
    }
  });
});
