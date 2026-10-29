import type { Log, LoggedQuestion, Question } from '../types';

// Logged questions drill through the same Practice, queue and ratings as the bank. The
// prefix keeps their progress keys apart from bank ids.
export const LOG_PREFIX = 'log:';

const BLANK_ANSWER = 'No answer written yet. Add one under Real questions.';

const pad = (n: number) => String(n).padStart(2, '0');

// The local calendar day, never toISOString's UTC one: a question logged at 00:30 in
// Berlin belongs to that day, not the one before.
export const localDay = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// A date-time with no offset parses as local time; a bare date would parse as UTC.
export const fromLocalDay = (day: string): number => new Date(`${day}T00:00`).getTime();

export function toQuestion(id: string, entry: LoggedQuestion): Question {
  const lines = entry.answer
    .split('\n')
    .map((l) => l.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean);
  return {
    id: LOG_PREFIX + id,
    round: entry.round,
    category: `Asked ${new Date(entry.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`,
    question: entry.question,
    answer: lines.length > 0 ? lines : [BLANK_ANSWER],
    keyPoints: [],
  };
}

export const loggedQuestions = (log: Log): Question[] =>
  Object.entries(log)
    .filter(([, e]) => e.question.trim() !== '')
    .map(([id, e]) => toQuestion(id, e));
