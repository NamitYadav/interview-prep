import { useRef } from 'react';
import type { Rating } from '../types';

export const RATINGS: { value: Rating; label: string; className: string }[] = [
  { value: 1, label: 'Weak', className: 'border-red-500 text-red-600 dark:text-red-400' },
  { value: 2, label: 'OK', className: 'border-amber-500 text-amber-600 dark:text-amber-400' },
  { value: 3, label: 'Solid', className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
];

// The APG radio pattern, the same way RoundView's tablist does it: one tab stop for
// the whole group (the checked radio, or the first when nothing is checked) and the
// arrow keys move between the options and select as they go. Before this, a screen
// reader announced "radio, 1 of 3" and then every arrow key did nothing — the only
// way to rate was a mouse click or the number shortcuts, which are undiscoverable
// and gone entirely outside Practice.
export function RatingRadios({
  rating, onRate, showKeys = false,
}: { rating?: Rating; onRate: (r: Rating) => void; showKeys?: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const checkedIndex = RATINGS.findIndex((r) => r.value === rating);

  const move = (index: number) => {
    // Focus first: onRate can unmount this group (rating the last question of a lap),
    // and moving focus after that would be a no-op on a detached node.
    refs.current[index]?.focus();
    onRate(RATINGS[index]!.value);
  };

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rate yourself">
      {RATINGS.map((r, i) => (
        <button
          key={r.value}
          type="button"
          role="radio"
          ref={(el) => { refs.current[i] = el; }}
          aria-checked={rating === r.value}
          tabIndex={(checkedIndex === -1 ? i === 0 : i === checkedIndex) ? 0 : -1}
          onClick={() => onRate(r.value)}
          onKeyDown={(e) => {
            const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
            if (!keys.includes(e.key)) return;
            e.preventDefault();
            const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
            const next =
              e.key === 'Home' ? 0 :
              e.key === 'End' ? RATINGS.length - 1 :
              back ? (i - 1 + RATINGS.length) % RATINGS.length :
              (i + 1) % RATINGS.length;
            move(next);
          }}
          className={`rounded border px-4 py-2 ${r.className} ${rating === r.value ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}
        >
          {r.label}{' '}
          {showKeys && <kbd className="ml-1 text-xs opacity-70 [@media(hover:none)]:hidden">{r.value}</kbd>}
        </button>
      ))}
    </div>
  );
}
