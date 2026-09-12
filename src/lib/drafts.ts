// Work you do against a question during a drill — code typed into a scratch editor, a
// 45-minute design write-up. Kept per-device and OUT of backups, same as the theme and
// strict-mode preferences: it is working scratch, not prep data worth carrying between
// machines, and putting it in `state.notes` would pollute the user-facing Notes list.
const KEY = 'interview-prep:drafts';

// Drafts are by far the largest thing this app writes, they share the origin quota with
// progress, and DesignSession mints a new key for every restart — so unbounded growth
// eventually stops RATINGS from saving, not just scratch. Oldest-saved is evicted, the
// same bargain as MAX_LAPS.
const MAX_DRAFTS = 20;

interface Draft { text: string; savedAt: number }
type Drafts = Record<string, Draft>;

// Values used to be bare strings, before eviction needed a recency to sort on. Those
// still read — they just sort oldest, so they are the first to go.
const parseDraft = (v: unknown): Draft | undefined => {
  if (typeof v === 'string') return { text: v, savedAt: 0 };
  if (typeof v !== 'object' || v === null) return undefined;
  const d = v as { text?: unknown; savedAt?: unknown };
  if (typeof d.text !== 'string') return undefined;
  return { text: d.text, savedAt: typeof d.savedAt === 'number' ? d.savedAt : 0 };
};

const read = (): Drafts => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Drafts = {};
    for (const [k, v] of Object.entries(parsed)) {
      const draft = parseDraft(v);
      if (draft) out[k] = draft;
    }
    return out;
  } catch {
    return {};
  }
};

export const draftKey = (questionId: string, field: string) => `${questionId}:${field}`;

export const readDraft = (key: string): string | undefined => read()[key]?.text;

/** Returns false if the draft could not be stored, so the caller can say so. */
export function writeDraft(key: string, value: string, now: number = Date.now()): boolean {
  try {
    const all = read();
    // An empty draft is stored, not deleted: the scratch editor starts pre-filled with
    // the question's code, so treating "" as absent meant deliberately clearing it
    // brought the starter text straight back on the next remount.
    all[key] = { text: value, savedAt: now };
    const kept = Object.entries(all).sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, MAX_DRAFTS);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
    return true;
  } catch {
    // Quota exceeded, or storage unavailable. This used to be swallowed, so a
    // 45-minute design write-up could vanish on reload with nothing ever having
    // hinted it was not being kept.
    return false;
  }
}

// Drop a draft entirely, so the field falls back to its starter value again.
export function clearDraft(key: string): void {
  try {
    const all = read();
    if (!(key in all)) return;
    delete all[key];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* empty */ }
}

// Reset and Import both replace the whole data set; scratch written against the old
// one survives as stale code in the editor of a question you have never seen.
export function clearAllDrafts(): void {
  try {
    localStorage.removeItem(KEY);
  } catch { /* empty */ }
}
