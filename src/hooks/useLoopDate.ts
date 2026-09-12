import { useStoredValue } from './useStoredValue';

// Per-device preference, same shape as useStrictMode: not prep data, so it stays
// out of export/import backups and needs no schema version.
export const LOOP_DATE_KEY = 'interview-prep:loop-date';

const decode = (raw: string | null): string | null => raw;
const encode = (v: string | null): string | null => v;

export function useLoopDate(): [string | null, (v: string | null) => void] {
  return useStoredValue(LOOP_DATE_KEY, decode, encode);
}
