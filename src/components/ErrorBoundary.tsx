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
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Export your data from the home screen if you can, then reload the page.
          </p>
        </main>
      );
    }
    return this.props.children;
  }
}
