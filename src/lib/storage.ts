import type { Persisted, ProgressEntry, Story } from '../types';

export const STORAGE_KEY = 'interview-prep:v1';
export const CORRUPT_KEY = 'interview-prep:v1:corrupt';
export const EMPTY: Persisted = { version: 2, progress: {}, notes: {}, stories: {} };

// ponytail: EMPTY is a shared singleton (kept for Task 5 + existing tests' toEqual
// checks); load() must never hand callers that exact reference, or an in-place
// mutation would pollute every future empty load. Return a fresh deep copy instead.
export const emptyState = (): Persisted => ({ version: 2, progress: {}, notes: {}, stories: {} });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isEntry = (v: unknown): v is ProgressEntry =>
  isRecord(v) &&
  (v.rating === 1 || v.rating === 2 || v.rating === 3) &&
  typeof v.seen === 'number' &&
  typeof v.lastSeen === 'number';

const isStory = (v: unknown): v is Story =>
  isRecord(v) &&
  typeof v.title === 'string' &&
  typeof v.body === 'string' &&
  (v.lastRehearsed === undefined || typeof v.lastRehearsed === 'number');

/** Validates an unknown value as Persisted. Throws Error with a user-facing message. Migrates v1 backups forward. */
export function validate(raw: unknown): Persisted {
  if (!isRecord(raw)) throw new Error('Backup must be a JSON object');
  if (raw.version !== 1 && raw.version !== 2) throw new Error('Unsupported backup version');
  if (!isRecord(raw.progress)) throw new Error('progress must be an object');
  if (!isRecord(raw.notes)) throw new Error('notes must be an object');
  for (const [id, entry] of Object.entries(raw.progress)) {
    if (!isEntry(entry)) throw new Error(`Invalid progress entry for ${id}`);
  }
  for (const [id, note] of Object.entries(raw.notes)) {
    if (typeof note !== 'string') throw new Error(`Invalid note for ${id}`);
  }
  const stories = raw.version === 2 ? raw.stories : {};
  if (!isRecord(stories)) throw new Error('stories must be an object');
  for (const [id, story] of Object.entries(stories)) {
    if (!isStory(story)) throw new Error(`Invalid story for ${id}`);
  }
  return {
    version: 2,
    progress: raw.progress as Persisted['progress'],
    notes: raw.notes as Persisted['notes'],
    stories: stories as Persisted['stories'],
  };
}

export function parseBackup(text: string): Persisted {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Not valid JSON');
  }
  return validate(raw);
}

export function load(storage: Storage = localStorage): Persisted {
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return emptyState();
  }
  if (text === null) return emptyState();
  try {
    return parseBackup(text);
  } catch {
    try {
      storage.setItem(CORRUPT_KEY, text);
      storage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing else to do */
    }
    return emptyState();
  }
}

export function save(data: Persisted, storage: Storage = localStorage): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function backupFilename(date: Date = new Date()): string {
  return `interview-prep-backup-${date.toISOString().slice(0, 10)}.json`;
}
