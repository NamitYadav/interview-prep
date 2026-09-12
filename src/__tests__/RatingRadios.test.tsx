import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Rating } from '../types';
import { RatingRadios } from '../components/RatingRadios';

// A radiogroup that announces "radio, 1 of 3" and then ignores every arrow key is a
// dead end: the only ways left to rate are a mouse click and the number shortcuts,
// which exist only inside Practice and are announced nowhere.
function Harness({ initial }: { initial?: Rating }) {
  const [rating, setRating] = useState<Rating | undefined>(initial);
  return <RatingRadios rating={rating} onRate={setRating} />;
}

const radios = () => screen.getAllByRole('radio');

describe('RatingRadios keyboard operation', () => {
  test('the group is one tab stop: the first radio when nothing is checked', async () => {
    render(<Harness />);
    expect(radios().map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    await userEvent.tab();
    expect(radios()[0]).toHaveFocus();
  });

  test('the checked radio is the one tab stop once something is checked', () => {
    render(<Harness initial={3} />);
    expect(radios().map((r) => r.tabIndex)).toEqual([-1, -1, 0]);
  });

  // Arrows move focus WITHOUT selecting. APG's default is selection-follows-focus, but
  // it allows this variant when selection has significant consequences — and rating
  // advances to the next question and unmounts this group, so selection-follows-focus
  // meant one arrow press rated the card and moved on. A screen-reader user could never
  // hear "OK" or "Solid" without committing to one of them.
  test('ArrowRight moves focus without selecting', async () => {
    render(<Harness />);
    radios()[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(radios()[1]).toHaveFocus();
    expect(radios()[1]).not.toBeChecked();
    expect(radios()[0]).not.toBeChecked();
  });

  test('Space commits the focused option', async () => {
    render(<Harness />);
    radios()[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(radios()[1]).not.toBeChecked();
    await userEvent.keyboard(' ');
    expect(radios()[1]).toBeChecked();
  });

  test('Enter commits the focused option', async () => {
    render(<Harness />);
    radios()[0]!.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await userEvent.keyboard('{Enter}');
    expect(radios()[2]).toBeChecked();
  });

  test('ArrowDown behaves like ArrowRight and ArrowUp like ArrowLeft', async () => {
    render(<Harness />);
    radios()[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(radios()[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(radios()[0]).toHaveFocus();
  });

  test('ArrowLeft from the first radio wraps to the last', async () => {
    render(<Harness />);
    radios()[0]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(radios()[2]).toHaveFocus();
    expect(radios()[2]).not.toBeChecked();
  });

  test('Home and End move focus to the ends', async () => {
    render(<Harness initial={2} />);
    radios()[1]!.focus();
    await userEvent.keyboard('{End}');
    expect(radios()[2]).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(radios()[0]).toHaveFocus();
    // The checked option is unchanged by navigation alone.
    expect(radios()[1]).toBeChecked();
  });

  // Focus must not be stranded on an option the user navigated past: the group keeps
  // exactly one tab stop, and after arrowing it is the focused option, not the checked one.
  test('the group still has exactly one tab stop after arrowing', async () => {
    render(<Harness initial={1} />);
    radios()[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(radios().filter((r) => r.tabIndex === 0)).toHaveLength(1);
    expect(radios()[1]!.tabIndex).toBe(0);
  });

  test('arrow keys inside the group are not left to scroll the page', async () => {
    const onRate = vi.fn();
    render(<RatingRadios rating={undefined} onRate={onRate} />);
    const first = radios()[0]!;
    first.focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    first.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
