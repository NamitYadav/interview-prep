import { useRef, useState } from 'react';
import type { Rating } from '../types';

export const RATINGS: { value: Rating; label: string; className: string }[] = [
  { value: 1, label: 'Weak', className: 'border-red-500 text-red-600 dark:text-red-400' },
  { value: 2, label: 'OK', className: 'border-amber-500 text-amber-600 dark:text-amber-400' },
  { value: 3, label: 'Solid', className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
];

// The APG radio pattern with ONE tab stop for the group (the checked radio, or the
// first when nothing is checked). Before this, a screen reader announced "radio, 1 of
// 3" and then every arrow key did nothing — the only way to rate was a mouse click or
// the number shortcuts, which are undiscoverable and absent outside Practice.
//
// Arrows move focus WITHOUT selecting; Space or Enter commits. APG's default is
// selection-follows-focus, but it explicitly allows this variant when selection has
// significant consequences — and here it does: rating advances to the next question
// and tears this group down. With selection following focus, one arrow press rated the
// card and moved on, so a screen-reader user could never hear "OK" or "Solid" without
// committing to one of them.
export function RatingRadios({
  rating, onRate, showKeys = false,
}: { rating?: Rating; onRate: (r: Rating) => void; showKeys?: boolean }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const checkedIndex = RATINGS.findIndex((r) => r.value === rating);
  // Which option the arrow keys have moved to. Null means "follow the checked one",
  // so the group keeps a single tab stop without freezing focus where it started.
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const tabbableIndex = focusIndex ?? (checkedIndex === -1 ? 0 : checkedIndex);

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rate yourself">
      {RATINGS.map((r, i) => (
        <button
          key={r.value}
          type="button"
          role="radio"
          ref={(el) => { refs.current[i] = el; }}
          aria-checked={rating === r.value}
          tabIndex={i === tabbableIndex ? 0 : -1}
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
            setFocusIndex(next);
            refs.current[next]?.focus();
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
