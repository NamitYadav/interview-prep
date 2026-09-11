import { useEffect, useState } from 'react';

// Per-device preference, same shape as useStrictMode: not prep data, so it stays
// out of export/import backups and needs no schema version.
export const LOOP_DATE_KEY = 'interview-prep:loop-date';

const readLoopDate = (): string | null => {
  try {
    return localStorage.getItem(LOOP_DATE_KEY);
  } catch {
    return null;
  }
};

export function useLoopDate(): [string | null, (v: string | null) => void] {
  const [loopDate, setLoopDate] = useState<string | null>(readLoopDate);

  useEffect(() => {
    try {
      if (loopDate) localStorage.setItem(LOOP_DATE_KEY, loopDate);
      else localStorage.removeItem(LOOP_DATE_KEY);
    } catch { /* empty */ }
  }, [loopDate]);

  return [loopDate, setLoopDate];
}
