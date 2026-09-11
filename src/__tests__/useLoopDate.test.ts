import { beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { LOOP_DATE_KEY, useLoopDate } from '../hooks/useLoopDate';

beforeEach(() => localStorage.clear());

describe('useLoopDate', () => {
  test('defaults to null', () => {
    const { result } = renderHook(() => useLoopDate());
    expect(result.current[0]).toBeNull();
  });

  test('setting a date persists it', () => {
    const { result } = renderHook(() => useLoopDate());
    act(() => result.current[1]('2026-10-01'));
    expect(result.current[0]).toBe('2026-10-01');
    expect(localStorage.getItem(LOOP_DATE_KEY)).toBe('2026-10-01');
  });

  test('clearing it back to null removes the key', () => {
    const { result } = renderHook(() => useLoopDate());
    act(() => result.current[1]('2026-10-01'));
    act(() => result.current[1](null));
    expect(localStorage.getItem(LOOP_DATE_KEY)).toBeNull();
  });

  test('restores a stored date on mount', () => {
    localStorage.setItem(LOOP_DATE_KEY, '2026-11-15');
    const { result } = renderHook(() => useLoopDate());
    expect(result.current[0]).toBe('2026-11-15');
  });
});
