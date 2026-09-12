import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { clearAllDrafts, clearDraft, draftKey, readDraft, writeDraft } from '../lib/drafts';

beforeEach(() => localStorage.clear());

describe('drafts', () => {
  test('round-trips a draft', () => {
    writeDraft(draftKey('coding-001', 'scratch'), 'const x = 1;');
    expect(readDraft(draftKey('coding-001', 'scratch'))).toBe('const x = 1;');
  });

  test('keys are namespaced per question and per field', () => {
    writeDraft(draftKey('coding-001', 'scratch'), 'a');
    writeDraft(draftKey('coding-002', 'scratch'), 'b');
    writeDraft(draftKey('coding-001', 'design-scratch'), 'c');
    expect(readDraft(draftKey('coding-001', 'scratch'))).toBe('a');
    expect(readDraft(draftKey('coding-002', 'scratch'))).toBe('b');
    expect(readDraft(draftKey('coding-001', 'design-scratch'))).toBe('c');
  });

  // The scratch editor starts pre-filled with the question's code, so treating "" as
  // absent meant deliberately clearing it brought the starter text back on remount.
  test('an emptied draft stays empty rather than falling back to the starter value', () => {
    const k = draftKey('coding-001', 'scratch');
    writeDraft(k, 'something');
    writeDraft(k, '');
    expect(readDraft(k)).toBe('');
  });

  test('clearDraft drops it so the starter value returns', () => {
    const k = draftKey('coding-001', 'scratch');
    writeDraft(k, '');
    clearDraft(k);
    expect(readDraft(k)).toBeUndefined();
  });

  test('returns undefined for an unknown key', () => {
    expect(readDraft(draftKey('nope', 'scratch'))).toBeUndefined();
  });

  test('survives corrupt or non-object stored data', () => {
    localStorage.setItem('interview-prep:drafts', 'not json');
    expect(readDraft(draftKey('a', 'scratch'))).toBeUndefined();
    localStorage.setItem('interview-prep:drafts', '[1,2,3]');
    expect(readDraft(draftKey('a', 'scratch'))).toBeUndefined();
    // and a write still recovers the store rather than throwing
    writeDraft(draftKey('a', 'scratch'), 'ok');
    expect(readDraft(draftKey('a', 'scratch'))).toBe('ok');
  });

  test('ignores non-string values in stored data', () => {
    localStorage.setItem('interview-prep:drafts', JSON.stringify({ a: 'keep', b: 42, c: null }));
    expect(readDraft('a')).toBe('keep');
    expect(readDraft('b')).toBeUndefined();
    expect(readDraft('c')).toBeUndefined();
  });
});

describe('drafts do not grow without limit', () => {
  afterEach(() => vi.restoreAllMocks());

  // Drafts are the biggest thing this app stores and they share the origin quota with
  // progress, so an uncapped store eventually stops RATINGS from saving. The oldest
  // scratch goes; the one just typed into stays.
  test('evicts the oldest draft past the cap', () => {
    for (let i = 0; i < 25; i++) writeDraft(`q${i}:scratch`, `draft ${i}`, 1000 + i);
    const stored = JSON.parse(localStorage.getItem('interview-prep:drafts') ?? '{}');
    expect(Object.keys(stored)).toHaveLength(20);
    expect(readDraft('q24:scratch')).toBe('draft 24');
    expect(readDraft('q5:scratch')).toBe('draft 5');
    expect(readDraft('q4:scratch')).toBeUndefined();
  });

  test('touching an old draft keeps it and evicts a staler one instead', () => {
    for (let i = 0; i < 20; i++) writeDraft(`q${i}:scratch`, `draft ${i}`, 1000 + i);
    writeDraft('q0:scratch', 'still working on this', 5000);
    writeDraft('fresh:scratch', 'new', 6000);
    expect(readDraft('q0:scratch')).toBe('still working on this');
    expect(readDraft('q1:scratch')).toBeUndefined();
  });

  // Swallowed, a full quota lost a 45-minute design write-up on reload with no signal.
  test('reports a failed write instead of swallowing it', () => {
    expect(writeDraft('q:scratch', 'kept')).toBe(true);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(writeDraft('q:scratch', 'lost')).toBe(false);
  });

  test('clearAllDrafts empties the store', () => {
    writeDraft('a:scratch', 'x');
    clearAllDrafts();
    expect(readDraft('a:scratch')).toBeUndefined();
  });
});
