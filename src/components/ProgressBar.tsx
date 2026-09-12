import type { RoundStats } from '../lib/queue';

// One stacked bar instead of a solid-only bar plus a four-number caption: the same
// red/amber/emerald the rating buttons use, so the split is readable at a glance and
// the caption can shrink to what actually changes your next move.
export function ProgressBar({ stats, label }: { stats: RoundStats; label: string }) {
  const pct = (n: number) => (stats.total === 0 ? 0 : (n / stats.total) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={stats.solid}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, stats.total)}
      aria-valuetext={`${stats.solid} solid, ${stats.ok} ok, ${stats.weak} weak, ${stats.unrated} unrated of ${stats.total}`}
      className="flex h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800"
    >
      <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${pct(stats.solid)}%` }} />
      <div className="h-full bg-amber-500 transition-[width]" style={{ width: `${pct(stats.ok)}%` }} />
      <div className="h-full bg-red-500 transition-[width]" style={{ width: `${pct(stats.weak)}%` }} />
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Only the numbers that change what you do next: weak, unseen, and the clock. */
export function statsCaption(stats: RoundStats, daysLeft?: number | null): string {
  const parts: string[] = [];
  if (stats.weak > 0) parts.push(`${stats.weak} weak`);
  if (stats.unrated > 0) parts.push(`${stats.unrated} unseen`);
  if (parts.length === 0) parts.push('All rated');
  if (daysLeft !== undefined && daysLeft !== null) parts.push(plural(daysLeft, 'day'));
  return parts.join(' · ');
}
