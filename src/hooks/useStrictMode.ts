import { useStoredValue } from './useStoredValue';

// Per-device preference, same shape as useTheme: not prep data, so it stays out of
// export/import backups and needs no schema version.
export const STRICT_MODE_KEY = 'interview-prep:strict-mode';

const decode = (raw: string | null): boolean => raw === '1';
const encode = (v: boolean): string | null => (v ? '1' : null);

export function useStrictMode(): [boolean, (v: boolean) => void] {
  return useStoredValue(STRICT_MODE_KEY, decode, encode);
}
