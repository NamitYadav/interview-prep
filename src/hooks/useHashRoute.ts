import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { ROUTES } from '../data';
import type { Route } from '../types';

const fromHash = (): Route | null => {
  const h = window.location.hash.replace(/^#/, '');
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : null;
};

// ponytail: View Transitions API, feature-detected, no polyfill. Unsupported browsers
// (and jsdom in tests) just apply the update directly with no animation.
// flushSync forces the state update to land before the transition snapshots the DOM —
// without it the callback returns before React re-renders, and nothing animates.
const withViewTransition = (update: () => void) => {
  if (typeof document.startViewTransition === 'function') document.startViewTransition(() => flushSync(update));
  else update();
};

export function useHashRoute(): Route | null {
  const [route, setRoute] = useState<Route | null>(fromHash);

  useEffect(() => {
    const onChange = () => {
      withViewTransition(() => setRoute(fromHash()));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
