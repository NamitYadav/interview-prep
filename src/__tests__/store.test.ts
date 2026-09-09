import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { EMPTY, STORAGE_KEY } from '../lib/storage';
import { reducer, useAppState } from '../hooks/useAppState';

beforeEach(() => localStorage.clear());

describe('reducer', () => {
  test('rate creates an entry with seen=1', () => {
    const s = reducer(EMPTY, { type: 'rate', id: 'hm-001', rating: 2, now: 100 });
    expect(s.progress['hm-001']).toEqual({ rating: 2, seen: 1, lastSeen: 100 });
  });
  test('rate increments seen and overwrites rating', () => {
    let s = reducer(EMPTY, { type: 'rate', id: 'hm-001', rating: 1, now: 100 });
    s = reducer(s, { type: 'rate', id: 'hm-001', rating: 3, now: 200 });
    expect(s.progress['hm-001']).toEqual({ rating: 3, seen: 2, lastSeen: 200 });
  });
  test('note sets and blank note deletes', () => {
    let s = reducer(EMPTY, { type: 'note', id: 'hm-001', text: 'STAR story' });
    expect(s.notes['hm-001']).toBe('STAR story');
    s = reducer(s, { type: 'note', id: 'hm-001', text: '   ' });
    expect(s.notes).toEqual({});
  });
  test('import replaces state', () => {
    const data = { version: 2 as const, progress: { x: { rating: 1 as const, seen: 1, lastSeen: 1 } }, notes: {}, stories: {} };
    expect(reducer(EMPTY, { type: 'import', data })).toEqual(data);
  });
  test('reset returns EMPTY', () => {
    const s = reducer(EMPTY, { type: 'rate', id: 'a', rating: 1, now: 1 });
    expect(reducer(s, { type: 'reset' })).toEqual(EMPTY);
  });
  test('does not mutate previous state', () => {
    const before = structuredClone(EMPTY);
    reducer(EMPTY, { type: 'rate', id: 'a', rating: 1, now: 1 });
    expect(EMPTY).toEqual(before);
  });
  test('reset does not alias the shared EMPTY reference', () => {
    const s = reducer(EMPTY, { type: 'rate', id: 'a', rating: 1, now: 1 });
    const reset1 = reducer(s, { type: 'reset' });
    // mutate in place, as an accidental caller might
    (reset1.notes as Record<string, string>).x = 'mutated';
    (reset1.progress as Record<string, unknown>).x = { rating: 1, seen: 1, lastSeen: 1 };

    expect(EMPTY).toEqual({ version: 2, progress: {}, notes: {}, stories: {} });

    const reset2 = reducer(s, { type: 'reset' });
    expect(reset2).toEqual({ version: 2, progress: {}, notes: {}, stories: {} });
    expect(reset2).not.toBe(reset1);
  });
});

describe('useAppState', () => {
  test('loads from storage and persists changes', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, progress: {}, notes: { a: 'hi' } }));
    const { result } = renderHook(() => useAppState());
    expect(result.current.state.notes.a).toBe('hi');
    act(() => result.current.dispatch({ type: 'rate', id: 'b', rating: 3, now: 5 }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).progress.b).toEqual({ rating: 3, seen: 1, lastSeen: 5 });
    expect(result.current.saveFailed).toBe(false);
  });

  test('flags saveFailed when the underlying storage write throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const { result } = renderHook(() => useAppState());
    act(() => result.current.dispatch({ type: 'rate', id: 'a', rating: 1, now: 1 }));
    expect(result.current.saveFailed).toBe(true);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
