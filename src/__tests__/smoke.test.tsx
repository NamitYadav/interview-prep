import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /interview prep/i })).toBeInTheDocument();
});
