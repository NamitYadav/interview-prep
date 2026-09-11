import { beforeEach, describe, expect, test } from 'vitest';
import { draftKey, readDraft, writeDraft } from '../lib/drafts';

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

  test('an emptied draft is removed rather than stored blank', () => {
    const k = draftKey('coding-001', 'scratch');
    writeDraft(k, 'something');
    writeDraft(k, '');
    expect(readDraft(k)).toBeUndefined();
    expect(localStorage.getItem('interview-prep:drafts')).toBe('{}');
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
