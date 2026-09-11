import { useCallback, useState } from 'react';
import { readDraft, writeDraft } from '../lib/drafts';
import { useDebouncedField } from './useDebouncedField';

// A text field whose contents survive a reload, keyed per question. Reuses
// useDebouncedField so typing stays local and the write lands 300ms after the last
// keystroke, on blur, or on unmount — the same contract notes already have.
//
// The stored value is read ONCE, at mount. Callers must therefore remount when `key`
// changes — QuestionCard is keyed by question id and DesignPrompt by id+attempt, so
// both already do. Passing a changing key to a mounted instance would show the old
// draft and then commit it under the new key, so that is asserted rather than
// silently tolerated.
export function useDraft(key: string, fallback = '') {
  const [stored] = useState(() => readDraft(key) ?? fallback);
  const [mountKey] = useState(key);
  if (mountKey !== key) {
    throw new Error(`useDraft: key changed from "${mountKey}" to "${key}" without a remount — key the component instead.`);
  }
  const commit = useCallback((text: string) => writeDraft(key, text), [key]);
  return useDebouncedField(stored, commit);
}
