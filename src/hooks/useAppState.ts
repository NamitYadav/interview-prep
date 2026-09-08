import { useEffect, useReducer, useState } from 'react';
import type { Persisted, Rating } from '../types';
import { emptyState, load, save } from '../lib/storage';

export type Action =
  | { type: 'rate'; id: string; rating: Rating; now: number }
  | { type: 'note'; id: string; text: string }
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
          [action.id]: { rating: action.rating, seen: (prev?.seen ?? 0) + 1, lastSeen: action.now },
        },
      };
    }
    case 'note': {
      const notes = { ...state.notes };
      if (action.text.trim() === '') delete notes[action.id];
      else notes[action.id] = action.text;
      return { ...state, notes };
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
