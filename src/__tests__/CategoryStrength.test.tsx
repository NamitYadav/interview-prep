import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

const panel = () => screen.getByText('By category').closest('details')!;
const row = (category: string) => within(panel()).getByText(category).parentElement!;

describe('CategoryStrength', () => {
  const questions = [q('a1', 'Alpha'), q('a2', 'Alpha'), q('b1', 'Beta'), q('c1', 'Gamma')];

  test('one row per category, each with its own progress bar', () => {
    render(<CategoryStrength questions={questions} progress={{}} />);
    expect(within(panel()).getAllByRole('listitem')).toHaveLength(3);
    expect(within(panel()).getByRole('progressbar', { name: 'Alpha progress' })).toBeInTheDocument();
  });

  test('a verdict per category, from that category alone', () => {
    render(
      <CategoryStrength
        questions={questions}
        progress={{ ...rated(['a1', 'a2'], 1), ...rated(['b1'], 3) }}
      />,
    );
    expect(row('Alpha')).toHaveTextContent('Weak');
    expect(row('Beta')).toHaveTextContent('Solid');
    expect(row('Gamma')).toHaveTextContent('Unrated');
  });

  test('a solid that has decayed back into the ok bucket reads OK, matching the bar', () => {
    const progress = { b1: { rating: 3 as const, seen: 1, lastSeen: 0 } };
    render(<CategoryStrength questions={questions} progress={progress} />);
    expect(row('Beta')).toHaveTextContent('OK');
  });

  test('a round with a single category renders nothing — the round bar already says it', () => {
    const { container } = render(<CategoryStrength questions={[q('a1', 'Alpha')]} progress={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
