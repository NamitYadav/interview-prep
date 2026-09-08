import { useRef, useState, type Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { backupFilename, parseBackup } from '../lib/storage';

export function ExportImport({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const exportJson = () => {
    setError(null);
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename();
    a.click();
    // Safari can drop the download if the blob URL is revoked synchronously.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      dispatch({ type: 'import', data: parseBackup(await file.text()) });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reset = () => {
    if (window.confirm('Delete all ratings and notes? Export first if you want a backup.')) {
      dispatch({ type: 'reset' });
    }
  };

  const btn = 'rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={btn} onClick={exportJson}>Export</button>
      <button type="button" className={btn} onClick={() => fileRef.current?.click()}>Import</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import backup file"
        onChange={(e) => void importJson(e.target.files?.[0])}
      />
      <button type="button" className={`${btn} text-red-600 dark:text-red-400`} onClick={reset}>Reset progress</button>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
