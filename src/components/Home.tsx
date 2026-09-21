import { useState } from 'react';
import type { Persisted, RoleId } from '../types';
import { forRole } from '../data';
import { roles } from '../data/roles';
import { roundStats } from '../lib/queue';
import { useLoopDate } from '../hooks/useLoopDate';
import { ExportButton, useLastExport } from './ExportImport';
import { ProgressBar, plural, statsCaption } from './ProgressBar';
import { Select } from './Select';

// Every card in a grid shares this shape so a short blurb never leaves the card
// shorter than its neighbors: min-h reserves two lines' worth of space up front, and
// the grid row stretches to its tallest card if one runs longer (no clamp — it cut
// two blurbs mid-word on a laptop).
const cardLink = 'flex flex-col rounded-lg border border-zinc-200 bg-white p-4 hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900';
const cardBlurb = 'min-h-10 text-sm text-zinc-600 dark:text-zinc-400';

// Drills are utilities, not the sequence: a quiet list beside the round cards rather
// than six more cards that look like rounds.
const drillLink = 'flex items-baseline justify-between gap-4 py-3 hover:text-emerald-600 dark:hover:text-emerald-400';
const drillMeta = 'text-right text-sm text-zinc-500 dark:text-zinc-400';

const startOfToday = (now: number): number => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return today.getTime();
};

const daysUntil = (dateStr: string, now: number): number => {
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - startOfToday(now)) / 86_400_000);
};

// The one line under the date input. Past the date it stops counting: "-3 days left"
// read as a bug, and the cards below were still being sorted by an urgency that no
// longer means anything.
const loopDateLabel = (daysLeft: number): string =>
  daysLeft < 0 ? 'Loop date has passed' : daysLeft === 0 ? 'Loop day is today' : `${plural(daysLeft, 'day')} left`;

const EXPORT_STALE_MS = 7 * 86_400_000;

export function Home({ state, role, setRole }: { state: Persisted; role: RoleId; setRole: (r: RoleId) => void }) {
  const { role: activeRole, rounds: roleRounds, questions: roleQuestions, byRound } = forRole(role);
  const weak = roleQuestions.filter((q) => state.progress[q.id]?.rating === 1).length;
  const noted = roleQuestions.filter((q) => (state.notes[q.id] ?? '').trim().length > 0).length;
  const stories = Object.values(state.stories);
  const neverRehearsed = stories.filter((s) => s.lastRehearsed === undefined).length;

  // Captured once at mount rather than read fresh each render — Date.now() is
  // impure, and a millisecond-stale "now" makes no visible difference to a
  // day-scale count or a week-scale staleness check.
  const [now] = useState(() => Date.now());

  const [loopDate, setLoopDate] = useLoopDate();
  const daysLeft = loopDate ? daysUntil(loopDate, now) : null;
  // Only a date still ahead drives the readiness sort and the per-card countdown.
  const upcoming = daysLeft !== null && daysLeft >= 0;

  const lastExport = useLastExport();
  const hasProgress = Object.keys(state.progress).length > 0;
  const exportIsStale = hasProgress && (!lastExport || now - Number(lastExport) > EXPORT_STALE_MS);

  // `lastSeen` is the latest rating's time, so this is "questions you rated in the
  // window", which is the number that tells you whether you drilled today at all. It
  // needs no rating history: a question rated twice today still counts once, which is
  // what "questions drilled" means.
  const ratedSince = (since: number) => roleQuestions.filter((q) => (state.progress[q.id]?.lastSeen ?? 0) >= since).length;
  const ratedToday = ratedSince(startOfToday(now));
  const ratedThisWeek = ratedSince(startOfToday(now) - 6 * 86_400_000);

  const roundCards = roleRounds.map((round, index) => ({
    round,
    index,
    stats: roundStats(byRound(round.id), state.progress),
  }));
  // With a loop date ahead the cards sort by urgency, and a "Round 3" label on the
  // first card would contradict its position — so the label only shows in data order.
  const orderedCards = upcoming
    ? [...roundCards].sort((a, b) => (b.stats.weak * 2 + b.stats.unrated) - (a.stats.weak * 2 + a.stats.unrated))
    : roundCards;

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-6">
        <h1 tabIndex={-1} className="text-2xl font-semibold">Interview Prep</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{activeRole.title} · Berlin / EU loop</p>
        {hasProgress && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {plural(ratedToday, 'question')} rated today · {ratedThisWeek} in the last 7 days
          </p>
        )}
      </header>

      {/* Each label travels with its control: at 375px the row wraps, and a bare "Role"
          label was left stranded at the end of line one with its select on line two. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <label htmlFor="loop-date" className="text-zinc-600 dark:text-zinc-400">Loop date</label>
          <input
            id="loop-date"
            type="date"
            value={loopDate ?? ''}
            onChange={(e) => setLoopDate(e.target.value || null)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
          />
          {daysLeft !== null && <span className="text-zinc-500 dark:text-zinc-400">{loopDateLabel(daysLeft)}</span>}
        </span>
        <span className="flex items-center gap-2">
          <label htmlFor="role" className="text-zinc-600 dark:text-zinc-400">Role</label>
          <Select
            id="role"
            label="Role"
            value={role}
            onChange={(v) => setRole(v as RoleId)}
            options={roles.map((r) => ({ value: r.id, label: r.title }))}
          />
        </span>
      </div>

      {exportIsStale && (
        <p role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          <span>Back up your progress — {lastExport ? 'it has been over a week since your last export' : "you haven't exported yet"}.</span>
          <ExportButton state={state} className="font-medium underline underline-offset-2" />
        </p>
      )}

      {/* Seven cards in two columns: the odd one out spans the row rather than sitting alone.
          In data order that is the last card; sorted by urgency it is the first, so the
          widest card is the round that needs the most work, not the least. */}
      <ol className="grid gap-3 sm:grid-cols-2">
        {orderedCards.map(({ round, index, stats: s }) => (
          <li key={round.id} className={`flex ${upcoming ? 'sm:first:col-span-2' : 'sm:last:col-span-2'}`}>
            <a href={`#${round.id}`} className={`w-full text-left ${cardLink}`}>
              {!upcoming && <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Round {index + 1}</div>}
              <h2 className="font-medium">{round.title}</h2>
              <p className={`mb-3 ${cardBlurb}`}>{round.blurb}</p>
              <div className="mt-auto">
                <ProgressBar stats={s} label={`${round.title} progress`} />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{statsCaption(s, upcoming ? daysLeft : null)}</p>
              </div>
            </a>
          </li>
        ))}
      </ol>

      <nav className="mt-8 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800" aria-label="Drills">
        <a href="#weak" className={drillLink}>
          <span className="font-medium">Weak drill</span>
          <span className={drillMeta}>{weak} rated weak</span>
        </a>
        <a href="#mock" className={drillLink}>
          <span className="font-medium">Mock session</span>
          <span className={drillMeta}>A cross-round set in one sitting</span>
        </a>
        <a href="#notes" className={drillLink}>
          <span className="font-medium">My notes</span>
          <span className={drillMeta}>{noted} with a note</span>
        </a>
        <a href="#stories" className={drillLink}>
          <span className="font-medium">My stories</span>
          <span className={drillMeta}>{stories.length} {stories.length === 1 ? 'story' : 'stories'} · {neverRehearsed} never rehearsed</span>
        </a>
        <a href="#search" className={drillLink}>
          <span className="font-medium">Search</span>
          <span className={drillMeta}>Every question in your loop</span>
        </a>
        <a href="#print" className={drillLink}>
          <span className="font-medium">Print cheat sheet</span>
          <span className={drillMeta}>Weak questions and notes, by round</span>
        </a>
      </nav>
    </main>
  );
}
