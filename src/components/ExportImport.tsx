import { useRef, useState, type Dispatch } from 'react';
import type { Persisted } from '../types';
import type { Action } from '../hooks/useAppState';
import { backupFilename, parseBackup } from '../lib/storage';
import { clearAllLaps } from '../lib/lap';
import { clearAllDrafts } from '../lib/drafts';
import { panelButton, panelDangerButton } from './controlStyles';

export const LAST_EXPORT_KEY = 'interview-prep:last-export';

// Page scale: Export sits beside Home's heading, not inside the settings panel.
const pageButton = 'rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800';

// Split from its Import/Reset siblings by how often each is reached for: this one has a
// weekly nudge pointing at it, so it stays on the home screen. The other two are
// recovery and destruction, and live in Settings.
export function ExportButton({ state, onExport }: { state: Persisted; onExport?: () => void }) {
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename();
    a.click();
    // Safari can drop the download if the blob URL is revoked synchronously.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    try {
      localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
    } catch { /* storage unavailable — the export nudge just won't clear */ }
    onExport?.();
  };

  return <button type="button" className={pageButton} onClick={exportJson}>Export</button>;
}

export function ImportReset({ state, dispatch }: { state: Persisted; dispatch: Dispatch<Action> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  // Import replaces everything. It used to do that the instant a file was picked —
  // no confirm, no summary, no undo — while Reset, which destroys strictly less,
  // did confirm. This fires exactly when someone is recovering after clearing
  // browser data, so it states what is being traded before doing it.
  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = parseBackup(await file.text());
      setError(null);
      setImported(null);
      const summary = (p: Persisted) =>
        `${Object.keys(p.progress).length} rated, ${Object.keys(p.notes).length} notes, ${Object.keys(p.stories).length} stories`;
      if (!window.confirm(`Replace your current data (${summary(state)}) with this backup (${summary(data)})? This cannot be undone.`)) {
        return;
      }
      dispatch({ type: 'import', data });
      // Laps and drafts are position and scratch for the data that was just replaced.
      // Kept, they point into a set that no longer exists: the restored lap resumes
      // somebody else's session, and the scratch editor opens full of code written
      // against a question the imported data may not even contain.
      clearAllLaps();
      clearAllDrafts();
      setImported(summary(data));
    } catch (e) {
      setImported(null);
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const reset = () => {
    // Name everything this destroys. It wipes stories too — emptyState() clears all
    // three — and the old copy mentioned only ratings and notes, so someone clearing
    // ratings to start a fresh cycle lost every STAR story they had written.
    const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
    const counts = [
      plural(Object.keys(state.progress).length, 'rating', 'ratings'),
      plural(Object.keys(state.notes).length, 'note', 'notes'),
      plural(Object.keys(state.stories).length, 'story', 'stories'),
    ];
    // Laps and drafts are named too, and actually cleared. Clearing only the ratings
    // left the user resuming mid-lap through a set where nothing is rated any more,
    // with the last session's code still sitting in the scratch editor.
    if (window.confirm(`Delete all ${counts.slice(0, -1).join(', ')} and ${counts[counts.length - 1]}, plus your place in every drill and any scratch work? This cannot be undone — export first if you want a backup.`)) {
      dispatch({ type: 'reset' });
      clearAllLaps();
      clearAllDrafts();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={panelButton} onClick={() => fileRef.current?.click()}>Import</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Import backup file"
        onChange={(e) => void importJson(e.target.files?.[0])}
      />
      <button type="button" className={panelDangerButton} onClick={reset}>Reset progress</button>
      {imported && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">Imported {imported}.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
