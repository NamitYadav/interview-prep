import { useEffect } from 'react';
import { useStoredValue } from './useStoredValue';

// Adding a theme means touching three other, untyped places: the pre-paint script in
// index.html (which values flash-avoid before first paint), the `@custom-variant dark`
// selector in index.css (which theme values ride on the dark: utilities), and
// ThemeToggle's LABELS (that one is type-checked against this array already).
// `system` is not a palette: it resolves to the Gruvbox pair from the OS setting, the
// same default the portfolio on this origin uses.
export const THEMES = ['system', 'dark', 'gruvbox', 'gruvbox-light', 'light'] as const;
export type Theme = (typeof THEMES)[number];
type Resolved = Exclude<Theme, 'system'>;

// Separate from the progress store on purpose: the theme is a per-device preference,
// not prep data, so it stays out of export/import backups and needs no schema version.
// The key is duplicated in the pre-paint script in index.html — keep the two in sync.
export const THEME_KEY = 'interview-prep:theme';

// Browser chrome colour per theme: each theme's page background.
const THEME_COLORS: Record<Resolved, string> = {
  dark: '#09090b', gruvbox: '#1d2021', 'gruvbox-light': '#fbf1c7', light: '#fafafa',
};

const isTheme = (v: unknown): v is Theme => (THEMES as readonly unknown[]).includes(v);
const decode = (raw: string | null): Theme => (isTheme(raw) ? raw : 'system');
// Nothing stored means System, so the pre-paint script needs no special case for it.
const encode = (t: Theme): string | null => (t === 'system' ? null : t);

const prefersLight = () => window.matchMedia?.('(prefers-color-scheme: light)');

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useStoredValue(THEME_KEY, decode, encode);

  useEffect(() => {
    const apply = () => {
      const resolved: Resolved = theme !== 'system' ? theme : prefersLight()?.matches ? 'gruvbox-light' : 'gruvbox';
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved]);
    };
    apply();
    if (theme !== 'system') return;
    const mq = prefersLight();
    mq?.addEventListener('change', apply);
    return () => mq?.removeEventListener('change', apply);
  }, [theme]);

  return [theme, setTheme];
}
