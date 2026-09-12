// A JSON object in localStorage, keyed by an arbitrary string, backing the laps,
// baselines and drafts stores — each is read-all/validate-per-entry/write-all/evict,
// differing only in what an entry looks like and whether it's capped. One corrupt or
// unrecognized entry drops just that entry, not the whole store; a store the caller
// never opts into capping (`options.max` unset) never evicts anything.
export interface KeyedStore<T> {
  read(key: string): T | undefined;
  /** Returns false if the write could not be stored (quota exceeded, storage
   *  unavailable), so a caller that needs to tell the user can. */
  write(key: string, value: T): boolean;
  remove(key: string): void;
  clear(): void;
}

export function keyedStore<T>(
  storageKey: string,
  // Takes the entry's own key too: a lap's parser folds it back into the parsed
  // object (SavedLap.key), which a same-shaped-for-every-entry store like drafts or
  // baselines has no use for and simply ignores.
  parseEntry: (key: string, value: unknown) => T | undefined,
  options: { max?: number; recencyOf?: (v: T) => number } = {},
): KeyedStore<T> {
  const readAll = (): Record<string, T> => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return {};
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
      const out: Record<string, T> = {};
      for (const [k, v] of Object.entries(parsed)) {
        const entry = parseEntry(k, v);
        if (entry !== undefined) out[k] = entry;
      }
      return out;
    } catch {
      return {};
    }
  };

  return {
    read: (key) => readAll()[key],

    write(key, value) {
      try {
        const all = { ...readAll(), [key]: value };
        const kept = options.max !== undefined && options.recencyOf
          ? Object.fromEntries(
              Object.entries(all)
                .sort((a, b) => options.recencyOf!(b[1]) - options.recencyOf!(a[1]))
                .slice(0, options.max),
            )
          : all;
        localStorage.setItem(storageKey, JSON.stringify(kept));
        return true;
      } catch {
        return false;
      }
    },

    remove(key) {
      try {
        const all = readAll();
        if (!(key in all)) return;
        delete all[key];
        localStorage.setItem(storageKey, JSON.stringify(all));
      } catch {
        /* empty */
      }
    },

    clear() {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* empty */
      }
    },
  };
}
