import { useEffect, useRef } from 'react';
import { ROUND_IDS, rounds } from './data';
import type { Route, RoundId } from './types';
import { useAppState } from './hooks/useAppState';
import { useHashRoute } from './hooks/useHashRoute';
import { useStrictMode } from './hooks/useStrictMode';
import { useShortcuts } from './hooks/useShortcuts';
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

export const APP_NAME = 'Interview Prep';

const SAVE_FAILED_MESSAGE = 'Progress is not being saved (storage unavailable). Export before closing the tab.';
const STALE_TAB_MESSAGE = 'Another tab changed your progress. Reload to see it — saving from here will overwrite that change.';

const VIEW_TITLES: Record<Exclude<Route, RoundId>, string> = {
  weak: 'Weak drill', notes: 'Notes', stories: 'Stories',
  mock: 'Mock session', search: 'Search', print: 'Print',
};

// The tab, the history entry and the screen reader's announcement on navigation all
// read this — all thirteen routes used to call themselves "Interview Prep".
export const titleFor = (route: Route | null): string => {
  if (route === null) return APP_NAME;
  const view = isRoundId(route) ? rounds.find((r) => r.id === route)?.title : VIEW_TITLES[route];
  return view ? `${view} · ${APP_NAME}` : APP_NAME;
};

export default function App() {
  const { state, dispatch, saveFailed, staleTab, dismissStaleTab } = useAppState();
  const route = useHashRoute();
  const [strictMode, setStrictMode] = useStrictMode();
  const [shortcuts, setShortcuts] = useShortcuts();

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

  useEffect(() => {
    document.title = titleFor(route);
  }, [route]);

  // One region, mounted for the life of the app and empty until there is something to
  // say. A role="status" that appears with its text already inside is routinely missed:
  // the announcement depends on the text arriving after the region is being watched.
  const announcement = saveFailed ? SAVE_FAILED_MESSAGE : staleTab ? STALE_TAB_MESSAGE : '';

  return (
    <>
      <p role="status" className="sr-only">{announcement}</p>
      {saveFailed && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 print:hidden dark:bg-amber-900 dark:text-amber-100">
          {SAVE_FAILED_MESSAGE}
        </div>
      )}
      {staleTab && !saveFailed && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 print:hidden dark:bg-amber-900 dark:text-amber-100">
          {STALE_TAB_MESSAGE}{' '}
          <button type="button" onClick={() => window.location.reload()} className="underline underline-offset-2">
            Reload
          </button>{' '}
          <button type="button" onClick={dismissStaleTab} className="underline underline-offset-2">
            Dismiss
          </button>
        </div>
      )}
      <header className="mx-auto flex max-w-3xl items-center justify-end gap-2 px-4 pt-4 print:hidden sm:px-6">
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
        <button
          type="button"
          onClick={() => setShortcuts(!shortcuts)}
          aria-pressed={shortcuts}
          title="Single-key shortcuts in drills: Space, N, B and 1/2/3"
          className={`rounded border px-2 py-1 text-xs ${
            shortcuts
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-zinc-300 text-zinc-500 hover:border-emerald-500 dark:border-zinc-700 dark:text-zinc-400'
          }`}
        >
          Shortcuts
        </button>
        <ThemeToggle />
      </header>
      {route === null && <Home state={state} dispatch={dispatch} />}
      {route === 'weak' && <WeakDrill state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} />}
      {route === 'notes' && <NotesView state={state} />}
      {route === 'stories' && <StoriesView state={state} dispatch={dispatch} />}
      {route === 'mock' && <MockSession state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} />}
      {route === 'search' && <SearchView state={state} dispatch={dispatch} />}
      {route === 'print' && <PrintView state={state} />}
      {route !== null && isRoundId(route) && (
        <RoundView key={route} roundId={route} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} />
      )}
    </>
  );
}
