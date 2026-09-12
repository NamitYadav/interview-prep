import { useStoredValue } from './useStoredValue';

// Per-device preference, same shape as useStrictMode: not prep data, so it stays out of
// export/import backups and needs no schema version.
//
// Defaults ON — absent means enabled — because the shortcuts already exist and are the
// fastest way to drill. The stored value is the OFF marker, so turning them off is what
// gets written. Its reason for existing is WCAG 2.2 SC 2.1.4: a shortcut bound to an
// unmodified character has to be switchable off, remappable, or focus-scoped, and
// Practice binds n/b/1/2/3 and Space on window.
export const SHORTCUTS_KEY = 'interview-prep:shortcuts';

const decode = (raw: string | null): boolean => raw !== '0';
const encode = (v: boolean): string | null => (v ? null : '0');

export function useShortcuts(): [boolean, (v: boolean) => void] {
  return useStoredValue(SHORTCUTS_KEY, decode, encode);
}
