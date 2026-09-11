import { beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { STRICT_MODE_KEY, useStrictMode } from '../hooks/useStrictMode';

beforeEach(() => localStorage.clear());

describe('useStrictMode', () => {
  test('defaults to off', () => {
    const { result } = renderHook(() => useStrictMode());
    expect(result.current[0]).toBe(false);
  });

  test('turning it on persists the "1" sentinel', () => {
    const { result } = renderHook(() => useStrictMode());
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(STRICT_MODE_KEY)).toBe('1');
  });

  test('turning it back off removes the key rather than writing a falsy value', () => {
    const { result } = renderHook(() => useStrictMode());
    act(() => result.current[1](true));
    act(() => result.current[1](false));
    expect(localStorage.getItem(STRICT_MODE_KEY)).toBeNull();
  });

  test('restores an on preference on mount', () => {
    localStorage.setItem(STRICT_MODE_KEY, '1');
    const { result } = renderHook(() => useStrictMode());
    expect(result.current[0]).toBe(true);
  });

  test('any stored value other than "1" reads as off', () => {
    localStorage.setItem(STRICT_MODE_KEY, 'true');
    const { result } = renderHook(() => useStrictMode());
    expect(result.current[0]).toBe(false);
  });
});
