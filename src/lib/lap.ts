import type { Question } from '../types';

// Where you are in the current lap. Per-device and OUT of backups, like the theme and
// strict-mode preferences — it is a position, not prep data.
const KEY = 'interview-prep:lap';

export interface SavedLap {
  key: string;
  history: string[];
  historyPos: number;
  requeued: { id: string; at: number }[];
  step: number;
}

// Identifies the question set without changing any caller's signature: a round's
// Practice tab, a Weak drill and a mock session all pass different arrays, and
// restoring one lap into another set would serve ids the set does not contain.
export const lapKey = (questions: Question[]): string =>
  `${questions.length}:${questions[0]?.id ?? ''}:${questions[questions.length - 1]?.id ?? ''}`;

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

export function readLap(key: string): SavedLap | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return undefined;
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null) return undefined;
    const lap = v as Record<string, unknown>;
    if (lap.key !== key) return undefined;
    if (!isStringArray(lap.history) || typeof lap.historyPos !== 'number' || typeof lap.step !== 'number') return undefined;
    if (lap.historyPos < 0 || lap.historyPos >= lap.history.length) return undefined;
    if (!Array.isArray(lap.requeued)) return undefined;
    const requeued = lap.requeued.filter(
      (r): r is { id: string; at: number } =>
        typeof r === 'object' && r !== null && typeof (r as { id?: unknown }).id === 'string' && typeof (r as { at?: unknown }).at === 'number',
    );
    return { key, history: lap.history, historyPos: lap.historyPos, requeued, step: lap.step };
  } catch {
    return undefined;
  }
}

export function writeLap(lap: SavedLap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lap));
  } catch { /* storage unavailable — the lap just won't survive a reload */ }
}

export function clearLap(): void {
  try {
    localStorage.removeItem(KEY);
  } catch { /* empty */ }
}
