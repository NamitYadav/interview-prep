import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('QuestionCard key points checklist', () => {
  const twoPoints: Question = { ...base, keyPoints: ['Point one', 'Point two'] };

  test('suggests a rating from checked key points', async () => {
    renderCard(twoPoints, true);
    expect(screen.getByText(/0\/2 key points hit · suggested: Weak/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Point one' }));
    expect(screen.getByText(/1\/2 key points hit · suggested: OK/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Point two' }));
    expect(screen.getByText(/2\/2 key points hit · suggested: Solid/i)).toBeInTheDocument();
  });

  test('checklist state resets on remount for a new question', () => {
    const { unmount } = renderCard(twoPoints, true);
    screen.getByRole('checkbox', { name: 'Point one' }).click();
    unmount();
    renderCard({ ...twoPoints, id: 'coding-002' }, true);
    expect(screen.getByRole('checkbox', { name: 'Point one' })).not.toBeChecked();
  });
});

describe('QuestionCard follow-ups', () => {
  test('follow-ups stay hidden until asked for', async () => {
    renderCard({ ...base, followUps: ['What if the input is empty?'] }, true);
    expect(screen.queryByText('What if the input is empty?')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /answer the follow-up/i }));
    expect(screen.getByText('What if the input is empty?')).toBeInTheDocument();
  });

  test('no follow-up button when the question has none', () => {
    renderCard(base, true);
    expect(screen.queryByRole('button', { name: /answer the follow-up/i })).not.toBeInTheDocument();
  });
});
