import { THEMES, useTheme, type Theme } from '../hooks/useTheme';
import { panelToggle } from './controlStyles';

const LABELS: Record<Theme, string> = {
  system: 'System', dark: 'Dark', gruvbox: 'Gruvbox', 'gruvbox-light': 'Gruvbox Light', light: 'Light',
};

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  // A two-column grid, not a single row: the labels (one two words long) don't fit
  // the 288px popover on one line. System spans the top row above the four palettes.
  return (
    <div role="group" aria-label="Theme" className="grid grid-cols-2 gap-1">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTheme(t)}
          aria-pressed={theme === t}
          className={`${panelToggle(theme === t)}${t === 'system' ? ' col-span-2' : ''}`}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  );
}
