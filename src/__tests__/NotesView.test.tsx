import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Persisted } from '../types';
import { EMPTY } from '../lib/storage';
import { NotesView } from '../components/NotesView';

const withNotes = (notes: Record<string, string>): Persisted => ({ ...EMPTY, notes });

describe('NotesView', () => {
  test('shows an empty state when no notes exist', () => {
    render(<NotesView state={EMPTY} />);
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
  });

  test('lists each noted question with its round and note text', () => {
    render(<NotesView state={withNotes({ 'hr-001': 'My relocation story.' })} />);
    expect(screen.getByText('1 noted')).toBeInTheDocument();
    expect(screen.getByText('My relocation story.')).toBeInTheDocument();
    expect(screen.getByText('hr-001')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'HR screen' })).toHaveAttribute('href', '#hr');
  });

  test('ignores blank notes and notes for questions not in the bank', () => {
    render(<NotesView state={withNotes({ 'hr-001': '   ', 'gone-999': 'orphan' })} />);
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument();
    expect(screen.queryByText('orphan')).not.toBeInTheDocument();
  });
});
