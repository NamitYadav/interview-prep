import { useEffect, useRef, useState } from 'react';

// Local draft state for a text field backed by a debounced dispatch: typing feels
// instant (no re-render round trip through the reducer on every keystroke), the
// commit lands 300ms after the last keystroke, blur flushes immediately so nothing
// is lost if the user tabs away mid-debounce, and unmount (switching questions
// remounts a fresh QuestionCard) flushes too, the same way useAppState's own
// debounced save flushes on pagehide/visibilitychange/unmount.
export function useDebouncedField(value: string, onCommit: (v: string) => void, delayMs = 300) {
  const [draft, setDraft] = useState(value);
  const lastCommitted = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest draft and onCommit in refs so the unmount-flush cleanup below — whose
  // effect has `[]` deps and so only ever sees its first render's closure — reads
  // the current values instead of stale ones from mount.
  const draftRef = useRef(draft);
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    draftRef.current = draft;
    onCommitRef.current = onCommit;
  });

  // The prop changed from outside (a different item selected) rather than as an
  // echo of our own commit — resync the draft to it.
  useEffect(() => {
    if (value !== lastCommitted.current) {
      setDraft(value);
      lastCommitted.current = value;
    }
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    onCommitRef.current(draftRef.current);
  }, []);

  const onChange = (text: string) => {
    setDraft(text);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      lastCommitted.current = text;
      onCommit(text);
    }, delayMs);
  };

  const onBlur = () => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    lastCommitted.current = draft;
    onCommit(draft);
  };

  return { draft, onChange, onBlur };
}
