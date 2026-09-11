import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useReducer } from 'react';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { questions } from '../data';
import { SearchView } from '../components/SearchView';

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <SearchView state={state} dispatch={dispatch} />;
}

describe('SearchView', () => {
  test('starts with every question from every round in scope', () => {
    render(<Harness />);
    expect(screen.getByText(new RegExp(`of ${questions.length}$`))).toBeInTheDocument();
  });
});
