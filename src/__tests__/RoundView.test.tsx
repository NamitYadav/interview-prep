import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { questionsByRound, rounds } from '../data';
import { RoundView } from '../components/RoundView';

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <RoundView roundId="hr" state={state} dispatch={dispatch} strictMode={false} />;
}

const hrRound = rounds.find((r) => r.id === 'hr')!;
const hrCategories = [...new Set(questionsByRound('hr').map((q) => q.category))];
const [firstHrCategory] = hrCategories;
if (!firstHrCategory) throw new Error('HR round has no categories');

describe('RoundView', () => {
  test('shows the round title, blurb and a working back link', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { level: 1, name: hrRound.title })).toBeInTheDocument();
    expect(screen.getByText(hrRound.blurb)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /all rounds/i })).toHaveAttribute('href', '#');
  });

  const category = () => screen.getByRole('combobox', { name: /category/i });

  test('category filter narrows the Browse list to that category only', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('tab', { name: /browse/i }));
    const targetCategory = firstHrCategory;

    await userEvent.selectOptions(category(), targetCategory);
    expect(category()).toHaveValue(targetCategory);

    for (const row of screen.getAllByRole('button', { name: /\?/ })) {
      expect(within(row).getByText(targetCategory)).toBeInTheDocument();
    }
  });

  test('all categories is the default and restores the full list', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('tab', { name: /browse/i }));
    expect(category()).toHaveValue('');

    await userEvent.selectOptions(category(), firstHrCategory);
    expect(category()).toHaveValue(firstHrCategory);

    await userEvent.selectOptions(category(), '');
    expect(screen.getByText(new RegExp(`of ${questionsByRound('hr').length}$`))).toBeInTheDocument();
  });

  test('choosing a second category replaces the first', async () => {
    const [first, second] = hrCategories;
    if (!first || !second) throw new Error('HR round needs at least two categories');
    render(<Harness />);
    await userEvent.click(screen.getByRole('tab', { name: /browse/i }));

    await userEvent.selectOptions(category(), first);
    await userEvent.selectOptions(category(), second);
    expect(category()).toHaveValue(second);

    const expected = questionsByRound('hr').filter((q) => q.category === second).length;
    expect(screen.getByText(new RegExp(`^${expected} of `))).toBeInTheDocument();
  });

  test('switching tabs swaps Practice for Browse', async () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /browse/i }));
    expect(screen.getByPlaceholderText(/search questions/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument();
  });

  test('the design round gets a third "45-min prompt" tab; other rounds do not', () => {
    render(<Harness />); // hr round
    expect(screen.queryByRole('tab', { name: /45-min prompt/i })).not.toBeInTheDocument();

    function DesignHarness() {
      const [state, dispatch] = useReducer(reducer, EMPTY);
      return <RoundView roundId="design" state={state} dispatch={dispatch} strictMode={false} />;
    }
    render(<DesignHarness />);
    expect(screen.getByRole('tab', { name: /45-min prompt/i })).toBeInTheDocument();
  });

  test('an unknown round id renders a not-found message instead of throwing', () => {
    function BadHarness() {
      const [state, dispatch] = useReducer(reducer, EMPTY);
      // @ts-expect-error deliberately invalid RoundId to exercise the guard
      return <RoundView roundId="not-a-round" state={state} dispatch={dispatch} strictMode={false} />;
    }
    render(<BadHarness />);
    expect(screen.getByText(/round not found/i)).toBeInTheDocument();
  });
});
