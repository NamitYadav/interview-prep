import type { Question } from '../types';

// Where you are in each lap. Per-device and OUT of backups, like the theme and
// strict-mode preferences — it is a position, not prep data.
//
// Keyed by question set rather than a single global slot: a round's Practice tab, a
// category chip, the Weak drill and a mock preset are all different sets, and one slot
// meant opening any of them destroyed the lap you were part-way through in another.
const KEY = 'interview-prep:laps';

// Enough for the rounds plus a couple of drills. Oldest-saved is evicted rather than
// letting the store grow for every category chip ever visited.
const MAX_LAPS = 12;

export interface SavedLap {
  key: string;
  history: string[];
  historyPos: number;
  requeued: { id: string; at: number }[];
  step: number;
  savedAt: number;
}

// Identifies the question set without changing any caller's signature. Note this is a
// heuristic, not a hash: two sets sharing length and endpoints collide, so Practice also
// drops restored ids the current set no longer contains.
export const lapKey = (questions: Question[]): string =>
  `${questions.length}:${questions[0]?.id ?? ''}:${questions[questions.length - 1]?.id ?? ''}`;

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

const parseLap = (key: string, v: unknown): SavedLap | undefined => {
  if (typeof v !== 'object' || v === null) return undefined;
  const lap = v as Record<string, unknown>;
  if (!isStringArray(lap.history) || typeof lap.historyPos !== 'number' || typeof lap.step !== 'number') return undefined;
  if (lap.historyPos < 0 || lap.historyPos >= lap.history.length) return undefined;
  if (!Array.isArray(lap.requeued)) return undefined;
  const requeued = lap.requeued.filter(
    (r): r is { id: string; at: number } =>
      typeof r === 'object' && r !== null && typeof (r as { id?: unknown }).id === 'string' && typeof (r as { at?: unknown }).at === 'number',
  );
  return {
    key,
    history: lap.history,
    historyPos: lap.historyPos,
    requeued,
    step: lap.step,
    savedAt: typeof lap.savedAt === 'number' ? lap.savedAt : 0,
  };
};

const readAll = (): Record<string, SavedLap> => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, SavedLap> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const lap = parseLap(k, v);
      if (lap) out[k] = lap;
    }
    return out;
  } catch {
    return {};
  }
};

export function readLap(key: string): SavedLap | undefined {
  return readAll()[key];
}

export function writeLap(lap: Omit<SavedLap, 'savedAt'>, now: number = Date.now()): void {
  try {
    const all = readAll();
    all[lap.key] = { ...lap, savedAt: now };
    const entries = Object.entries(all).sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, MAX_LAPS);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* storage unavailable — the lap just won't survive a reload */ }
}

export function clearLap(key: string): void {
  try {
    const all = readAll();
    if (!(key in all)) return;
    delete all[key];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* empty */ }
}
