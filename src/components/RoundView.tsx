import type { Dispatch } from 'react';
import type { Persisted, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';

export function RoundView({ roundId, onBack }: { roundId: RoundId; state: Persisted; dispatch: Dispatch<Action>; onBack: () => void }) {
  return (
    <main className="p-6">
      <button type="button" onClick={onBack}>← Home</button>
      <p>{roundId} (coming in Task 8)</p>
    </main>
  );
}
