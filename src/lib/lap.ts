import type { Question } from '../types';

// Where you are in each lap. Per-device and OUT of backups, like the theme and
// strict-mode preferences — it is a position, not prep data.
//
// Keyed by question set rather than a single global slot: a round's Practice tab, a
// category chip, the Weak drill and a mock preset are all different sets, and one slot
// meant opening any of them destroyed the lap you were part-way through in another.
const KEY = 'interview-prep:laps';

// The ratings a mock session STARTED with, so its recap can tell "rated this session"
// apart from ratings you already had. It lives here because it is the same kind of
// thing as the lap: per-device session bookkeeping, keyed the same way, cleared at the
// same moments. Held in component state alone, a mid-session reload — which drops the
// user on the preset list — re-froze it against current progress on the way back in,
// and every rating from before the reload then looked pre-existing: a full 28-question
// session recapping as "3 of 28 rated".
const BASELINE_KEY = 'interview-prep:mock-baseline';

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

// Reset and Import replace the whole data set, so a lap pointing into the old one is
// worse than no lap: after a reset you resume mid-lap with everything unrated, and
// after an import your position belongs to somebody else's data. Baselines go with
// them — they are the same session, and one without the other is just wrong counts.
export function clearAllLaps(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(BASELINE_KEY);
  } catch { /* empty */ }
}

// id -> `seen` count at the moment the session started. The count, not the progress
// entry itself: `rate` bumps `seen` every time, so "changed since the baseline" is
// exactly "rated again this session" — and unlike the object identity check this
// replaces, a number survives being written to disk and read back.
export type Baseline = Record<string, number>;

const readBaselines = (): Record<string, Baseline> => {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, Baseline> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v !== 'object' || v === null || Array.isArray(v)) continue;
      out[k] = Object.fromEntries(Object.entries(v).filter(([, n]) => typeof n === 'number')) as Baseline;
    }
    return out;
  } catch {
    return {};
  }
};

export function readBaseline(key: string): Baseline | undefined {
  return readBaselines()[key];
}

// Uncapped on purpose: one entry per preset the user has an unfinished session in,
// and every way out of a session clears its entry.
export function writeBaseline(key: string, baseline: Baseline): void {
  try {
    localStorage.setItem(BASELINE_KEY, JSON.stringify({ ...readBaselines(), [key]: baseline }));
  } catch { /* storage unavailable — the recap just counts from the current progress */ }
}

export function clearBaseline(key: string): void {
  try {
    const all = readBaselines();
    if (!(key in all)) return;
    delete all[key];
    localStorage.setItem(BASELINE_KEY, JSON.stringify(all));
  } catch { /* empty */ }
}
