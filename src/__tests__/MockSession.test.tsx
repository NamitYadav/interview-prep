import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useReducer } from 'react';
import { EMPTY } from './helpers';
import { reducer } from '../hooks/useAppState';
import { MockSession } from '../components/MockSession';

function Harness() {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  return <MockSession state={state} dispatch={dispatch} strictMode={false} />;
}

describe('MockSession', () => {
  test('shows preset choices before a session starts', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: /full loop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /technical rounds/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument();
  });

  test('starting a preset shows its full question count and a practice card', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /full loop/i }));
    expect(screen.getByText(/28 questions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
  });

  test('finishing with no ratings shows a zeroed recap', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /full loop/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    expect(screen.getByText(/0 of 28 rated/i)).toBeInTheDocument();
    expect(screen.getByText(/0 solid · 0 ok · 0 weak/i)).toBeInTheDocument();
  });

  test('rating a question during the session counts toward the recap', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /technical rounds/i }));
    await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
    await userEvent.click(screen.getByRole('radio', { name: /^solid/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    expect(screen.getByText(/1 of 20 rated/i)).toBeInTheDocument();
    expect(screen.getByText(/1 solid · 0 ok · 0 weak/i)).toBeInTheDocument();
  });

  test('back to presets returns to the preset list', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /full loop/i }));
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }));
    await userEvent.click(screen.getByRole('button', { name: /back to presets/i }));
    expect(screen.getByRole('button', { name: /full loop/i })).toBeInTheDocument();
  });
});
