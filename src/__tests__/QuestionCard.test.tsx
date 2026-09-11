import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { Question } from '../types';
import { QuestionCard } from '../components/QuestionCard';

const base: Question = {
  id: 'coding-001', round: 'coding', category: 'Debugging',
  question: 'What is wrong here?', answer: ['Answer one.'], keyPoints: ['Point one'],
};

const noop = () => {};

// A stateful checked/onCheckedChange pair — QuestionCard no longer owns this state
// itself (Practice hoists it so Back doesn't discard ticks), so tests that check
// checkbox interaction need something to hold it.
function CheckedHarness({ question, revealed }: { question: Question; revealed: boolean }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return (
    <QuestionCard
      question={question} revealed={revealed} note="" onReveal={noop} onNote={noop} onRate={noop}
      checked={checked} onCheckedChange={setChecked}
    />
  );
}

function renderCard(question: Question, revealed = false) {
  return render(<CheckedHarness question={question} revealed={revealed} />);
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

describe('QuestionCard scratch editor (Build prompts)', () => {
  const buildPrompt: Question = { ...base, category: 'Build prompts', scratch: true, code: 'function f() {\n  // TODO\n}' };

  test('renders an editable textarea pre-filled with the starter code, not a read-only block', () => {
    const { container } = renderCard(buildPrompt);
    expect(container.querySelector('pre')).toBeNull();
    expect(screen.getByRole('textbox', { name: /scratch editor/i })).toHaveValue(buildPrompt.code);
  });

  test('a non-Build-prompts question with code still renders the read-only block', () => {
    const { container } = renderCard({ ...base, code: 'const x = 1;' });
    expect(container.querySelector('pre')).not.toBeNull();
    expect(screen.queryByRole('textbox', { name: /scratch editor/i })).not.toBeInTheDocument();
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

function RevealHarness({ question }: { question: Question }) {
  const [revealed, setRevealed] = useState(false);
  return <QuestionCard question={question} revealed={revealed} note="" onReveal={() => setRevealed(true)} onNote={noop} onRate={noop} />;
}

describe('QuestionCard stopwatch', () => {
  test('shows elapsed time and the round target once revealed', () => {
    vi.useFakeTimers();
    try {
      render(<RevealHarness question={base} />);
      vi.advanceTimersByTime(62_000);
      fireEvent.click(screen.getByRole('button', { name: /reveal/i }));
      expect(screen.getByText(/answered in 1:02 · target 3:00/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test('shows no stopwatch line for a card rendered already revealed (Browse)', () => {
    renderCard(base, true);
    expect(screen.queryByText(/answered in/i)).not.toBeInTheDocument();
  });
});

function StrictHarness({ question }: { question: Question }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <QuestionCard
      question={question} revealed={revealed} note="" strictMode
      onReveal={() => setRevealed(true)} onNote={noop} onRate={noop}
    />
  );
}

describe('QuestionCard strict mode', () => {
  test('auto-reveals when the round target elapses, tagged "Out of time"', () => {
    vi.useFakeTimers();
    try {
      render(<StrictHarness question={base} />);
      act(() => vi.advanceTimersByTime(180_000));
      expect(screen.getByText(/out of time · target 3:00/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test('shows a live countdown before reveal, so the answer never pops with no warning', () => {
    vi.useFakeTimers();
    try {
      render(<StrictHarness question={base} />);
      act(() => vi.advanceTimersByTime(250)); // first tick
      expect(screen.getByText(/time left: 3:00/i)).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.getByText(/time left: 2:00/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test('no countdown line when strict mode is off', () => {
    render(<RevealHarness question={base} />);
    expect(screen.queryByText(/time left/i)).not.toBeInTheDocument();
  });

  test('does not auto-reveal when strict mode is off', () => {
    vi.useFakeTimers();
    try {
      render(<RevealHarness question={base} />);
      act(() => vi.advanceTimersByTime(180_000));
      expect(screen.queryByText(/answered in|out of time/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test('manual reveal before the target is not tagged out of time', () => {
    vi.useFakeTimers();
    try {
      render(<StrictHarness question={base} />);
      act(() => vi.advanceTimersByTime(5_000));
      fireEvent.click(screen.getByRole('button', { name: /reveal/i }));
      expect(screen.getByText(/answered in 0:05/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test('a manual reveal clears the countdown — it does not fire "out of time" later', () => {
    vi.useFakeTimers();
    try {
      render(<StrictHarness question={base} />);
      act(() => vi.advanceTimersByTime(5_000));
      fireEvent.click(screen.getByRole('button', { name: /reveal/i }));
      act(() => vi.advanceTimersByTime(200_000)); // well past the 3:00 target
      expect(screen.getByText(/answered in 0:05/i)).toBeInTheDocument();
      expect(screen.queryByText(/out of time/i)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test('unmounting mid-countdown clears both the auto-reveal timeout and the tick interval', () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<StrictHarness question={base} />);
      act(() => vi.advanceTimersByTime(60_000));
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
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
});

describe('QuestionCard follow-ups (post-reveal)', () => {
  test('follow-ups render as a plain list once revealed, with no gating button', () => {
    renderCard({ ...base, followUps: ['What if the input is empty?'] }, true);
    expect(screen.getByText('What if the input is empty?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /answer the follow-up/i })).not.toBeInTheDocument();
  });

  test('no follow-ups section when the question has none', () => {
    renderCard(base, true);
    expect(screen.queryByText(/likely follow-ups/i)).not.toBeInTheDocument();
  });
});

describe('QuestionCard follow-ups (pre-reveal, "Probe me")', () => {
  const withFollowUps = { ...base, followUps: ['First follow-up?', 'Second follow-up?'] };

  test('follow-ups stay hidden until probed, one at a time', async () => {
    renderCard(withFollowUps, false);
    expect(screen.queryByText('First follow-up?')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /probe me \(1\/2\)/i }));
    expect(screen.getByText('First follow-up?')).toBeInTheDocument();
    expect(screen.queryByText('Second follow-up?')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /probe me \(2\/2\)/i }));
    expect(screen.getByText('Second follow-up?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /probe me/i })).not.toBeInTheDocument();
  });

  test('no probe button pre-reveal when the question has no follow-ups', () => {
    renderCard(base, false);
    expect(screen.queryByRole('button', { name: /probe me/i })).not.toBeInTheDocument();
  });
});

describe('QuestionCard placeholder styling', () => {
  test('renders a [bracket] slot distinctly from the surrounding text', () => {
    const { container } = renderCard(
      { ...base, answer: ['Name [your current role] and connect it to [scope].'] },
      true,
    );
    const p = screen.getByText(/Name/i, { selector: 'p' });
    expect(p).toHaveTextContent('Name [your current role] and connect it to [scope].');
    expect(container.querySelectorAll('p span.underline')).toHaveLength(2);
  });

  test('plain text with no brackets renders unchanged', () => {
    renderCard({ ...base, answer: ['No placeholders here at all.'] }, true);
    expect(screen.getByText('No placeholders here at all.')).toBeInTheDocument();
  });
});
