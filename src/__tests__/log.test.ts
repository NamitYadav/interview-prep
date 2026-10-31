import { describe, expect, test } from 'vitest';
import type { LoggedQuestion } from '../types';
import { fromLocalDay, localDay, loggedQuestions, onDay, toQuestion } from '../lib/log';

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
  test('keeps a leading dash that is not a list marker', () => {
    const answer = '-webkit-line-clamp: 3\n--gap sets spacing\n-1 means not found\n•tight bullet';
    expect(toQuestion('abc', { ...entry, answer }).answer).toEqual(['-webkit-line-clamp: 3', '--gap sets spacing', '-1 means not found', 'tight bullet']);
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

test('onDay moves to another day and keeps the time of day', () => {
  expect(onDay(new Date(2026, 9, 29, 14, 5, 7).getTime(), '2026-10-21')).toBe(new Date(2026, 9, 21, 14, 5, 7).getTime());
});
