import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Question } from '../types';
import { QuestionCard } from '../components/QuestionCard';

const base: Question = {
  id: 'coding-001', round: 'coding', category: 'Debugging',
  question: 'What is wrong here?', answer: ['Answer one.'], keyPoints: ['Point one'],
};

const noop = () => {};

function renderCard(question: Question, revealed = false) {
  return render(
    <QuestionCard question={question} revealed={revealed} note="" onReveal={noop} onNote={noop} onRate={noop} />,
  );
}

describe('QuestionCard code block', () => {
  test('renders the snippet with the prompt, before the answer is revealed', () => {
    const { container } = renderCard({ ...base, code: 'const x = 1;\nconsole.log(x);' });
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre).toHaveTextContent('const x = 1;');
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
    expect(screen.queryByText('Answer one.')).not.toBeInTheDocument();
  });

  test('renders no code block when the question has no snippet', () => {
    const { container } = renderCard(base);
    expect(container.querySelector('pre')).toBeNull();
  });

  test('keeps the snippet visible once the answer is revealed', () => {
    const { container } = renderCard({ ...base, code: 'const x = 1;' }, true);
    expect(container.querySelector('pre')).toHaveTextContent('const x = 1;');
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
  });
});

describe('QuestionCard reveal', () => {
  test('the reveal button calls onReveal', async () => {
    const onReveal = vi.fn();
    render(
      <QuestionCard question={base} revealed={false} note="" onReveal={onReveal} onNote={noop} onRate={noop} />,
    );
    screen.getByRole('button', { name: /reveal/i }).click();
    expect(onReveal).toHaveBeenCalledOnce();
  });
});
