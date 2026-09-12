import { useEffect, useState } from 'react';

// Read-a-localStorage-preference-into-useState, then write it back on every change —
// four hooks (theme, strict mode, shortcuts, loop date) each did this by hand, only
// differing in how a raw string decodes to a value and back. `decode`/`encode` are
// expected to be stable, pure, module-level functions (each caller defines its own
// once, outside the hook body) — that is what lets the write effect depend on `encode`
// without re-running on every render.
//
// `decode(null)` is also the fallback when the read itself throws (storage blocked,
// private mode): each caller's decode already has to handle "nothing stored" as null,
// so reusing it for "couldn't read" needs no separate fallback value.
export function useStoredValue<T>(
  key: string,
  decode: (raw: string | null) => T,
  encode: (value: T) => string | null,
): [T, (value: T) => void] {
  const read = (): T => {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      raw = null;
    }
    return decode(raw);
  };
  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    try {
      const encoded = encode(value);
      if (encoded === null) localStorage.removeItem(key);
      else localStorage.setItem(key, encoded);
    } catch {
      /* storage unavailable — the preference just won't persist */
    }
  }, [key, value, encode]);

  return [value, setValue];
}
