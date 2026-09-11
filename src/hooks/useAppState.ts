import { useEffect, useReducer, useRef, useState } from 'react';
import type { Persisted, Rating } from '../types';
import { emptyState, load, save } from '../lib/storage';
import { DEFAULT_EASE_FACTOR, nextDueAt, nextInterval } from '../lib/queue';

export type Action =
  | { type: 'rate'; id: string; rating: Rating; now: number }
  | { type: 'note'; id: string; text: string }
  | { type: 'saveStory'; id: string; title: string; body: string }
  | { type: 'rehearseStory'; id: string; now: number }
  | { type: 'deleteStory'; id: string }
  | { type: 'import'; data: Persisted }
  | { type: 'reset' };

export function reducer(state: Persisted, action: Action): Persisted {
  switch (action.type) {
    case 'rate': {
      const prev = state.progress[action.id];
      const { interval, easeFactor } = nextInterval(
        action.rating,
        prev?.interval ?? 0,
        prev?.easeFactor ?? DEFAULT_EASE_FACTOR,
      );
      return {
        ...state,
        progress: {
          ...state.progress,
          [action.id]: {
            rating: action.rating,
            seen: (prev?.seen ?? 0) + 1,
            lastSeen: action.now,
            dueAt: nextDueAt(action.now, interval),
            interval,
            easeFactor,
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
      // Unlike notes, a story never auto-deletes on going blank — it is a first-class
      // item the user creates and removes explicitly via 'deleteStory'.
      const existing = state.stories[action.id];
      return {
        ...state,
        stories: { ...state.stories, [action.id]: { ...existing, title: action.title, body: action.body } },
      };
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

  return { state, dispatch, saveFailed };
}
