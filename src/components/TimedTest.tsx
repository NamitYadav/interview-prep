import { useEffect, useMemo, useState, type Dispatch } from 'react';
import type { Persisted, Progress, Question, RoleId } from '../types';
import type { Action } from '../hooks/useAppState';
import { forRole } from '../data';
import { orderQueue } from '../lib/queue';
import { useQuestionTimer } from '../hooks/useQuestionTimer';
import { clearDraft, draftKey, readDraft } from '../lib/drafts';
import { clearTimedTest, readTimedTest, writeTimedTest, type TimedTestState } from '../lib/lap';
import { buildCases, type CaseResult } from '../lib/grade';
import { gradeRun } from '../lib/gradeRun';
import { formatTime } from '../lib/format';
import { ScratchPad } from './ScratchPad';
import { GradeReport } from './GradeReport';
import { RatingRadios } from './RatingRadios';

export const TEST_TASKS = 3;
export const TEST_SECONDS = 90 * 60;
// Past twice its length a test was abandoned, not paused.
const RESUMABLE_MS = 2 * TEST_SECONDS * 1000;
// Its own draft slot: a test starts from the blank starter, not from your practice pad.
const DRAFT_FIELD = 'test';

const primary = 'rounded bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300';
const secondary = 'rounded border border-zinc-300 px-3 py-1 text-sm hover:border-emerald-500 dark:border-zinc-700';

/** Weakest first, one task per category — a real Codility test mixes topics. */
export function drawTest(questions: Question[], progress: Progress, random: () => number = Math.random): Question[] {
  const picked: Question[] = [];
  const categories = new Set<string>();
  for (const q of orderQueue(questions, progress, Date.now(), random)) {
    if (categories.has(q.category)) continue;
    picked.push(q);
    categories.add(q.category);
    if (picked.length === TEST_TASKS) break;
  }
  return picked;
}

const clearTestDrafts = (ids: string[]) => {
  for (const id of ids) clearDraft(draftKey(id, DRAFT_FIELD));
};

export function TimedTest({ state, dispatch, role }: { state: Persisted; dispatch: Dispatch<Action>; role: RoleId }) {
  const pool = forRole(role).byRound('algo');
  const [session, setSession] = useState<TimedTestState | undefined>(() => {
    const saved = readTimedTest();
    if (saved && Date.now() - saved.startedAt < RESUMABLE_MS && saved.questionIds.every((id) => pool.some((q) => q.id === id))) return saved;
    if (saved) clearTimedTest();
    return undefined;
  });
  const save = (next: TimedTestState | undefined) => {
    if (next) writeTimedTest(next);
    else clearTimedTest();
    setSession(next);
  };

  if (!session) {
    return (
      <article className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-medium">Timed test</h2>
        <p className="mb-4 max-w-prose text-zinc-600 dark:text-zinc-400">
          Three tasks from three different categories, one 90-minute clock. Run examples as often as you like; the hidden
          tests run when you submit or when the clock reaches zero.
        </p>
        <button
          type="button"
          className={primary}
          onClick={() => {
            const ids = drawTest(pool, state.progress).map((q) => q.id);
            clearTestDrafts(ids);
            save({ questionIds: ids, startedAt: Date.now(), submitted: false });
          }}
        >
          Start test
        </button>
      </article>
    );
  }
  return (
    <TestSession
      key={session.startedAt}
      session={session}
      pool={pool}
      state={state}
      dispatch={dispatch}
      onSubmit={() => save({ ...session, submitted: true })}
      onNew={() => {
        clearTestDrafts(session.questionIds);
        save(undefined);
      }}
    />
  );
}

type Report = { results: CaseResult[] } | { error: string };

function TestSession({
  session, pool, state, dispatch, onSubmit, onNew,
}: {
  session: TimedTestState; pool: Question[]; state: Persisted; dispatch: Dispatch<Action>;
  onSubmit: () => void; onNew: () => void;
}) {
  // Memoised so the grading effect below does not restart (and cancel itself) on every
  // re-render its own results cause.
  const tasks = useMemo(() => session.questionIds.map((id) => pool.find((q) => q.id === id)!), [pool, session.questionIds]);
  const [active, setActive] = useState(0);
  const [reports, setReports] = useState<Record<string, Report>>({});

  // Codility hands the test in at zero, so this one auto-submits — on a resumed session
  // whose deadline already passed, immediately.
  const { remainingMs } = useQuestionTimer({
    targetSeconds: TEST_SECONDS, strictMode: true, revealed: session.submitted, onAutoReveal: onSubmit, startedAt: session.startedAt,
  });

  // Runs after the pads unmount on submit, and unmounting flushes their debounced drafts,
  // so the last keystrokes before an auto-submit are in what gets graded. One task at a
  // time: three workers racing each other would skew the timings the limits judge.
  useEffect(() => {
    if (!session.submitted) return;
    let alive = true;
    let cancel = () => {};
    const gradeFrom = (k: number) => {
      const q = tasks[k];
      if (!alive || !q) return;
      const settle = (report: Report) => {
        setReports((r) => ({ ...r, [q.id]: report }));
        gradeFrom(k + 1);
      };
      cancel = gradeRun(readDraft(draftKey(q.id, DRAFT_FIELD)) ?? q.code ?? '', q.grader!.fn, buildCases(q.grader!, q.id), {
        onDone: (results) => settle({ results }),
        onLoadError: (error) => settle({ error }),
      });
    };
    gradeFrom(0);
    return () => {
      alive = false;
      cancel();
    };
  }, [session.submitted, tasks]);

  if (!session.submitted) {
    const q = tasks[active]!;
    return (
      <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Tasks" className="flex gap-2">
            {tasks.map((t, i) => (
              <button key={t.id} type="button" aria-pressed={i === active} onClick={() => setActive(i)} className={i === active ? `${secondary} border-emerald-500` : secondary}>
                Task {i + 1}
              </button>
            ))}
          </div>
          {remainingMs !== null && (
            <p role="timer" aria-live="off" className="text-xs text-zinc-500 dark:text-zinc-400">Time left: {formatTime(remainingMs)}</p>
          )}
        </div>
        <h2 className="mb-2 text-lg font-medium">{q.question}</h2>
        <pre className="mb-4 max-w-prose whitespace-pre-wrap rounded bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-800">{q.statement}</pre>
        <ScratchPad key={q.id} question={q} draftField={DRAFT_FIELD} submit={false} />
        <button type="button" onClick={onSubmit} className={primary}>Submit test</button>
      </article>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((q, i) => {
        const report = reports[q.id];
        return (
          <article key={q.id} className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-2 text-lg font-medium">Task {i + 1}: {q.question}</h2>
            {report === undefined ? (
              <p role="status">Grading…</p>
            ) : 'error' in report ? (
              <p role="alert" className="text-amber-700 dark:text-amber-400">✗ {report.error}</p>
            ) : (
              <GradeReport results={report.results} />
            )}
            <details className="my-3">
              <summary className="cursor-pointer font-semibold">Model answer</summary>
              <div className="mt-2 max-w-prose space-y-2">
                {q.answer.map((p, j) => <p key={j}>{p}</p>)}
                <ul className="list-disc pl-5">{q.keyPoints.map((k, j) => <li key={j}>{k}</li>)}</ul>
              </div>
            </details>
            <RatingRadios rating={state.progress[q.id]?.rating} onRate={(r) => dispatch({ type: 'rate', id: q.id, rating: r, now: Date.now() })} />
          </article>
        );
      })}
      <button type="button" onClick={onNew} className={primary}>New test</button>
    </div>
  );
}
