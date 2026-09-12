import { beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { SHORTCUTS_KEY, useShortcuts } from '../hooks/useShortcuts';

beforeEach(() => localStorage.clear());

describe('useShortcuts', () => {
  // Absent means enabled: the shortcuts predate this switch and are the fastest way to
  // drill, so defaulting them off would silently take them away.
  test('defaults on when nothing is stored', () => {
    expect(renderHook(() => useShortcuts()).result.current[0]).toBe(true);
  });

  test('persists the off state and reads it back', () => {
    const { result, unmount } = renderHook(() => useShortcuts());
    act(() => result.current[1](false));
    expect(localStorage.getItem(SHORTCUTS_KEY)).toBe('0');
    unmount();
    expect(renderHook(() => useShortcuts()).result.current[0]).toBe(false);
  });

  test('turning them back on clears the marker rather than storing a truthy value', () => {
    const { result } = renderHook(() => useShortcuts());
    act(() => result.current[1](false));
    act(() => result.current[1](true));
    expect(localStorage.getItem(SHORTCUTS_KEY)).toBeNull();
    expect(result.current[0]).toBe(true);
  });

  test('an unreadable store falls back to on rather than silently disabling them', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('denied'); };
    try {
      expect(renderHook(() => useShortcuts()).result.current[0]).toBe(true);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
