import { THEMES, useTheme, type Theme } from '../hooks/useTheme';
import { panelToggle } from './controlStyles';

const LABELS: Record<Theme, string> = { dark: 'Dark', gruvbox: 'Gruvbox', light: 'Light' };

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  return (
    <div role="group" aria-label="Theme" className="flex gap-1">
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
