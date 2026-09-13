import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Progress, Question } from '../types';
import { CategoryStrength } from '../components/CategoryStrength';

const q = (id: string, category: string): Question => ({
  id, round: 'hm', category, question: `${id}?`, answer: ['a'], keyPoints: ['k'],
});

// roundStats decays a stale Solid into the OK bucket, so a rating meant to read as Solid
// has to be recent against the real clock the component calls.
const NOW = Date.now();
const rated = (ids: string[], rating: 1 | 2 | 3): Progress =>
  Object.fromEntries(ids.map((id) => [id, { rating, seen: 1, lastSeen: NOW }]));

const QUESTIONS = [q('a1', 'Alpha'), q('a2', 'Alpha'), q('b1', 'Beta'), q('c1', 'Gamma')];

function show({
  questions = QUESTIONS, progress = {}, selected = null, onSelect = () => {},
}: {
  questions?: Question[];
  progress?: Progress;
  selected?: string | null;
  onSelect?: (category: string | null) => void;
} = {}) {
  return render(
    <CategoryStrength questions={questions} progress={progress} selected={selected} onSelect={onSelect} />,
  );
}

const panel = () => screen.getByText('By category').closest('details')!;
const row = (category: string) => within(panel()).getByRole('button', { name: new RegExp(`^${category}:`) });

describe('CategoryStrength', () => {
  test('one row per category, each with its own progress bar', () => {
    show();
    expect(within(panel()).getAllByRole('listitem')).toHaveLength(3);
    expect(within(panel()).getByRole('progressbar', { name: 'Alpha progress' })).toBeInTheDocument();
  });

  test('a verdict per category, from that category alone', () => {
    show({ progress: { ...rated(['a1', 'a2'], 1), ...rated(['b1'], 3) } });
    expect(row('Alpha')).toHaveAccessibleName('Alpha: Weak');
    expect(row('Beta')).toHaveAccessibleName('Beta: Solid');
    expect(row('Gamma')).toHaveAccessibleName('Gamma: Unrated');
  });

  test('a solid that has decayed back into the ok bucket reads OK, matching the bar', () => {
    show({ progress: { b1: { rating: 3, seen: 1, lastSeen: 0 } } });
    expect(row('Beta')).toHaveAccessibleName('Beta: OK');
  });

  test('a round with a single category renders nothing — the round bar already says it', () => {
    const { container } = show({ questions: [q('a1', 'Alpha')] });
    expect(container).toBeEmptyDOMElement();
  });

  test('clicking a row filters to that category', async () => {
    const onSelect = vi.fn();
    show({ onSelect });
    await userEvent.click(row('Beta'));
    expect(onSelect).toHaveBeenCalledWith('Beta');
  });

  test('clicking the row you are already filtered to clears the filter', async () => {
    const onSelect = vi.fn();
    show({ selected: 'Beta', onSelect });
    await userEvent.click(row('Beta'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  test('only the filtered row reads as pressed', () => {
    show({ selected: 'Beta' });
    expect(row('Beta')).toHaveAttribute('aria-pressed', 'true');
    expect(row('Alpha')).toHaveAttribute('aria-pressed', 'false');
  });
});
