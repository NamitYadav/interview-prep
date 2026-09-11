import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { STORAGE_KEY } from '../lib/storage';
import { EMPTY } from './helpers';
import { reducer, useAppState } from '../hooks/useAppState';

beforeEach(() => localStorage.clear());

describe('reducer', () => {
  test('rate creates an entry with seen=1 and only rating/seen/lastSeen', () => {
    const s = reducer(EMPTY, { type: 'rate', id: 'hm-001', rating: 2, now: 100 });
    expect(s.progress['hm-001']).toEqual({ rating: 2, seen: 1, lastSeen: 100 });
  });
  test('rate increments seen and overwrites rating and lastSeen', () => {
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
  test('saveStory merges a partial update against the current story, not a caller-supplied snapshot', () => {
    let s = reducer(EMPTY, { type: 'createStory', id: 'a' });
    s = reducer(s, { type: 'saveStory', id: 'a', title: 'Migration', body: 'Situation...' });
    // Commit only the body — as if two independently-debounced fields fired close
    // together and this one's closure never knew the title had just changed.
    s = reducer(s, { type: 'saveStory', id: 'a', body: 'Situation... Task... Action...' });
    expect(s.stories.a).toEqual({ title: 'Migration', body: 'Situation... Task... Action...' });
  });

  test('createStory makes an empty story and never clobbers an existing one', () => {
    let s = reducer(EMPTY, { type: 'createStory', id: 'a' });
    expect(s.stories.a).toEqual({ title: '', body: '' });
    s = reducer(s, { type: 'saveStory', id: 'a', title: 'Kept' });
    expect(reducer(s, { type: 'createStory', id: 'a' }).stories.a).toEqual({ title: 'Kept', body: '' });
  });

  // useDebouncedField flushes on unmount, so a save can land AFTER the delete. When it
  // did, the story came back with a blank title — the user deleted it, confirmed the
  // deletion, and it reappeared.
  test('a save landing after a delete does not resurrect the story', () => {
    let s = reducer(EMPTY, { type: 'createStory', id: 'a' });
    s = reducer(s, { type: 'saveStory', id: 'a', title: 'Migration', body: 'Situation...' });
    s = reducer(s, { type: 'deleteStory', id: 'a' });
    s = reducer(s, { type: 'saveStory', id: 'a', body: 'a late debounced flush' });
    expect(s.stories.a).toBeUndefined();
    expect(s.stories).toEqual({});
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
  test('loads from storage and persists changes after the debounce', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, progress: {}, notes: { a: 'hi' } }));
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAppState());
      expect(result.current.state.notes.a).toBe('hi');
      act(() => result.current.dispatch({ type: 'rate', id: 'b', rating: 3, now: 5 }));
      expect(localStorage.getItem(STORAGE_KEY)).not.toContain('"b"');

      act(() => vi.advanceTimersByTime(500));

      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).progress.b).toEqual({
        rating: 3, seen: 1, lastSeen: 5,
      });
      expect(result.current.saveFailed).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  test('rapid successive dispatches coalesce into a single debounced write', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAppState());
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      act(() => result.current.dispatch({ type: 'rate', id: 'a', rating: 1, now: 1 }));
      act(() => vi.advanceTimersByTime(200));
      act(() => result.current.dispatch({ type: 'rate', id: 'b', rating: 2, now: 2 }));
      act(() => vi.advanceTimersByTime(200));
      expect(setItemSpy).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(300));
      expect(setItemSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  test('pagehide flushes a pending debounced write immediately', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAppState());
      act(() => result.current.dispatch({ type: 'rate', id: 'a', rating: 1, now: 1 }));
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      act(() => window.dispatchEvent(new Event('pagehide')));
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).progress.a).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  test('backgrounding the tab (visibilitychange -> hidden) flushes a pending write', () => {
    vi.useFakeTimers();
    const visibilitySpy = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    try {
      const { result } = renderHook(() => useAppState());
      act(() => result.current.dispatch({ type: 'rate', id: 'a', rating: 1, now: 1 }));
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      act(() => document.dispatchEvent(new Event('visibilitychange')));
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).progress.a).toBeDefined();
    } finally {
      visibilitySpy.mockRestore();
      vi.useRealTimers();
    }
  });

  test('does not write again on flush when nothing is pending', () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAppState());
      act(() => result.current.dispatch({ type: 'rate', id: 'a', rating: 1, now: 1 }));
      act(() => vi.advanceTimersByTime(500));
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      act(() => window.dispatchEvent(new Event('pagehide')));
      expect(setItemSpy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  test('unmounting with a pending debounced write flushes it', () => {
    vi.useFakeTimers();
    try {
      const { result, unmount } = renderHook(() => useAppState());
      act(() => result.current.dispatch({ type: 'rate', id: 'a', rating: 1, now: 1 }));
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      unmount();
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).progress.a).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  test('flags saveFailed when the underlying storage write throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useAppState());
      act(() => result.current.dispatch({ type: 'rate', id: 'a', rating: 1, now: 1 }));
      act(() => vi.advanceTimersByTime(500));
      expect(result.current.saveFailed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
