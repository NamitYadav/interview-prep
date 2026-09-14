import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { forRole, rounds } from '../data';
const questionsByRound = forRole('staff').byRound;
import { RoundView } from '../components/RoundView';

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <RoundView roundId="hr" state={state} dispatch={dispatch} strictMode={false} role="staff" />;
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

  // At 375px the third tab of the design round wrapped to two lines and the select
  // was squeezed to "All ca". jsdom has no layout, so this pins the classes that let
  // the select drop to its own line instead of sharing the tabs' row.
  test('the tabs and the category filter can wrap onto two lines', () => {
    render(<Harness />);
    const row = screen.getByRole('tablist').parentElement!;
    expect(row).toHaveClass('flex-wrap');
    expect(category().className).not.toMatch(/max-w-/);
  });

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

  test('the by-category panel covers every category in the round, filter or not', async () => {
    render(<Harness />);
    const panel = screen.getByText('By category').closest('details')!;
    for (const c of hrCategories) expect(within(panel).getByText(c)).toBeInTheDocument();

    // Filtering the drill must not shrink the overview — it is what you consult to
    // decide which category to filter to next.
    await userEvent.selectOptions(category(), firstHrCategory);
    expect(within(panel).getAllByRole('listitem')).toHaveLength(hrCategories.length);
  });

  test('clicking a category row filters the drill and moves the select with it', async () => {
    render(<Harness />);
    const panel = screen.getByText('By category').closest('details')!;
    await userEvent.click(within(panel).getByRole('button', { name: new RegExp(`^${firstHrCategory}:`) }));

    expect(category()).toHaveValue(firstHrCategory);

    await userEvent.click(screen.getByRole('tab', { name: /browse/i }));
    const expected = questionsByRound('hr').filter((q) => q.category === firstHrCategory).length;
    expect(screen.getByText(new RegExp(`^${expected} of `))).toBeInTheDocument();
  });

  const statusFilter = () => screen.getByRole('combobox', { name: /status/i });

  test('the Unseen filter leaves only questions you have not rated', async () => {
    render(<Harness />);
    // Rate the first question in the practice queue, then filter to Unseen.
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    const rated = screen.getByRole('heading', { level: 2 }).textContent;
    await userEvent.click(screen.getByRole('radio', { name: /solid/i }));

    await userEvent.selectOptions(statusFilter(), 'unseen');
    await userEvent.click(screen.getByRole('tab', { name: /browse/i }));

    const total = questionsByRound('hr').length;
    expect(screen.getByText(`${total - 1} of ${total - 1}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: rated! })).not.toBeInTheDocument();
  });

  // The set is frozen when you pick the filter: recomputing it per rating would drop the
  // question Practice is showing out of its own queue and flash the empty state.
  test('rating inside the Unseen drill advances instead of emptying the filter', async () => {
    render(<Harness />);
    await userEvent.selectOptions(statusFilter(), 'unseen');

    const first = screen.getByRole('heading', { level: 2 }).textContent;
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /solid/i }));

    expect(screen.queryByText(/no questions match/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(first);
  });

  test('a status with nothing in it shows the empty state', async () => {
    render(<Harness />);
    await userEvent.selectOptions(statusFilter(), 'weak');
    expect(screen.getByText(/no questions match/i)).toBeInTheDocument();
  });

  test('the progress bar keeps describing the whole category, not the status slice', async () => {
    render(<Harness />);
    const total = questionsByRound('hr').length;
    await userEvent.selectOptions(statusFilter(), 'unseen');
    expect(screen.getByText(`${total} unseen`)).toBeInTheDocument();
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
      return <RoundView roundId="design" state={state} dispatch={dispatch} strictMode={false} role="staff" />;
    }
    render(<DesignHarness />);
    expect(screen.getByRole('tab', { name: /45-min prompt/i })).toBeInTheDocument();
  });

  test('an unknown round id renders a not-found message instead of throwing', () => {
    function BadHarness() {
      const [state, dispatch] = useReducer(reducer, EMPTY);
      // @ts-expect-error deliberately invalid RoundId to exercise the guard
      return <RoundView roundId="not-a-round" state={state} dispatch={dispatch} strictMode={false} role="staff" />;
    }
    render(<BadHarness />);
    expect(screen.getByText(/round not found/i)).toBeInTheDocument();
  });
});
