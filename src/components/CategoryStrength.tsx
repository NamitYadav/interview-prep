import { useMemo } from 'react';
import type { Progress, Question } from '../types';
import { categoryVerdict, roundStats, type Verdict } from '../lib/queue';
import { ProgressBar } from './ProgressBar';

// The same red/amber/emerald the rating buttons and the stacked bar already use, so the
// word and the bar beside it read as one statement.
const VERDICT: Record<Verdict, { label: string; className: string }> = {
  weak: { label: 'Weak', className: 'text-red-600 dark:text-red-400' },
  ok: { label: 'OK', className: 'text-amber-600 dark:text-amber-400' },
  solid: { label: 'Solid', className: 'text-emerald-600 dark:text-emerald-400' },
  unrated: { label: 'Unrated', className: 'text-zinc-500 dark:text-zinc-400' },
};

/**
 * Where you stand in each category of a round, one row each.
 *
 * Collapsed by default, and a <details> rather than a hand-built disclosure: the round
 * already shows one bar for the whole round, and seventeen permanent rows would push the
 * question itself below the fold — the same reason the category chips became a select.
 */
export function CategoryStrength({ questions, progress }: { questions: Question[]; progress: Progress }) {
  const rows = useMemo(() => {
    const byCategory = new Map<string, Question[]>();
    for (const q of questions) {
      const list = byCategory.get(q.category);
      if (list) list.push(q);
      else byCategory.set(q.category, [q]);
    }
    return [...byCategory].map(([category, qs]) => {
      const stats = roundStats(qs, progress);
      return { category, stats, verdict: VERDICT[categoryVerdict(stats)] };
    });
  }, [questions, progress]);

  // One category means this panel would only restate the round's own bar.
  if (rows.length < 2) return null;

  return (
    <details className="mb-4">
      <summary className="text-xs text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400">
        By category
      </summary>
      <ul className="mt-2 space-y-2">
        {rows.map(({ category, stats, verdict }) => (
          <li key={category}>
            {/* Name above the bar rather than beside it: category names run long
                ("Architecture & system design") and a side-by-side row truncated them
                on a phone. */}
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span>{category}</span>
              <span className={verdict.className}>{verdict.label}</span>
            </div>
            <ProgressBar stats={stats} label={`${category} progress`} />
          </li>
        ))}
      </ul>
    </details>
  );
}
