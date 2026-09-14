import { pageButton } from './controlStyles';

/** The value that clears the filter. A native <select> option cannot hold null. */
export const ALL = '';

// The only native-chrome control left in the app: a bare <select> painted its own
// light box and OS arrow over a dark theme. `appearance-none` plus the same classes
// the Settings trigger uses puts it back in the app's own scale, and the chevron is
// drawn here so it inherits the text colour. The element stays a real <select> — the
// mobile picker and the keyboard behaviour are not worth rebuilding.
export function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  // w-fit, not the default block: in a block parent (the Search view) the wrapper
  // would span the full width and strand the chevron at the far right edge.
  return (
    <div className="relative mb-2 w-fit">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${pageButton} appearance-none pr-8`}
      >
        {/* The popup list is drawn by the OS, so only the option's own background
            follows the theme — without this it renders near-white in dark mode. */}
        {options.map((o) => <option key={o.value} value={o.value} className="dark:bg-zinc-900">{o.label}</option>)}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 10 6"
        className="pointer-events-none absolute right-3 top-1/2 h-1.5 w-2.5 -translate-y-1/2 fill-none stroke-current stroke-2 opacity-60"
      >
        <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export const STATUS_OPTIONS = [
  { value: 'all', label: 'All questions' },
  { value: 'unseen', label: 'Unseen' },
  { value: 'weak', label: 'Weak' },
  { value: 'ok', label: 'OK' },
  { value: 'solid', label: 'Solid' },
];
