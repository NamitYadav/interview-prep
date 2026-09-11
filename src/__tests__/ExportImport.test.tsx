import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Persisted } from '../types';
import { reducer } from '../hooks/useAppState';
import { ExportImport, LAST_EXPORT_KEY } from '../components/ExportImport';

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

  test('export records a last-export timestamp', async () => {
    localStorage.removeItem(LAST_EXPORT_KEY);
    render(<Harness initial={seeded} />);
    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(localStorage.getItem(LAST_EXPORT_KEY)).not.toBeNull();
  });

  test('import replaces state and clears a prior error on success', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Harness initial={seeded} />);
    const input = screen.getByLabelText(/import backup file/i);
    await userEvent.upload(input, file('not json'));
    expect(screen.getByRole('alert')).toHaveTextContent(/not valid json/i);

    await userEvent.upload(
      input,
      file(JSON.stringify({ version: 1, progress: {}, notes: { 'hm-001': 'restored' } })),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('notes')).toHaveTextContent('restored');
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/imported 0 rated, 1 notes, 0 stories/i);
  });

  // Import wipes everything and cannot be undone, and it fires exactly when someone is
  // recovering after clearing browser data — declining must leave the current data alone.
  test('declining the import confirm leaves existing data untouched', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Harness initial={seeded} />);
    await userEvent.upload(
      screen.getByLabelText(/import backup file/i),
      file(JSON.stringify({ version: 1, progress: {}, notes: { 'hm-001': 'restored' } })),
    );
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('notes')).toHaveTextContent('my story');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('the confirm names what is being replaced and what replaces it', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Harness initial={seeded} />);
    await userEvent.upload(
      screen.getByLabelText(/import backup file/i),
      file(JSON.stringify({ version: 1, progress: {}, notes: { 'hm-001': 'restored' } })),
    );
    expect(confirmSpy.mock.calls[0]?.[0]).toMatch(/1 rated, 1 notes, 0 stories/);
    expect(confirmSpy.mock.calls[0]?.[0]).toMatch(/0 rated, 1 notes, 0 stories/);
  });

  test('a parse failure never prompts', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Harness initial={seeded} />);
    await userEvent.upload(screen.getByLabelText(/import backup file/i), file('not json'));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('notes')).toHaveTextContent('my story');
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
