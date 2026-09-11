import { useEffect, useState } from 'react';

export const THEMES = ['dark', 'gruvbox', 'light'] as const;
export type Theme = (typeof THEMES)[number];

// Separate from the progress store on purpose: the theme is a per-device preference,
// not prep data, so it stays out of export/import backups and needs no schema version.
// The key is duplicated in the pre-paint script in index.html — keep the two in sync.
export const THEME_KEY = 'interview-prep:theme';

const isTheme = (v: unknown): v is Theme => (THEMES as readonly unknown[]).includes(v);

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isTheme(v) ? v : 'dark';
  } catch {
    return 'dark';
  }
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Storage can be unavailable (private mode, blocked cookies); the app already
    // surfaces that for progress, so a lost theme preference just falls back.
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch { /* empty */ }
  }, [theme]);

  return [theme, setTheme];
}
