import { THEMES, useTheme, type Theme } from '../hooks/useTheme';

const LABELS: Record<Theme, string> = { dark: 'Dark', gruvbox: 'Gruvbox' };

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
          className={`rounded border px-2 py-1 text-xs ${
            theme === t
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-zinc-300 text-zinc-500 hover:border-emerald-500 dark:border-zinc-700 dark:text-zinc-400'
          }`}
        >
          {LABELS[t]}
        </button>
      ))}
    </div>
  );
}
