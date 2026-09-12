import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHashRoute } from '../hooks/useHashRoute';

// Node reports unhandled rejections, not jsdom, and @types/node is not installed — not
// worth adding for the two methods one test needs.
declare const process: {
  on(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
  off(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
};

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

  // Every hash navigation logged "Uncaught (in promise) InvalidStateError: Transition
  // was aborted because of invalid state". startViewTransition's `ready` rejects when
  // the transition is aborted — a second navigation starting before the first settles,
  // or a document that cannot transition — and nothing was attached to catch it.
  describe('an aborted view transition', () => {
    const stubTransition = (ready: Promise<void>) => {
      const startViewTransition = vi.fn((callback: () => void) => {
        callback();
        return {
          ready,
          finished: Promise.resolve(),
          updateCallbackDone: Promise.resolve(),
          skipTransition: () => {},
        };
      });
      (document as unknown as { startViewTransition: unknown }).startViewTransition = startViewTransition;
      return startViewTransition;
    };

    afterEach(() => {
      delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
    });

    test('leaves no unhandled rejection behind', async () => {
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => unhandled.push(reason);
      process.on('unhandledRejection', onUnhandled);
      try {
        stubTransition(Promise.reject(new DOMException('Transition was aborted because of invalid state', 'InvalidStateError')));
        renderHook(() => useHashRoute());
        act(() => {
          window.location.hash = '#case';
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        });
        // Node only reports an unhandled rejection once a macrotask has gone by with
        // nothing attached, so give it that turn before asserting.
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(unhandled).toEqual([]);
      } finally {
        process.off('unhandledRejection', onUnhandled);
      }
    });

    // The DOM update callback still runs when a transition is aborted, so the route
    // change itself was never at stake and must not become collateral of the fix.
    test('still changes the route', async () => {
      stubTransition(Promise.reject(new DOMException('aborted', 'InvalidStateError')));
      const { result } = renderHook(() => useHashRoute());
      act(() => {
        window.location.hash = '#hoe';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(result.current).toBe('hoe');
    });
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
