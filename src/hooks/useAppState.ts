import { useEffect, useReducer, useState } from 'react';
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

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, () => load());
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    // save() is a synchronous write to localStorage (the external system); saveFailed
    // is derived from its result and can't be computed during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaveFailed(!save(state));
  }, [state]);

  return { state, dispatch, saveFailed };
}
