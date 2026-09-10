import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHashRoute } from '../hooks/useHashRoute';

afterEach(() => {
  window.location.hash = '';
});

describe('useHashRoute', () => {
  test('reads a valid round id from the initial hash', () => {
    window.location.hash = '#hm';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe('hm');
  });

  test('reads the drill routes from the hash', () => {
    window.location.hash = '#weak';
    const weak = renderHook(() => useHashRoute());
    expect(weak.result.current).toBe('weak');

    window.location.hash = '#notes';
    const notes = renderHook(() => useHashRoute());
    expect(notes.result.current).toBe('notes');

    window.location.hash = '#stories';
    const stories = renderHook(() => useHashRoute());
    expect(stories.result.current).toBe('stories');

    window.location.hash = '#mock';
    const mock = renderHook(() => useHashRoute());
    expect(mock.result.current).toBe('mock');
  });

  test('falls back to null for an invalid hash', () => {
    window.location.hash = '#not-a-round';
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBeNull();
  });

  test('an external hashchange (e.g. clicking a link) updates the route', () => {
    const { result } = renderHook(() => useHashRoute());
    act(() => {
      window.location.hash = '#debrief';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current).toBe('debrief');
  });

  test('an external hashchange scrolls back to the top', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    renderHook(() => useHashRoute());
    act(() => {
      window.location.hash = '#hoe';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockRestore();
  });
});
