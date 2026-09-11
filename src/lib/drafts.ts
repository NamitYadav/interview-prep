// Work you do against a question during a drill — code typed into a scratch editor, a
// 45-minute design write-up. Kept per-device and OUT of backups, same as the theme and
// strict-mode preferences: it is working scratch, not prep data worth carrying between
// machines, and putting it in `state.notes` would pollute the user-facing Notes list.
const KEY = 'interview-prep:drafts';

type Drafts = Record<string, string>;

const read = (): Drafts => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'string')) as Drafts;
  } catch {
    return {};
  }
};

export const draftKey = (questionId: string, field: string) => `${questionId}:${field}`;

export const readDraft = (key: string): string | undefined => read()[key];

export function writeDraft(key: string, value: string): void {
  try {
    const all = read();
    // An empty draft is stored, not deleted: the scratch editor starts pre-filled with
    // the question's code, so treating "" as absent meant deliberately clearing it
    // brought the starter text straight back on the next remount.
    all[key] = value;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage unavailable — drafts just won't survive a reload */ }
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
