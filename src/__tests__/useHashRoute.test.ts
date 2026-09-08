import { afterEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHashRoute } from '../hooks/useHashRoute';

afterEach(() => {
  window.location.hash = '';
});

describe('useHashRoute', () => {
  test('reads a valid round id from the initial hash', () => {
    window.location.hash = '#hm';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current[0]).toBe('hm');
  });

  test('reads the drill routes from the hash', () => {
    window.location.hash = '#weak';
    const weak = renderHook(() => useHashRoute());
    expect(weak.result.current[0]).toBe('weak');

    window.location.hash = '#notes';
    const notes = renderHook(() => useHashRoute());
    expect(notes.result.current[0]).toBe('notes');
  });

  test('falls back to null for an invalid hash', () => {
    window.location.hash = '#not-a-round';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current[0]).toBeNull();
  });

  test('navigate updates both the hash and the returned route', () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => result.current[1]('case'));
    expect(result.current[0]).toBe('case');
    expect(window.location.hash).toBe('#case');
  });

  test('navigate(null) clears the hash', () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => result.current[1]('hoe'));
    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
    expect(window.location.hash).toBe('');
  });

  test('an external hashchange (e.g. clicking a link) updates the route', () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => {
      window.location.hash = '#debrief';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current[0]).toBe('debrief');
  });
});
