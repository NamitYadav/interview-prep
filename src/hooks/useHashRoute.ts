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
  if (typeof document.startViewTransition !== 'function') {
    update();
    return;
  }
  const transition = document.startViewTransition(() => flushSync(update));
  // `ready` rejects whenever the transition is aborted — a second navigation starting
  // before this one settles, or a document that cannot transition — and every hash
  // navigation was logging that rejection as uncaught. Only the animation is lost:
  // the update callback still runs, so the route change and the scroll are not at
  // stake, and there is nothing here to report to the user.
  transition.ready.catch(() => {});
};

export function useHashRoute(): Route | null {
  const [route, setRoute] = useState<Route | null>(fromHash);

  useEffect(() => {
    const onChange = () => {
      // Scroll inside the transition callback so it lands in the same flushSync as
      // the route change, before the transition snapshots the old page — outside it,
      // the outgoing view jumps to the top a frame before the cross-fade starts.
      withViewTransition(() => {
        setRoute(fromHash());
        window.scrollTo(0, 0);
      });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
