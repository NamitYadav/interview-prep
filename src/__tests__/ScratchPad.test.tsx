import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Question } from '../types';
import { ScratchPad } from '../components/ScratchPad';

const q: Question = {
  id: 'coding-001', round: 'coding', category: 'Build prompts', scratch: true,
  question: 'Build it', code: 'function f() {\n  return 1;\n}', answer: ['a'], keyPoints: ['k'],
};

afterEach(() => localStorage.clear());

const frame = () => screen.getByTitle('Preview') as HTMLIFrameElement;

// Messages "from the sandbox" are MessageEvents on window whose source is the iframe's
// window — exactly what the browser delivers, minus the actual frame load (jsdom does
// not fetch iframe sources, but it does give each one a contentWindow).
const fromSandbox = (data: unknown, source: Window | null = frame().contentWindow) =>
  act(() => { window.dispatchEvent(new MessageEvent('message', { data, source })); });

describe('ScratchPad editor', () => {
  test('is a textarea pre-filled with the starter code', () => {
    render(<ScratchPad question={q} />);
    expect(screen.getByRole('textbox', { name: /scratch editor/i })).toHaveValue(q.code);
  });

  test('Tab inserts two spaces at the caret and keeps focus', async () => {
    const user = userEvent.setup();
    // Distinct id from the other tests in this file: this test's Tab edit is flushed to
    // localStorage on unmount, and that flush lands after this file's own
    // `afterEach(() => localStorage.clear())` — Vitest runs setupTests.ts's
    // `afterEach(cleanup)` last, as the outermost hook. A shared id would leak "a  b"
    // into whichever test runs next.
    render(<ScratchPad question={{ ...q, id: 'coding-002', code: 'ab' }} />);
    const ta = screen.getByRole('textbox', { name: /scratch editor/i }) as HTMLTextAreaElement;
    ta.focus();
    ta.setSelectionRange(1, 1);
    await user.keyboard('{Tab}');
    expect(ta).toHaveValue('a  b');
    expect(ta).toHaveFocus();
    expect(ta.selectionStart).toBe(3);
  });

  test('Shift+Tab is left alone so focus can still leave backwards', async () => {
    const user = userEvent.setup();
    render(<><button>before</button><ScratchPad question={{ ...q, code: 'ab' }} /></>);
    const ta = screen.getByRole('textbox', { name: /scratch editor/i });
    ta.focus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(ta).toHaveValue('ab');
    expect(screen.getByRole('button', { name: 'before' })).toHaveFocus();
  });

  test('Escape moves focus from the editor to Run, so forward Tab is not a trap', async () => {
    const user = userEvent.setup();
    render(<ScratchPad question={q} />);
    const ta = screen.getByRole('textbox', { name: /scratch editor/i });
    expect(ta).toHaveAccessibleDescription(/esc leaves the editor/i);
    ta.focus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /run/i })).toHaveFocus();
  });

  test('Cmd/Ctrl+Enter runs from inside the editor', () => {
    render(<ScratchPad question={q} />);
    fireEvent.keyDown(screen.getByRole('textbox', { name: /scratch editor/i }), { key: 'Enter', ctrlKey: true });
    expect(screen.getByRole('status')).toHaveTextContent('Running…');
  });
});

describe('ScratchPad runner', () => {
  test('Run reloads the frame, then posts the draft and preview once it is ready', () => {
    render(<ScratchPad question={{ ...q, preview: '<f />' }} />);
    const before = frame();
    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    expect(frame()).not.toBe(before);
    const post = vi.spyOn(frame().contentWindow!, 'postMessage');
    fromSandbox({ type: 'ready' });
    expect(post).toHaveBeenCalledWith({ type: 'run', code: q.code, preview: '<f />' }, '*');
  });

  test('a ready with nothing pending posts nothing', () => {
    render(<ScratchPad question={q} />);
    const post = vi.spyOn(frame().contentWindow!, 'postMessage');
    fromSandbox({ type: 'ready' });
    expect(post).not.toHaveBeenCalled();
  });

  test('console output lands in the Output log', () => {
    render(<ScratchPad question={q} />);
    fromSandbox({ type: 'log', level: 'log', text: 'hello 42' });
    fromSandbox({ type: 'log', level: 'warn', text: 'careful' });
    const log = screen.getByRole('log', { name: /output/i });
    expect(log).toHaveTextContent('hello 42');
    expect(screen.getByText('careful')).toHaveClass('text-amber-700');
  });

  test('errors are marked with ✗ and coloured', () => {
    render(<ScratchPad question={q} />);
    fromSandbox({ type: 'error', text: 'SyntaxError: Unexpected token (2:3)' });
    const line = screen.getByText(/Unexpected token/);
    expect(line).toHaveTextContent('✗ SyntaxError: Unexpected token (2:3)');
    expect(line).toHaveClass('text-amber-700');
  });

  test('messages from any other window are ignored', () => {
    render(<ScratchPad question={q} />);
    fromSandbox({ type: 'log', level: 'log', text: 'spoofed' }, window);
    expect(screen.getByRole('log', { name: /output/i })).toBeEmptyDOMElement();
  });

  test('a run that logs nothing says so once done', () => {
    render(<ScratchPad question={q} />);
    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Running…');
    fromSandbox({ type: 'done' });
    expect(screen.getByRole('status')).toHaveTextContent('Ran — no output');
  });

  test('Stop clears the output, resets the status and reloads the frame', () => {
    render(<ScratchPad question={q} />);
    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    const before = frame();
    fromSandbox({ type: 'log', level: 'log', text: 'x' });
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(screen.getByRole('log', { name: /output/i })).toBeEmptyDOMElement();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(frame()).not.toBe(before);
  });

  test('a frame that never reports ready fails the run after the timeout', () => {
    vi.useFakeTimers();
    try {
      render(<ScratchPad question={q} />);
      fireEvent.click(screen.getByRole('button', { name: /run/i }));
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.getByRole('log', { name: /output/i })).toHaveTextContent('did not load');
      expect(screen.getByRole('status')).not.toHaveTextContent('Running…');
    } finally {
      vi.useRealTimers();
    }
  });

  test('a ready that arrives in time cancels the timeout', () => {
    vi.useFakeTimers();
    try {
      render(<ScratchPad question={q} />);
      fireEvent.click(screen.getByRole('button', { name: /run/i }));
      fromSandbox({ type: 'ready' });
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.getByRole('log', { name: /output/i })).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });

  test('the frame is sandboxed to scripts and forms only, and points at the sandbox page', () => {
    render(<ScratchPad question={q} />);
    expect(frame()).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
    expect(frame().getAttribute('src')).toMatch(/\/sandbox\.html$/);
  });

  test('without a preview the frame is kept in the DOM but hidden', () => {
    render(<ScratchPad question={q} />);
    expect(frame()).toHaveAttribute('aria-hidden', 'true');
    expect(frame()).toHaveClass('h-0');
  });

  // Before the first Run, and when the sandbox never loads, the preview was a bright empty
  // rectangle under the editor.
  test('with a preview the frame shows once the sandbox is ready for a run, and hides on Stop', () => {
    render(<ScratchPad question={{ ...q, preview: '<f />' }} />);
    expect(frame()).toHaveClass('h-0');
    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    expect(frame()).toHaveClass('h-0');
    fromSandbox({ type: 'ready' });
    expect(frame()).not.toHaveAttribute('aria-hidden');
    expect(frame()).toHaveClass('min-h-48');
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(frame()).toHaveClass('h-0');
  });

  // Pad code has window.parent.postMessage, so the source check proves nothing about the
  // shape. A non-string `text` rendered as a React child took the whole app down.
  test('malformed messages from the frame are coerced or ignored, never thrown', () => {
    render(<ScratchPad question={q} />);
    fromSandbox({ type: 'log', level: 'bogus', text: { anything: 1 } });
    fromSandbox({ type: 'error', text: 42 });
    fromSandbox({ type: 'nonsense' });
    fromSandbox('a string');
    fromSandbox(null);
    const log = screen.getByRole('log', { name: /output/i });
    expect(log).toHaveTextContent('[object Object]');
    expect(log).toHaveTextContent('✗ 42');
    expect(log.children).toHaveLength(2);
  });

  test('the Run hint shows only when shortcuts are on', () => {
    const { rerender } = render(<ScratchPad question={q} />);
    expect(screen.getByRole('button', { name: /run/i }).querySelector('kbd')).toBeNull();
    rerender(<ScratchPad question={q} shortcuts />);
    expect(screen.getByRole('button', { name: /run/i }).querySelector('kbd')).not.toBeNull();
  });
});
