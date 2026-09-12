import { useEffect, useRef } from 'react';
import { ROUND_IDS } from './data';
import type { Route, RoundId } from './types';
import { useAppState } from './hooks/useAppState';
import { useHashRoute } from './hooks/useHashRoute';
import { useStrictMode } from './hooks/useStrictMode';
import { Home } from './components/Home';
import { RoundView } from './components/RoundView';
import { WeakDrill } from './components/WeakDrill';
import { NotesView } from './components/NotesView';
import { StoriesView } from './components/StoriesView';
import { MockSession } from './components/MockSession';
import { SearchView } from './components/SearchView';
import { PrintView } from './components/PrintView';
import { ThemeToggle } from './components/ThemeToggle';

const isRoundId = (r: Route): r is RoundId => (ROUND_IDS as readonly string[]).includes(r);

export default function App() {
  const { state, dispatch, saveFailed, staleTab, dismissStaleTab } = useAppState();
  const route = useHashRoute();
  const [strictMode, setStrictMode] = useStrictMode();

  // Move focus to the new view's heading after a route change — but not on first
  // load, where the page itself already has the user's attention and stealing
  // focus would be more surprising than helpful.
  const isFirstRoute = useRef(true);
  useEffect(() => {
    if (isFirstRoute.current) {
      isFirstRoute.current = false;
      return;
    }
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [route]);

  return (
    <>
      {saveFailed && (
        <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          Progress is not being saved (storage unavailable). Export before closing the tab.
        </div>
      )}
      {staleTab && !saveFailed && (
        <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          Another tab changed your progress. Reload to see it — saving from here will overwrite that change.{' '}
          <button type="button" onClick={() => window.location.reload()} className="underline underline-offset-2">
            Reload
          </button>{' '}
          <button type="button" onClick={dismissStaleTab} className="underline underline-offset-2">
            Dismiss
          </button>
        </div>
      )}
      <header className="mx-auto flex max-w-3xl items-center justify-end gap-2 px-4 pt-4 sm:px-6">
        <button
          type="button"
          onClick={() => setStrictMode(!strictMode)}
          aria-pressed={strictMode}
          className={`rounded border px-2 py-1 text-xs ${
            strictMode
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-zinc-300 text-zinc-500 hover:border-emerald-500 dark:border-zinc-700 dark:text-zinc-400'
          }`}
        >
          Strict mode
        </button>
        <ThemeToggle />
      </header>
      {route === null && <Home state={state} dispatch={dispatch} />}
      {route === 'weak' && <WeakDrill state={state} dispatch={dispatch} strictMode={strictMode} />}
      {route === 'notes' && <NotesView state={state} />}
      {route === 'stories' && <StoriesView state={state} dispatch={dispatch} />}
      {route === 'mock' && <MockSession state={state} dispatch={dispatch} strictMode={strictMode} />}
      {route === 'search' && <SearchView state={state} dispatch={dispatch} />}
      {route === 'print' && <PrintView state={state} />}
      {route !== null && isRoundId(route) && (
        <RoundView key={route} roundId={route} state={state} dispatch={dispatch} strictMode={strictMode} />
      )}
    </>
  );
}
