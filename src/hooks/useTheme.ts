import { useEffect } from 'react';
import { useStoredValue } from './useStoredValue';

// Adding a theme means touching three other, untyped places: the pre-paint script in
// index.html (which values flash-avoid before first paint), the `@custom-variant dark`
// selector in index.css (which theme values ride on the dark: utilities), and
// ThemeToggle's LABELS (that one is type-checked against this array already).
export const THEMES = ['dark', 'gruvbox', 'light'] as const;
export type Theme = (typeof THEMES)[number];

// Separate from the progress store on purpose: the theme is a per-device preference,
// not prep data, so it stays out of export/import backups and needs no schema version.
// The key is duplicated in the pre-paint script in index.html — keep the two in sync.
export const THEME_KEY = 'interview-prep:theme';

const isTheme = (v: unknown): v is Theme => (THEMES as readonly unknown[]).includes(v);
const decode = (raw: string | null): Theme => (isTheme(raw) ? raw : 'dark');
const encode = (t: Theme): string => t;

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useStoredValue(THEME_KEY, decode, encode);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return [theme, setTheme];
}
