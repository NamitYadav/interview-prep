import { beforeEach, describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  LOOP_DATE_KEY, ROLE_KEY, SHORTCUTS_KEY, STRICT_MODE_KEY, useLoopDate, useRole, useShortcuts, useStrictMode,
} from '../hooks/prefs';

beforeEach(() => localStorage.clear());

// Each preference: its default, a non-default value and how that is stored, and a stored
// value that must not be trusted. Shortcuts default ON (they predate the switch), so an
// unreadable or garbage store must not silently disable them.
const PREFS = [
  { name: 'strict mode', use: useStrictMode, key: STRICT_MODE_KEY, fallback: false, value: true, raw: '1', garbage: 'true' },
  { name: 'shortcuts', use: useShortcuts, key: SHORTCUTS_KEY, fallback: true, value: false, raw: '0', garbage: 'off' },
  // A corrupt date showed "NaN days left".
  { name: 'loop date', use: useLoopDate, key: LOOP_DATE_KEY, fallback: null, value: '2026-10-01', raw: '2026-10-01', garbage: 'next week' },
  { name: 'role', use: useRole, key: ROLE_KEY, fallback: 'staff', value: 'fs-staff', raw: 'fs-staff', garbage: 'not-a-role' },
] as const;

describe.each(PREFS)('$name', ({ use, key, fallback, value, raw, garbage }) => {
  const mount = () => renderHook(() => use() as readonly [unknown, (v: unknown) => void]);

  test('defaults without writing anything', () => {
    expect(mount().result.current[0]).toBe(fallback);
    expect(localStorage.getItem(key)).toBeNull();
  });

  test('persists a change and restores it on the next mount', () => {
    const { result, unmount } = mount();
    act(() => result.current[1](value));
    expect(localStorage.getItem(key)).toBe(raw);
    unmount();
    expect(mount().result.current[0]).toBe(value);
  });

  test('going back to the default removes the key', () => {
    const { result } = mount();
    act(() => result.current[1](value));
    act(() => result.current[1](fallback));
    expect(localStorage.getItem(key)).toBeNull();
  });

  test('a garbage stored value falls back to the default', () => {
    localStorage.setItem(key, garbage);
    expect(mount().result.current[0]).toBe(fallback);
  });

  test('an unreadable store falls back to the default', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('denied'); };
    try {
      expect(mount().result.current[0]).toBe(fallback);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
