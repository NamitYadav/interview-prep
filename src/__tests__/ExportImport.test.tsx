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
    localStorage.clear();
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

  // reset() returns emptyState(), which clears stories as well — but the confirm used
  // to mention only ratings and notes, so clearing ratings to start a fresh drilling
  // cycle silently destroyed every STAR story the user had written.
  test('the reset confirm names stories, which it also deletes', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const withStories: Persisted = {
      ...seeded,
      stories: { s1: { title: 'Migration', body: '...' }, s2: { title: 'Mentoring', body: '...' } },
    };
    render(<Harness initial={withStories} />);
    await userEvent.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(confirmSpy.mock.calls[0]?.[0]).toMatch(/stories/i);
    expect(confirmSpy.mock.calls[0]?.[0]).toMatch(/1 rating, 1 note and 2 stories/);
  });

  test('the reset confirm reads naturally at one and at none', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const one: Persisted = { ...seeded, stories: { s1: { title: 'Migration', body: '...' } } };
    const { unmount } = render(<Harness initial={one} />);
    await userEvent.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(confirmSpy.mock.calls[0]?.[0]).toMatch(/1 rating, 1 note and 1 story\b/);
    unmount();

    render(<Harness initial={{ version: 2, progress: {}, notes: {}, stories: {} }} />);
    await userEvent.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(confirmSpy.mock.calls[1]?.[0]).toMatch(/0 ratings, 0 notes and 0 stories/);
  });

  // Reset cleared interview-prep:v1 and nothing else, so the user carried on mid-lap
  // through a set where nothing was rated any more, with the last session's code still
  // sitting in the scratch editor.
  test('reset clears laps and drafts too, and says it will', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem('interview-prep:laps', JSON.stringify({ k: { history: ['a'], historyPos: 0, requeued: [], step: 3, savedAt: 1 } }));
    localStorage.setItem('interview-prep:drafts', JSON.stringify({ 'coding-001:scratch': { text: 'old code', savedAt: 1 } }));
    render(<Harness initial={seeded} />);
    await userEvent.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(confirmSpy.mock.calls[0]?.[0]).toMatch(/place in every drill|scratch/i);
    expect(localStorage.getItem('interview-prep:laps')).toBeNull();
    expect(localStorage.getItem('interview-prep:drafts')).toBeNull();
  });

  test('a declined reset leaves laps and drafts alone', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    localStorage.setItem('interview-prep:laps', JSON.stringify({ k: {} }));
    render(<Harness initial={seeded} />);
    await userEvent.click(screen.getByRole('button', { name: /reset progress/i }));
    expect(localStorage.getItem('interview-prep:laps')).not.toBeNull();
  });

  // A restored lap points at a position in the data that was just replaced.
  test('a successful import clears laps and drafts', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem('interview-prep:laps', JSON.stringify({ k: { history: ['a'], historyPos: 0, requeued: [], step: 3, savedAt: 1 } }));
    localStorage.setItem('interview-prep:drafts', JSON.stringify({ 'coding-001:scratch': { text: 'old code', savedAt: 1 } }));
    render(<Harness initial={seeded} />);
    await userEvent.upload(
      screen.getByLabelText(/import backup file/i),
      file(JSON.stringify({ version: 1, progress: {}, notes: { 'hm-001': 'restored' } })),
    );
    expect(screen.getByTestId('notes')).toHaveTextContent('restored');
    expect(localStorage.getItem('interview-prep:laps')).toBeNull();
    expect(localStorage.getItem('interview-prep:drafts')).toBeNull();
  });

  test('a failed import leaves laps and drafts alone', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem('interview-prep:laps', JSON.stringify({ k: {} }));
    render(<Harness initial={seeded} />);
    await userEvent.upload(screen.getByLabelText(/import backup file/i), file('not json'));
    expect(localStorage.getItem('interview-prep:laps')).not.toBeNull();
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
