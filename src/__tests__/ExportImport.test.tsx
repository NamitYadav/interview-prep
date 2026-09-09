import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Persisted } from '../types';
import { reducer } from '../hooks/useAppState';
import { ExportImport } from '../components/ExportImport';

const seeded: Persisted = {
  version: 2,
  progress: { 'hr-001': { rating: 3, seen: 1, lastSeen: 1 } },
  notes: { 'hr-001': 'my story' },
  stories: {},
};

function Harness({ initial }: { initial: Persisted }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return (
    <>
      <p data-testid="notes">{JSON.stringify(state.notes)}</p>
      <ExportImport state={state} dispatch={dispatch} />
    </>
  );
}

function file(contents: string, name = 'backup.json') {
  return new File([contents], name, { type: 'application/json' });
}

describe('ExportImport', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('export creates and clicks a download link for the current state', async () => {
    render(<Harness initial={seeded} />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  test('import replaces state and clears a prior error on success', async () => {
    render(<Harness initial={seeded} />);
    const input = screen.getByLabelText(/import backup file/i);
    await userEvent.upload(input, file('not json'));
    expect(screen.getByRole('alert')).toHaveTextContent(/not valid json/i);

    await userEvent.upload(
      input,
      file(JSON.stringify({ version: 1, progress: {}, notes: { 'hm-001': 'restored' } })),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('reset dispatches only after the confirm dialog is accepted', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Harness initial={seeded} />);

    await userEvent.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(screen.getByTestId('notes')).toHaveTextContent('my story');

    await userEvent.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('notes')).toHaveTextContent('{}');
  });
});
