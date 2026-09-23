import { THEMES, useTheme, type Theme } from '../hooks/useTheme';
import { panelToggle } from './controlStyles';

const LABELS: Record<Theme, string> = {
  dark: 'Dark', gruvbox: 'Gruvbox', 'gruvbox-light': 'Gruvbox Light', light: 'Light',
};

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  // A 2x2 grid, not a single row: four labels (one two words long) no longer fit
  // the 288px popover on one line without wrapping mid-label.
  return (
    <div role="group" aria-label="Theme" className="grid grid-cols-2 gap-1">
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTheme(t)}
          aria-pressed={theme === t}
          className={panelToggle(theme === t)}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  );
}
