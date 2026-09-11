import { Component, type ErrorInfo, type ReactNode } from 'react';

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
            Export your data from the home screen if you can, then reload the page.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => location.reload()}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Reload
            </button>
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid -- home is the empty hash route, this is real in-app navigation */}
            <a href="#" className="rounded border border-zinc-300 px-4 py-2 text-sm hover:border-emerald-500 dark:border-zinc-700">
              Home
            </a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
