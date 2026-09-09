import { useAppState } from './hooks/useAppState';
import { useHashRoute } from './hooks/useHashRoute';
import { Home } from './components/Home';
import { RoundView } from './components/RoundView';
import { WeakDrill } from './components/WeakDrill';
import { NotesView } from './components/NotesView';
import { StoriesView } from './components/StoriesView';
import { MockSession } from './components/MockSession';

export default function App() {
  const { state, dispatch, saveFailed } = useAppState();
  const [route] = useHashRoute();

  return (
    <>
      {saveFailed && (
        <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          Progress is not being saved (storage unavailable). Export before closing the tab.
        </div>
      )}
      {route === null && <Home state={state} dispatch={dispatch} />}
      {route === 'weak' && <WeakDrill state={state} dispatch={dispatch} />}
      {route === 'notes' && <NotesView state={state} />}
      {route === 'stories' && <StoriesView state={state} dispatch={dispatch} />}
      {route === 'mock' && <MockSession state={state} dispatch={dispatch} />}
      {route !== null && route !== 'weak' && route !== 'notes' && route !== 'stories' && route !== 'mock' && (
        <RoundView roundId={route} state={state} dispatch={dispatch} />
      )}
    </>
  );
}
