import { useStoredValue } from './useStoredValue';
import { DEFAULT_ROLE, ROLE_IDS } from '../data/roles';
import type { RoleId } from '../types';

// Per-device preference, same shape as useStrictMode: not prep data, so it stays out
// of export/import backups and needs no schema version.
export const ROLE_KEY = 'interview-prep:role';

const isRoleId = (v: string): v is RoleId => (ROLE_IDS as readonly string[]).includes(v);

const decode = (raw: string | null): RoleId => (raw !== null && isRoleId(raw) ? raw : DEFAULT_ROLE);
// Mirrors useStrictMode: the default role isn't written back, so a fresh mount
// leaves localStorage untouched rather than materializing "staff" into it.
const encode = (v: RoleId): string | null => (v === DEFAULT_ROLE ? null : v);

export function useRole(): [RoleId, (v: RoleId) => void] {
  return useStoredValue(ROLE_KEY, decode, encode);
}
