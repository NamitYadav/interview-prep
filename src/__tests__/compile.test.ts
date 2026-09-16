import { describe, expect, test } from 'vitest';
import { compile, formatArgs } from '../sandbox/compile';

describe('compile', () => {
  test('strips types and keeps the code', () => {
    const out = compile('type T = { a: number };\nfunction f<T>(x: T): T { return x; }');
    expect(out).not.toContain('type T');
    expect(out).toMatch(/function f\s*\(x\)\s*\{ return x; \}/);
  });

  test('compiles JSX to React.createElement, resolved against the React parameter', () => {
    expect(compile('const el = <div className="a" />;')).toMatch(/React\.createElement\(['"]div['"]/);
  });

  test('appends the render call after the user code when given a preview', () => {
    const out = compile('function F() { return null; }', '<F />');
    const user = out.indexOf('function F');
    const render = out.indexOf('__render(React.createElement(F');
    expect(user).toBeGreaterThan(-1);
    expect(render).toBeGreaterThan(user);
  });

  test('adds no render call without a preview', () => {
    expect(compile('const x = 1;')).not.toContain('__render');
  });

  test('exposes React as globals before anything else runs', () => {
    expect(compile('1;').startsWith('Object.assign(globalThis, React);')).toBe(true);
  });

  // The pad shows the user's code from line 1; the harness is appended after it so
  // Sucrase's "(line:col)" in the message points at what they can see.
  test('a syntax error names the line', () => {
    expect(() => compile('const x = ;\nconst y = 1;')).toThrow(/\(1:/);
  });
});

describe('formatArgs', () => {
  test('strings as-is, everything else as JSON, joined by a space', () => {
    expect(formatArgs(['n =', 42, { a: [1] }, undefined, null])).toBe('n = 42 {"a":[1]} undefined null');
  });

  test('cycles and functions fall back to String()', () => {
    const o: Record<string, unknown> = {};
    o.self = o;
    expect(formatArgs([o])).toBe('[object Object]');
    expect(formatArgs([() => 1])).toMatch(/=>/);
  });

  test('errors show name and message, not a stack into eval-ed code', () => {
    expect(formatArgs([new TypeError('boom')])).toBe('TypeError: boom');
  });
});
