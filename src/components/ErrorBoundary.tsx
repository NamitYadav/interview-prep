import { Component, type ErrorInfo, type ReactNode } from 'react';

const CLEAR_CONFIRM =
  'Delete every rating, note and story saved in this browser? This cannot be undone — there is no copy but your exported backup.';

// The tree that owned the hash listener is gone and `hasError` never resets, so a link
// to the home route did nothing at all. Navigating has to take the reload with it.
const goHome = () => {
  window.location.hash = '';
  window.location.reload();
};

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-md p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold">Something broke</h1>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Reload, or go back to the home screen and export your data from there.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => location.reload()}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={goHome}
              className="rounded border border-zinc-300 px-4 py-2 text-sm hover:border-emerald-500 dark:border-zinc-700"
            >
              ← All rounds
            </button>
          </div>
          {/* If the throw came from saved state, reloading just throws again: without
              this the only way out was clearing storage from the browser's own UI. Kept
              plainly destructive and plainly not the way out you try first. */}
          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
            Still broken after a reload? The saved data itself may be the problem.
          </p>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(CLEAR_CONFIRM)) return;
              try {
                localStorage.clear();
              } catch {
                /* nothing else to do — the reload below is still the best move */
              }
              goHome();
            }}
            className="mt-2 text-xs text-red-600 underline underline-offset-2 dark:text-red-400"
          >
            Delete all saved data and reload
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
