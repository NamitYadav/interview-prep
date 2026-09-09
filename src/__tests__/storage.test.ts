import { beforeEach, describe, expect, test } from 'vitest';
import type { Persisted } from '../types';
import { CORRUPT_KEY, EMPTY, STORAGE_KEY, backupFilename, load, parseBackup, save } from '../lib/storage';

const valid: Persisted = {
  version: 2,
  progress: { 'hr-001': { rating: 2, seen: 1, lastSeen: 5 } },
  notes: { 'hr-001': 'hi' },
  stories: { s1: { title: 'The migration', body: 'Situation...' } },
};

const v1Backup = { version: 1, progress: { 'hr-001': { rating: 2, seen: 1, lastSeen: 5 } }, notes: { 'hr-001': 'hi' } };

beforeEach(() => localStorage.clear());

describe('load', () => {
  test('returns EMPTY when nothing stored', () => {
    expect(load()).toEqual(EMPTY);
  });
  test('returns stored data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    expect(load()).toEqual(valid);
  });
  test('migrates a v1 backup, adding empty stories', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1Backup));
    expect(load()).toEqual({ ...v1Backup, version: 2, stories: {} });
  });
  test('moves corrupt JSON aside and returns EMPTY', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(load()).toEqual(EMPTY);
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{not json');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  test('treats wrong shape as corrupt', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2 }));
    expect(load()).toEqual(EMPTY);
    expect(localStorage.getItem(CORRUPT_KEY)).not.toBeNull();
  });
  test('survives setItem and removeItem also throwing during corrupt recovery', () => {
    const stub = {
      getItem: () => '{not json',
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('denied'); },
    } as unknown as Storage;
    expect(() => load(stub)).not.toThrow();
    expect(load(stub)).toEqual(EMPTY);
  });
  test('mutating a loaded EMPTY does not affect later loads', () => {
    const first = load();
    (first.progress as Record<string, unknown>)['x'] = { rating: 1, seen: 1, lastSeen: 1 };
    (first.notes as Record<string, unknown>)['x'] = 'mutated';
    expect(load()).toEqual(EMPTY);
  });
});

describe('save', () => {
  test('writes JSON and returns true', () => {
    expect(save(valid)).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(valid);
  });
  test('returns false when storage throws', () => {
    const broken = { setItem: () => { throw new Error('quota'); } } as unknown as Storage;
    expect(save(EMPTY, broken)).toBe(false);
  });
});

describe('parseBackup', () => {
  test('accepts a valid backup', () => {
    expect(parseBackup(JSON.stringify(valid))).toEqual(valid);
  });
  test('migrates a v1 backup forward', () => {
    expect(parseBackup(JSON.stringify(v1Backup))).toEqual({ ...v1Backup, version: 2, stories: {} });
  });
  test.each([
    ['not json', 'Not valid JSON'],
    [JSON.stringify({ version: 3, progress: {}, notes: {} }), 'Unsupported backup version'],
    [JSON.stringify({ version: 1, progress: [], notes: {} }), 'progress must be an object'],
    [JSON.stringify({ version: 1, progress: { a: { rating: 4, seen: 1, lastSeen: 1 } }, notes: {} }), 'Invalid progress entry for a'],
    [JSON.stringify({ version: 1, progress: {}, notes: { a: 1 } }), 'Invalid note for a'],
    [JSON.stringify({ version: 2, progress: {}, notes: {}, stories: [] }), 'stories must be an object'],
    [JSON.stringify({ version: 2, progress: {}, notes: {}, stories: { a: { title: 1 } } }), 'Invalid story for a'],
  ])('rejects %s', (text, message) => {
    expect(() => parseBackup(text)).toThrow(message);
  });
});

test('backupFilename uses the date', () => {
  expect(backupFilename(new Date('2026-09-08T10:00:00Z'))).toBe('interview-prep-backup-2026-09-08.json');
});
