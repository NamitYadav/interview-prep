import { describe, expect, test } from 'vitest';
import type { LoggedQuestion } from '../types';
import { fromLocalDay, localDay, loggedQuestions, toQuestion } from '../lib/log';

const entry: LoggedQuestion = { question: 'Why Berlin?', round: 'hr', answer: '- one\n\n• two\nthree', at: new Date(2026, 9, 29, 18).getTime() };

describe('toQuestion', () => {
  test('makes a drillable question with a log: id and no key points', () => {
    const q = toQuestion('abc', entry);
    expect(q).toMatchObject({ id: 'log:abc', round: 'hr', question: 'Why Berlin?', keyPoints: [] });
    expect(q.category).toMatch(/^Asked /);
  });
  test('turns the answer into lines, without list markers', () => {
    expect(toQuestion('abc', entry).answer).toEqual(['one', 'two', 'three']);
  });
  test('a blank answer says so', () => {
    expect(toQuestion('abc', { ...entry, answer: '  ' }).answer).toEqual(['No answer written yet. Add one under Real questions.']);
  });
});

test('loggedQuestions skips entries with no question yet', () => {
  expect(loggedQuestions({ a: entry, b: { ...entry, question: '  ' } }).map((q) => q.id)).toEqual(['log:a']);
});

test('local days round-trip, just after midnight included', () => {
  const lateNight = new Date(2026, 9, 29, 0, 30).getTime();
  expect(localDay(lateNight)).toBe('2026-10-29');
  expect(localDay(fromLocalDay('2026-10-29'))).toBe('2026-10-29');
  expect(fromLocalDay('2026-10-29')).toBe(new Date(2026, 9, 29).getTime());
});
