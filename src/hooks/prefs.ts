import { useStoredValue } from './useStoredValue';
import { DEFAULT_ROLE, ROLE_IDS } from '../data/roles';
import type { RoleId } from '../types';

// Per-device preferences, same shape as useTheme: not prep data, so they stay out of
// export/import backups and need no schema version. A default is never written back, so
// a fresh mount leaves localStorage untouched. Codecs live at module level so their
// identity is stable (see useStoredValue).
export const STRICT_MODE_KEY = 'interview-prep:strict-mode';
export const SHORTCUTS_KEY = 'interview-prep:shortcuts';
export const LOOP_DATE_KEY = 'interview-prep:loop-date';
export const ROLE_KEY = 'interview-prep:role';

const decodeStrict = (raw: string | null): boolean => raw === '1';
const encodeStrict = (v: boolean): string | null => (v ? '1' : null);
export const useStrictMode = () => useStoredValue(STRICT_MODE_KEY, decodeStrict, encodeStrict);

// Defaults ON — absent means enabled — because the shortcuts already exist and are the
// fastest way to drill. The stored value is the OFF marker, so turning them off is what
// gets written. Its reason for existing is WCAG 2.2 SC 2.1.4: a shortcut bound to an
// unmodified character has to be switchable off, remappable, or focus-scoped, and
// Practice binds n/b/1/2/3 and Space on window.
const decodeShortcuts = (raw: string | null): boolean => raw !== '0';
const encodeShortcuts = (v: boolean): string | null => (v ? null : '0');
export const useShortcuts = () => useStoredValue(SHORTCUTS_KEY, decodeShortcuts, encodeShortcuts);

// Anything but a real YYYY-MM-DD reads as unset: a corrupt value showed "NaN days left".
const decodeLoopDate = (raw: string | null): string | null =>
  raw !== null && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw)) ? raw : null;
const encodeLoopDate = (v: string | null): string | null => v;
export const useLoopDate = () => useStoredValue(LOOP_DATE_KEY, decodeLoopDate, encodeLoopDate);

const isRoleId = (v: string): v is RoleId => (ROLE_IDS as readonly string[]).includes(v);
const decodeRole = (raw: string | null): RoleId => (raw !== null && isRoleId(raw) ? raw : DEFAULT_ROLE);
const encodeRole = (v: RoleId): string | null => (v === DEFAULT_ROLE ? null : v);
export const useRole = () => useStoredValue(ROLE_KEY, decodeRole, encodeRole);
