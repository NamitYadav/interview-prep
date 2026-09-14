import { beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ROLE_KEY, useRole } from './useRole';

beforeEach(() => localStorage.clear());

describe('useRole', () => {
  test('defaults to staff', () => {
    const { result } = renderHook(() => useRole());
    expect(result.current[0]).toBe('staff');
  });

  test('setting a role persists it', () => {
    const { result } = renderHook(() => useRole());
    act(() => result.current[1]('architect'));
    expect(result.current[0]).toBe('architect');
    expect(localStorage.getItem(ROLE_KEY)).toBe('architect');
  });

  test('restores a stored role on mount', () => {
    localStorage.setItem(ROLE_KEY, 'lead');
    const { result } = renderHook(() => useRole());
    expect(result.current[0]).toBe('lead');
  });

  test('garbage stored value falls back to staff', () => {
    localStorage.setItem(ROLE_KEY, 'not-a-role');
    const { result } = renderHook(() => useRole());
    expect(result.current[0]).toBe('staff');
  });

  test('null (nothing stored) falls back to staff', () => {
    const { result } = renderHook(() => useRole());
    expect(result.current[0]).toBe('staff');
    expect(localStorage.getItem(ROLE_KEY)).toBeNull();
  });
});
