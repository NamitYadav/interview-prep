import { useCallback, useState } from 'react';
import { readDraft, writeDraft } from '../lib/drafts';
import { useDebouncedField } from './useDebouncedField';

// A text field whose contents survive a reload, keyed per question. Reuses
// useDebouncedField so typing stays local and the write lands 300ms after the last
// keystroke, on blur, or on unmount — the same contract notes already have.
//
// The stored value is read ONCE, at mount. Callers must therefore remount when `key`
// changes — QuestionCard is keyed by question id and DesignPrompt by id+attempt, so
// both already do.
export const DRAFT_SAVE_FAILED = 'Not saved — this browser’s storage is full. Copy this somewhere safe before leaving the page.';

export function useDraft(key: string, fallback = '') {
  const [stored] = useState(() => readDraft(key) ?? fallback);
  // A failed write is reported, not swallowed: this is the field someone spends 45
  // minutes in, and the failure mode was the whole thing gone on reload with no signal.
  const [saveFailed, setSaveFailed] = useState(false);
  const commit = useCallback((text: string) => setSaveFailed(!writeDraft(key, text)), [key]);
  return { ...useDebouncedField(stored, commit), saveFailed };
}
