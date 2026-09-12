import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import App from '../App';
import { Home } from '../components/Home';
import { Settings } from '../components/Settings';

afterEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [strict, setStrict] = useReducer((_: boolean, v: boolean) => v, false);
  const [shortcuts, setShortcuts] = useReducer((_: boolean, v: boolean) => v, true);
  return (
    <Settings
      state={state}
      dispatch={dispatch}
      strictMode={strict}
      setStrictMode={setStrict}
      shortcuts={shortcuts}
      setShortcuts={setShortcuts}
    />
  );
}

// jsdom renders the contents of a closed <details> like any other node, so "is it
// reachable yet" can't be asserted through a role query — it would pass whether or not
// the panel were open. The disclosure state itself is what carries that meaning.
const panel = (container: HTMLElement) => container.querySelector('details')!;

describe('Settings disclosure', () => {
  test('starts closed and opens on click', async () => {
    const { container } = render(<Harness />);
    expect(panel(container).open).toBe(false);

    await userEvent.click(screen.getByText(/^settings$/i));
    expect(panel(container).open).toBe(true);
  });

  test('Escape closes it and hands focus back to the control that opened it', async () => {
    const { container } = render(<Harness />);
    const summary = screen.getByText(/^settings$/i);
    await userEvent.click(summary);
    expect(panel(container).open).toBe(true);

    await userEvent.keyboard('{Escape}');
    expect(panel(container).open).toBe(false);
    // Without this the panel closes and focus falls to <body>, so the next Tab starts
    // from the top of the document rather than from where the user was.
    expect(summary).toHaveFocus();
  });

  test('clicking outside closes it', async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByText(/^settings$/i));
    expect(panel(container).open).toBe(true);

    await userEvent.click(document.body);
    expect(panel(container).open).toBe(false);
  });

  test('clicking inside it does not close it', async () => {
    const { container } = render(<Harness />);
    await userEvent.click(screen.getByText(/^settings$/i));
    await userEvent.click(screen.getByRole('checkbox', { name: /^strict mode$/i }));
    expect(panel(container).open).toBe(true);
  });

  test('holds the theme, drilling and data controls', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText(/^settings$/i));
    expect(screen.getByRole('group', { name: /theme/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /^strict mode$/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /^shortcuts$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^export$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^import$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset progress/i })).toBeInTheDocument();
  });

  // The header's whole problem was five controls competing with the drill. Each toggle
  // now carries the explanation there was never room for beside it.
  test('each drilling toggle describes what it does', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByText(/^settings$/i));
    expect(screen.getByRole('checkbox', { name: /^shortcuts$/i })).toHaveAccessibleDescription(/space to reveal/i);
    expect(screen.getByRole('checkbox', { name: /^strict mode$/i })).toHaveAccessibleDescription(/target time/i);
  });
});

describe('what the header and home screen carry now', () => {
  test('the header is down to the one Settings control', () => {
    const { container } = render(<App />);
    const header = container.querySelector('header')!;
    // The panel's own contents sit inside <details>; outside it the header holds
    // nothing but the summary that opens it.
    const outsidePanel = Array.from(header.querySelectorAll('button')).filter((b) => b.closest('details') === null);
    expect(outsidePanel).toHaveLength(0);
    expect(screen.getByText(/^settings$/i)).toBeInTheDocument();
  });

  // Export moved into the panel with Import and Reset; Home only offers it inside the
  // backup nudge, which needs progress to show — so a fresh Home carries no data controls.
  test('home carries no data controls of its own', () => {
    function HomeHarness() {
      const [state] = useReducer(reducer, EMPTY);
      return <Home state={state} />;
    }
    render(<HomeHarness />);
    expect(screen.queryByRole('button', { name: /^export$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^import$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset progress/i })).not.toBeInTheDocument();
  });
});

describe('settings reach the drill', () => {
  beforeEach(() => localStorage.clear());

  // Strict mode moved behind the disclosure, so this is the path that has to keep
  // working: open the panel, flip it, and the question card starts counting down.
  test('turning on strict mode from the panel puts a countdown on the question', async () => {
    window.location.hash = '#hr';
    render(<App />);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText(/^settings$/i));
    await userEvent.click(screen.getByRole('checkbox', { name: /^strict mode$/i }));

    // The countdown fills in on the timer's own 250ms tick; real timers here rather than
    // fake ones, which userEvent would need to be wired through to advance.
    expect(await screen.findByRole('timer')).toHaveTextContent(/time left/i);
  });
});
