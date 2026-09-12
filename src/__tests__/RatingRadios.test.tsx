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

  test('ArrowRight moves focus and selects', async () => {
    render(<Harness />);
    radios()[0]!.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(radios()[1]).toHaveFocus();
    expect(radios()[1]).toBeChecked();
    expect(radios()[0]).not.toBeChecked();
  });

  test('ArrowDown behaves like ArrowRight and ArrowUp like ArrowLeft', async () => {
    render(<Harness />);
    radios()[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(radios()[1]).toBeChecked();
    await userEvent.keyboard('{ArrowUp}');
    expect(radios()[0]).toBeChecked();
    expect(radios()[0]).toHaveFocus();
  });

  test('ArrowLeft from the first radio wraps to the last', async () => {
    render(<Harness />);
    radios()[0]!.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(radios()[2]).toHaveFocus();
    expect(radios()[2]).toBeChecked();
  });

  test('Home and End jump to the ends', async () => {
    render(<Harness initial={2} />);
    radios()[1]!.focus();
    await userEvent.keyboard('{End}');
    expect(radios()[2]).toBeChecked();
    await userEvent.keyboard('{Home}');
    expect(radios()[0]).toBeChecked();
    expect(radios()[0]).toHaveFocus();
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
