import { useEffect, useState } from 'react';

// Per-device preference, same shape as useTheme: not prep data, so it stays out of
// export/import backups and needs no schema version.
export const STRICT_MODE_KEY = 'interview-prep:strict-mode';

const readStrictMode = (): boolean => {
  try {
    return localStorage.getItem(STRICT_MODE_KEY) === '1';
  } catch {
    return false;
  }
};

export function useStrictMode(): [boolean, (v: boolean) => void] {
  const [strict, setStrict] = useState<boolean>(readStrictMode);

  useEffect(() => {
    try {
      if (strict) localStorage.setItem(STRICT_MODE_KEY, '1');
      else localStorage.removeItem(STRICT_MODE_KEY);
    } catch { /* empty */ }
  }, [strict]);

  return [strict, setStrict];
}
