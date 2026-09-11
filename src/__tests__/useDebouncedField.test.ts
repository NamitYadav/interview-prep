import { describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedField } from '../hooks/useDebouncedField';

describe('useDebouncedField', () => {
  test('commits 300ms after the last change', () => {
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      const { result } = renderHook(() => useDebouncedField('', onCommit));
      act(() => result.current.onChange('hello'));
      expect(onCommit).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(300));
      expect(onCommit).toHaveBeenCalledWith('hello');
    } finally {
      vi.useRealTimers();
    }
  });

  test('blur flushes a pending change immediately', () => {
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      const { result } = renderHook(() => useDebouncedField('', onCommit));
      act(() => result.current.onChange('hello'));
      act(() => result.current.onBlur());
      expect(onCommit).toHaveBeenCalledWith('hello');
    } finally {
      vi.useRealTimers();
    }
  });

  test('unmounting mid-debounce flushes the pending change instead of dropping it', () => {
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      const { result, unmount } = renderHook(() => useDebouncedField('', onCommit));
      act(() => result.current.onChange('hello'));
      unmount();
      expect(onCommit).toHaveBeenCalledWith('hello');
    } finally {
      vi.useRealTimers();
    }
  });

  test('unmounting with nothing pending does not commit', () => {
    const onCommit = vi.fn();
    const { unmount } = renderHook(() => useDebouncedField('saved', onCommit));
    unmount();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
