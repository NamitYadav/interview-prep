import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import type { Question } from '../types';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { Practice } from '../components/Practice';

// Practice now persists lap position, so each test needs a clean slate.
beforeEach(() => localStorage.clear());

const qs: Question[] = [
  { id: 'hm-001', round: 'hm', category: 'A', question: 'First question?', answer: ['Answer one.'], keyPoints: ['Point one'], followUps: ['Follow one'] },
  { id: 'hm-002', round: 'hm', category: 'A', question: 'Second question?', answer: ['Answer two.'], keyPoints: ['Point two'] },
];

const qs3: Question[] = [
  ...qs,
  { id: 'hm-003', round: 'hm', category: 'A', question: 'Third question?', answer: ['Answer three.'], keyPoints: ['Point three'] },
];

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <Practice questions={qs} state={state} dispatch={dispatch} strictMode={false} />;
}

function Harness3() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <Practice questions={qs3} state={state} dispatch={dispatch} strictMode={false} />;
}

const rateVisible = async () => {
  await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
  await userEvent.click(screen.getByRole('radio', { name: /solid/i }));
};

describe('Practice', () => {
  test('no round-boundary banner outside ordered mode, even on the first question', () => {
    render(<Harness />);
    expect(screen.queryByText(/round \d+ of \d+/i)).not.toBeInTheDocument();
  });

  test('reveal shows answer, key points, and follow-ups as a plain list', async () => {
    render(<Harness />);
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(screen.queryByText('Answer one.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    expect(screen.getByText('Point one')).toBeInTheDocument();
    expect(screen.getByText('Follow one')).toBeInTheDocument();
  });

  test('reveal moves focus into the answer instead of dropping it to body', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    const answer = screen.getByText('Answer one.').parentElement?.parentElement;
    expect(answer).toHaveFocus();
  });

  test('rating advances to the next question and hides the answer', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /solid/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    expect(screen.queryByText('Answer two.')).not.toBeInTheDocument();
  });

  test('keyboard: space reveals, 2 rates, n skips', async () => {
    render(<Harness />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: '2' });
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    // Both questions have now been shown this lap — skipping the second ends the lap
    // rather than silently wrapping back to the first.
    fireEvent.keyDown(window, { key: 'n' });
    expect(screen.getByText(/lap done/i)).toBeInTheDocument();
  });

  test('a lap ends once every question has been shown, with a way to start another', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /solid/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /solid/i }));

    expect(screen.getByText(/lap done/i)).toBeInTheDocument();
    expect(screen.getByText(/2 solid/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /start another lap/i }));
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('keyboard shortcuts are ignored inside the note textarea', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    const note = screen.getByRole('textbox', { name: /your note/i });
    await userEvent.type(note, 'n2 ');
    expect(note).toHaveValue('n2 ');
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('space on a revealed card does not preventDefault, so it can still scroll the page', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    fireEvent(window, event);
    expect(spy).not.toHaveBeenCalled();
  });

  test('space activates a focused button instead of being swallowed by the global reveal shortcut', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /reveal/i }));
    screen.getByRole('radio', { name: /solid/i }).focus();
    await user.keyboard(' ');
    expect(screen.getByText('Second question?')).toBeInTheDocument();
  });

  test('back returns to the previous question, revealed, and is disabled on the first', async () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /solid/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(screen.getByText('Answer one.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /solid/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
  });

  test('keyboard: b goes back', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /solid/i }));
    fireEvent.keyDown(window, { key: 'b' });
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('advancing after a Back overwrites the old forward path instead of replaying it', async () => {
    render(<Harness3 />);
    await rateVisible(); // Q1 -> Q2
    await rateVisible(); // Q2 -> Q3
    expect(screen.getByText('Third question?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /back/i })); // -> Q2
    expect(screen.getByText('Second question?')).toBeInTheDocument();

    // Back leaves the card already revealed, so re-rating needs no Reveal click.
    await userEvent.click(screen.getByRole('radio', { name: /solid/i })); // Q2 -> should reach Q3 again, not repeat it
    expect(screen.getByText('Third question?')).toBeInTheDocument();

    await rateVisible(); // every question shown once now -> lap done
    expect(screen.getByText(/lap done/i)).toBeInTheDocument();
  });

  test('a double Back followed by a re-rating can resurface a skipped question later in the same lap', async () => {
    // Documents a known, accepted edge case (see the comment on seenInPath in
    // Practice.tsx): re-rating Q1 after backing up two steps moves it to a new
    // bucket, which can make the queue jump straight to Q3 — skipping past Q2
    // without forgetting it. Q2 still comes back before the lap ends; nothing is
    // lost or stuck, it just takes one extra rating for this 3-question lap.
    render(<Harness3 />);
    await rateVisible(); // Q1 -> Q2
    await rateVisible(); // Q2 -> Q3

    await userEvent.click(screen.getByRole('button', { name: /back/i })); // -> Q2
    await userEvent.click(screen.getByRole('button', { name: /back/i })); // -> Q1
    expect(screen.getByText('First question?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: /solid/i })); // re-rate Q1
    expect(screen.getByText('Third question?')).toBeInTheDocument();

    await rateVisible(); // Q3 rated, but Q2 was skipped over — not lap done yet
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    expect(screen.queryByText(/lap done/i)).not.toBeInTheDocument();

    await rateVisible(); // Q2 finally rated -> now every question has been shown
    expect(screen.getByText(/lap done/i)).toBeInTheDocument();
  });

  test('starting another lap resets history so Back is disabled again on its first question', async () => {
    render(<Harness />);
    await rateVisible(); // Q1 -> Q2
    await rateVisible(); // Q2 -> lap done
    expect(screen.getByText(/lap done/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /start another lap/i }));
    expect(screen.getByText('First question?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
  });

  test('the key-points checklist is empty for a new question after advancing', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Point one' }));
    expect(screen.getByRole('checkbox', { name: 'Point one' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: /solid/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    expect(screen.getByRole('checkbox', { name: 'Point two' })).not.toBeChecked();
  });

  test('empty state when no questions', () => {
    render(<Practice questions={[]} state={EMPTY} dispatch={() => {}} strictMode={false} />);
    expect(screen.getByText(/no questions match/i)).toBeInTheDocument();
  });
});

const qs10: Question[] = Array.from({ length: 10 }, (_, i) => ({
  id: `hm-${String(i + 1).padStart(3, '0')}`,
  round: 'hm', category: 'A', question: `Question ${i + 1}?`, answer: [`Answer ${i + 1}.`], keyPoints: [`Point ${i + 1}`],
}));

function Harness10() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <Practice questions={qs10} state={state} dispatch={dispatch} strictMode={false} />;
}

const currentQuestionText = () => screen.getByRole('heading', { level: 2 }).textContent;
const rateWeak = async () => {
  await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
  await userEvent.click(screen.getByRole('radio', { name: /weak/i }));
};
const skipVisible = async () => {
  await userEvent.click(screen.getByRole('button', { name: /skip/i }));
};

describe('Practice ordered mode and round-boundary banner', () => {
  const mixedRounds: Question[] = [
    { id: 'hr-001', round: 'hr', category: 'A', question: 'HR one?', answer: ['a'], keyPoints: ['k'] },
    { id: 'hr-002', round: 'hr', category: 'A', question: 'HR two?', answer: ['a'], keyPoints: ['k'] },
    { id: 'hm-001', round: 'hm', category: 'A', question: 'HM one?', answer: ['a'], keyPoints: ['k'] },
  ];
  function OrderedHarness() {
    const [state, dispatch] = useReducer(reducer, EMPTY);
    return <Practice questions={mixedRounds} state={state} dispatch={dispatch} strictMode={false} ordered />;
  }

  test('serves questions in array order and banners each round transition', async () => {
    render(<OrderedHarness />);
    expect(currentQuestionText()).toBe('HR one?');
    expect(screen.getByText(/round 1 of 2 — hr screen/i)).toBeInTheDocument();

    await skipVisible();
    expect(currentQuestionText()).toBe('HR two?');
    expect(screen.queryByText(/round \d of \d/i)).not.toBeInTheDocument();

    await skipVisible();
    expect(currentQuestionText()).toBe('HM one?');
    expect(screen.getByText(/round 2 of 2 — hiring manager/i)).toBeInTheDocument();
  });
});

describe('Practice weak-question requeuing', () => {
  test('a weak rating resurfaces 8 advances later, not immediately and not lost', async () => {
    render(<Harness10 />);
    expect(currentQuestionText()).toBe('Question 1?');

    await rateWeak(); // Question 1 rated weak -> requeued, not shown again yet
    expect(currentQuestionText()).toBe('Question 2?');

    // Skip through the next 8 questions (Q2..Q9) — none of them is Q1 resurfacing early.
    for (let i = 2; i <= 9; i++) {
      expect(currentQuestionText()).toBe(`Question ${i}?`);
      await skipVisible();
    }
    // The 8th advance since the weak rating lands back on Question 1, ahead of the
    // still-unshown Question 10 — the requeue wins over the regular queue once due.
    expect(currentQuestionText()).toBe('Question 1?');
  });

  test('a pending requeue keeps the lap open past the point every other question is shown', async () => {
    const threeQs = qs10.slice(0, 3);
    function Harness3q() {
      const [state, dispatch] = useReducer(reducer, EMPTY);
      return <Practice questions={threeQs} state={state} dispatch={dispatch} strictMode={false} />;
    }
    render(<Harness3q />);

    await rateWeak(); // Question 1 -> requeued for step 0+8=8, far beyond this 3-question set
    expect(currentQuestionText()).toBe('Question 2?');
    await skipVisible();
    expect(currentQuestionText()).toBe('Question 3?');

    // The regular queue is now exhausted (Q1, Q2, Q3 all shown), but Question 1's
    // requeue hasn't reached its scheduled step yet — the lap must not end here.
    await skipVisible();
    expect(screen.queryByText(/lap done/i)).not.toBeInTheDocument();
    expect(currentQuestionText()).toBe('Question 1?');

    // Now that the one pending requeue has been drained, the lap can actually end.
    await rateWeak();
    expect(screen.getByText(/lap done/i)).toBeInTheDocument();
  });
});

describe('lap position survives a reload', () => {
  // A reload, a tab switch, or a phone discarding a backgrounded tab used to drop the
  // user back to the top of a 287-question queue.
  test('remounting restores the question you were on', async () => {
    const { unmount } = render(<Harness3 />);
    expect(screen.getByText('First question?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();

    unmount();
    render(<Harness3 />);
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    // and Back still works across the restore, so history came back too
    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('a different question set starts its own lap rather than restoring', async () => {
    const { unmount } = render(<Harness3 />);
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(screen.getByText('Second question?')).toBeInTheDocument();
    unmount();

    // A two-question set has a different lap key, so it must not restore position 1.
    render(<Harness />);
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('a finished lap is not restored', async () => {
    const { unmount } = render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(screen.getByText(/lap done/i)).toBeInTheDocument();
    unmount();

    render(<Harness />);
    expect(screen.queryByText(/lap done/i)).not.toBeInTheDocument();
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('corrupt stored lap data falls back to a fresh lap', () => {
    localStorage.setItem('interview-prep:lap', 'not json');
    render(<Harness />);
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });

  test('an out-of-range stored position is rejected', () => {
    localStorage.setItem(
      'interview-prep:lap',
      JSON.stringify({ key: `2:hm-001:hm-002`, history: ['hm-001'], historyPos: 7, requeued: [], step: 0 }),
    );
    render(<Harness />);
    expect(screen.getByText('First question?')).toBeInTheDocument();
  });
});

describe('your-answer draft survives Back', () => {
  // The card remounts per question (key={current.id}), so without Practice owning this,
  // going Back discarded what you had drafted before revealing. Back returns the
  // question already revealed, so the draft shows in the read-only comparison view
  // rather than the textarea.
  test('going back shows what you wrote against the model answer', async () => {
    render(<Harness3 />);
    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: 'my first draft' } });
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(screen.getByLabelText(/your answer/i)).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('heading', { name: /your answer/i })).toBeInTheDocument();
    expect(screen.getByText('my first draft')).toBeInTheDocument();
  });

  test('each question keeps its own draft', async () => {
    render(<Harness3 />);
    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: 'draft one' } });
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: 'draft two' } });

    await userEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('draft one')).toBeInTheDocument();
    expect(screen.queryByText('draft two')).not.toBeInTheDocument();
  });

  test('a draft is not shared between questions', async () => {
    render(<Harness3 />);
    fireEvent.change(screen.getByLabelText(/your answer/i), { target: { value: 'only mine' } });
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(screen.getByLabelText(/your answer/i)).toHaveValue('');
    expect(screen.queryByText('only mine')).not.toBeInTheDocument();
  });
});
