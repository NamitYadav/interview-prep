import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { questions } from '../data';
import { roles } from '../data/roles';
import { SearchView } from '../components/SearchView';
import type { Persisted } from '../types';

function Harness({ initial = EMPTY }: { initial?: Persisted } = {}) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <SearchView state={state} dispatch={dispatch} role="staff" />;
}

// SearchView scopes to the harness's "staff" role, which does not include every round
// (e.g. it excludes the lead and architect rounds) — so the in-scope count is the
// staff role's own question count, not the global total across every role.
const staffRounds = roles.find((r) => r.id === 'staff')!.rounds;
const staffQuestions = questions.filter((q) => staffRounds.includes(q.round));

const [firstQuestion] = staffQuestions;
if (!firstQuestion) throw new Error('no questions');

describe('SearchView', () => {
  test('starts with every question from every round in scope', () => {
    render(<Harness />);
    expect(screen.getByText(new RegExp(`of ${staffQuestions.length}$`))).toBeInTheDocument();
  });

  test('the status filter narrows the search to unseen questions only', async () => {
    const rated: Persisted = {
      ...EMPTY,
      progress: { [firstQuestion.id]: { rating: 3, seen: 1, lastSeen: Date.now() } },
    };
    render(<Harness initial={rated} />);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /status/i }), 'unseen');
    expect(screen.getByText(`${staffQuestions.length - 1} of ${staffQuestions.length - 1}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(firstQuestion.question.slice(0, 30), 'i') })).not.toBeInTheDocument();
  });
});
