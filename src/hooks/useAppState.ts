import { useEffect, useReducer, useRef, useState } from 'react';
import type { Persisted, Rating } from '../types';
import { STORAGE_KEY, emptyState, load, save } from '../lib/storage';

export type Action =
  | { type: 'rate'; id: string; rating: Rating; now: number }
  | { type: 'note'; id: string; text: string }
  | { type: 'createStory'; id: string }
  | { type: 'saveStory'; id: string; title?: string; body?: string }
  | { type: 'rehearseStory'; id: string; now: number }
  | { type: 'deleteStory'; id: string }
  | { type: 'import'; data: Persisted }
  | { type: 'reset' };

export function reducer(state: Persisted, action: Action): Persisted {
  switch (action.type) {
    case 'rate': {
      const prev = state.progress[action.id];
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.id]: {
            rating: action.rating,
            seen: (prev?.seen ?? 0) + 1,
            lastSeen: action.now,
          },
        },
      };
    }
    case 'note': {
      const notes = { ...state.notes };
      if (action.text.trim() === '') delete notes[action.id];
      else notes[action.id] = action.text;
      return { ...state, notes };
    }
    case 'saveStory': {
      // title/body are each optional and merged against the CURRENT stories[id] at
      // apply time — never reconstructed from a caller's own stale snapshot of the
      // other field — so two independently-debounced fields committing close together
      // can't have one silently revert the other.
      //
      // Merge-only, never create: useDebouncedField flushes on unmount, so a save that
      // lands after 'deleteStory' would otherwise resurrect the story with a blank
      // title. Creation is explicit, via 'createStory'.
      const existing = state.stories[action.id];
      if (!existing) return state;
      return {
        ...state,
        stories: {
          ...state.stories,
          [action.id]: {
            ...existing,
            ...(action.title !== undefined && { title: action.title }),
            ...(action.body !== undefined && { body: action.body }),
          },
        },
      };
    }
    case 'createStory': {
      if (state.stories[action.id]) return state;
      return { ...state, stories: { ...state.stories, [action.id]: { title: '', body: '' } } };
    }
    case 'rehearseStory': {
      const existing = state.stories[action.id];
      if (!existing) return state;
      return { ...state, stories: { ...state.stories, [action.id]: { ...existing, lastRehearsed: action.now } } };
    }
    case 'deleteStory': {
      const stories = { ...state.stories };
      delete stories[action.id];
      return { ...state, stories };
    }
    case 'import':
      return action.data;
    case 'reset':
      return emptyState();
  }
}

const SAVE_DEBOUNCE_MS = 500;

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, () => load());
  const [saveFailed, setSaveFailed] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // The pending timer is also tracked in a ref (not just returned from the effect's
  // own closure) so the flush below — fired from pagehide/visibilitychange/unmount,
  // none of which re-run this effect — can tell "there's an unsaved debounced write"
  // from "nothing changed since the last save" and skip a redundant write in the latter case.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setSaveFailed(!save(state));
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [state]);

  useEffect(() => {
    // Flushes a pending debounced write immediately — on tab close/hide (so closing
    // the tab mid-debounce never drops the last change), on backgrounding (pagehide
    // doesn't reliably fire when mobile OSes discard a backgrounded tab), and on
    // unmount (this effect's own cleanup, since its deps are `[]`).
    const flush = () => {
      if (timerRef.current === null) return;
      clearTimeout(timerRef.current);
      timerRef.current = null;
      setSaveFailed(!save(stateRef.current));
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
    };
  }, []);

  // Each tab writes the whole Persisted blob, so two tabs open across a study session
  // means the last debounced write wins and the other tab's ratings, notes and stories
  // are gone. Detect and surface it rather than merging: a real merge needs per-field
  // causality this app has no reason to carry, and silently clobbering is the bug.
  const [staleTab, setStaleTab] = useState(false);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      // key === null is a storage.clear() from another tab; newValue === null is a
      // removal. Both mean what we hold no longer matches what is on disk.
      if (e.key !== null && e.key !== STORAGE_KEY) return;
      setStaleTab(true);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { state, dispatch, saveFailed, staleTab };
}
