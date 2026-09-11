import { useCallback, useState } from 'react';
import { readDraft, writeDraft } from '../lib/drafts';
import { useDebouncedField } from './useDebouncedField';

// A text field whose contents survive a reload, keyed per question. Reuses
// useDebouncedField so typing stays local and the write lands 300ms after the last
// keystroke, on blur, or on unmount — the same contract notes already have.
export function useDraft(key: string, fallback = '') {
  const [stored] = useState(() => readDraft(key) ?? fallback);
  const commit = useCallback((text: string) => writeDraft(key, text), [key]);
  return useDebouncedField(stored, commit);
}
