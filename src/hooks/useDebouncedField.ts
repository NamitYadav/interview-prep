import { useEffect, useRef, useState } from 'react';

// Local draft state for a text field backed by a debounced dispatch: typing feels
// instant (no re-render round trip through the reducer on every keystroke), the
// commit lands 300ms after the last keystroke, and blur flushes immediately so
// nothing is lost if the user tabs away mid-debounce.
export function useDebouncedField(value: string, onCommit: (v: string) => void, delayMs = 300) {
  const [draft, setDraft] = useState(value);
  const lastCommitted = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The prop changed from outside (a different item selected) rather than as an
  // echo of our own commit — resync the draft to it.
  useEffect(() => {
    if (value !== lastCommitted.current) {
      setDraft(value);
      lastCommitted.current = value;
    }
  }, [value]);

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
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
