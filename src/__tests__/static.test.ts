import { describe, expect, test } from 'vitest';
import { questions } from '../data';
import { THEME_KEY } from '../hooks/useTheme';
// Files outside the module graph that still have to agree with the code.
import html from '../../index.html?raw';
import css from '../index.css?raw';
import readme from '../../README.md?raw';

describe('static files', () => {
  // The pre-paint script reads the theme before React loads, so it spells the key
  // itself. A rename that missed it brought back the theme flash silently.
  test('index.html pre-paint script reads the same theme key as useTheme', () => {
    expect(html).toContain(`'${THEME_KEY}'`);
  });

  // Tailwind v4 emits utilities in a cascade layer; an unlayered rule beats any layered
  // utility regardless of specificity, so `outline-none` on the two programmatic-focus
  // targets did nothing and a ring wrapped the whole revealed answer.
  test('the global focus ring lives in @layer base so outline-none can override it', () => {
    expect(css).toMatch(/@layer base\s*\{[^}]*:focus-visible/);
  });

  test('README states the real question count', () => {
    expect(readme).toContain(`${questions.length} curated questions`);
  });
});
