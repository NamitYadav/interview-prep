import type { Persisted, ProgressEntry, Story } from '../types';

export const STORAGE_KEY = 'interview-prep:v1';
export const CORRUPT_KEY = 'interview-prep:v1:corrupt';

// A fresh object every call — load() must never hand callers a shared reference,
// or an in-place mutation would pollute every future empty load.
export const emptyState = (): Persisted => ({ version: 2, progress: {}, notes: {}, stories: {} });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Number.isFinite, not typeof — typeof accepts Infinity/NaN, which JSON.stringify
// silently turns into `null`, making the backup fail to re-validate on next load.
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isOptionalFiniteNumber = (v: unknown): v is number | undefined => v === undefined || isFiniteNumber(v);

const isEntry = (v: unknown): v is ProgressEntry =>
  isRecord(v) &&
  (v.rating === 1 || v.rating === 2 || v.rating === 3) &&
  isFiniteNumber(v.seen) &&
  isFiniteNumber(v.lastSeen);

const isStory = (v: unknown): v is Story =>
  isRecord(v) &&
  typeof v.title === 'string' &&
  typeof v.body === 'string' &&
  isOptionalFiniteNumber(v.lastRehearsed);

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
  const data = validate(raw);
  // A lastSeen more than a day ahead is a broken clock or a hand-edited file, and it would
  // count as "rated today" for good. Import only: load() must not bin a whole store your
  // own clock wrote.
  for (const [id, entry] of Object.entries(data.progress)) {
    if (entry.lastSeen > Date.now() + 86_400_000) throw new Error(`Invalid progress entry for ${id}`);
  }
  return data;
}

// Set by load() when the stored blob is from a newer version of the app (a deploy rolled
// back). Moving it aside and saving an empty v2 over it lost it for good once the newer
// version returned, so until a reload save() leaves it alone.
let newerOnDisk = false;

export function load(storage: Storage = localStorage): Persisted {
  newerOnDisk = false;
  let text: string | null;
  try {
    text = storage.getItem(STORAGE_KEY);
  } catch {
    return emptyState();
  }
  if (text === null) return emptyState();
  try {
    const raw: unknown = JSON.parse(text);
    if (isRecord(raw) && typeof raw.version === 'number' && raw.version > 2) {
      newerOnDisk = true;
      return emptyState();
    }
    return validate(raw);
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
  if (newerOnDisk) return false;
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
