import { useEffect, useRef, useState, type Dispatch } from 'react';
import { BackLink } from './BackLink';
import { Practice } from './Practice';
import { RATINGS } from './RatingRadios';
import { rounds } from '../data';
import type { LoggedQuestion, Persisted, RoleId, RoundId } from '../types';
import type { Action } from '../hooks/useAppState';
import { useDebouncedField } from '../hooks/useDebouncedField';
import { LOG_PREFIX, fromLocalDay, localDay, loggedQuestions } from '../lib/log';

const field = 'w-full rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700';

export function LogView({
  state, dispatch, strictMode, shortcuts = true, role,
}: { state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean; shortcuts?: boolean; role: RoleId }) {
  const [drilling, setDrilling] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  // Newest first; one day is usually one interview, so its questions sit together.
  const entries = Object.entries(state.log).sort(([, a], [, b]) => b.at - a.at);
  const days = [...new Set(entries.map(([, e]) => localDay(e.at)))];
  const drillable = loggedQuestions(state.log).length > 0;

  // The third question from the same interview shouldn't need its round picked again:
  // the round last picked here, else the newest entry's. Not just the newest entry's,
  // which after backdating yesterday's questions would keep offering today's round.
  const [pickedRound, setPickedRound] = useState<RoundId | null>(null);
  const lastRound = pickedRound ?? entries[0]?.[1].round ?? 'hm';

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <BackLink />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 tabIndex={-1} className="text-2xl font-semibold">Real questions</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Questions real interviewers asked you. Add them the same day.
          </p>
        </div>
        {!drilling && (
          <button
            type="button"
            onClick={() => {
              const id = crypto.randomUUID();
              dispatch({ type: 'createLogged', id, round: lastRound, now: Date.now() });
              setFocusId(id);
            }}
            className="shrink-0 rounded bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + Add question
          </button>
        )}
      </div>

      {drilling ? (
        <LogDrill state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} role={role} onDone={() => setDrilling(false)} />
      ) : entries.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-center text-zinc-500 dark:text-zinc-400">
          Nothing logged yet. After a real round, add each question you remember while it's fresh.
        </p>
      ) : (
        <>
          {drillable && (
            <button
              type="button"
              onClick={() => setDrilling(true)}
              className="mb-4 rounded border border-zinc-300 px-3 py-2 text-sm hover:border-emerald-500 dark:border-zinc-700"
            >
              Drill these
            </button>
          )}
          {days.map((d) => (
            <section key={d} className="mb-6">
              <h2 className="mb-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                {new Date(fromLocalDay(d)).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </h2>
              <ul className="space-y-3">
                {entries
                  .filter(([, e]) => localDay(e.at) === d)
                  .map(([id, entry]) => (
                    <LoggedEditor
                      key={id}
                      id={id}
                      entry={entry}
                      rating={state.progress[LOG_PREFIX + id]?.rating}
                      dispatch={dispatch}
                      onRoundPicked={setPickedRound}
                      focusQuestion={id === focusId}
                      // Cleared once used: a card that later remounts (re-dated into
                      // another day) must not take focus back to its question.
                      onFocused={() => setFocusId(null)}
                    />
                  ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </main>
  );
}

// Frozen on entry, like the Weak drill: Practice must not have its question set change
// under it. Back to the list and in again picks up new entries.
function LogDrill({
  state, dispatch, strictMode, shortcuts, role, onDone,
}: { state: Persisted; dispatch: Dispatch<Action>; strictMode: boolean; shortcuts: boolean; role: RoleId; onDone: () => void }) {
  const [questions] = useState(() => loggedQuestions(state.log));
  return (
    <>
      <button type="button" onClick={onDone} className="-my-2 mb-2 inline-block py-2 text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        Back to the list
      </button>
      <Practice questions={questions} state={state} dispatch={dispatch} strictMode={strictMode} shortcuts={shortcuts} role={role} lapId="log" />
    </>
  );
}

const isPlausibleDay = (day: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number(day.slice(0, 4)) >= 1970;

function LoggedEditor({
  id, entry, rating, dispatch, onRoundPicked, focusQuestion, onFocused,
}: {
  id: string; entry: LoggedQuestion; rating?: 1 | 2 | 3; dispatch: Dispatch<Action>;
  onRoundPicked: (round: RoundId) => void; focusQuestion: boolean; onFocused: () => void;
}) {
  const questionRef = useRef<HTMLTextAreaElement>(null);
  // Captured once, as Home does: a day-scale bound doesn't need a fresh clock per render.
  const [today] = useState(() => localDay(Date.now()));
  useEffect(() => {
    if (!focusQuestion) return;
    questionRef.current?.focus();
    onFocused();
  }, [focusQuestion, onFocused]);
  // A date typed key by key passes through partial values (year 0002, then 0020...).
  // Saving each one moved the card to another day, remounting it mid-typing, so the
  // date commits on blur or Enter, and only when it is a real date.
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const commitDate = () => {
    if (dateDraft !== null && isPlausibleDay(dateDraft)) dispatch({ type: 'saveLogged', id, at: fromLocalDay(dateDraft) });
    setDateDraft(null);
  };
  // Each field commits only itself; the reducer merges against the stored entry.
  const question = useDebouncedField(entry.question, (text) => dispatch({ type: 'saveLogged', id, question: text }));
  const answer = useDebouncedField(entry.answer, (text) => dispatch({ type: 'saveLogged', id, answer: text }));

  return (
    <li className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <textarea
        ref={questionRef}
        value={question.draft}
        onChange={(e) => question.onChange(e.target.value)}
        onBlur={question.onBlur}
        rows={2}
        placeholder="The question, as they asked it"
        aria-label="Question"
        className={`${field} font-medium`}
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <select
          value={entry.round}
          onChange={(e) => {
            dispatch({ type: 'saveLogged', id, round: e.target.value as RoundId });
            onRoundPicked(e.target.value as RoundId);
          }}
          aria-label="Round"
          className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
        >
          {rounds.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        <input
          type="date"
          value={dateDraft ?? localDay(entry.at)}
          max={today}
          onChange={(e) => setDateDraft(e.target.value)}
          onBlur={commitDate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDate();
          }}
          aria-label="Date"
          className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700"
        />
      </div>
      <textarea
        value={answer.draft}
        onChange={(e) => answer.onChange(e.target.value)}
        onBlur={answer.onBlur}
        rows={4}
        placeholder="What you said. Later, rewrite it into what you'd say next time."
        aria-label="Your answer"
        className={`${field} text-sm`}
      />
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{rating ? `Rated ${RATINGS.find((r) => r.value === rating)!.label}` : 'Not drilled yet'}</span>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Delete this question?')) dispatch({ type: 'deleteLogged', id });
          }}
          className="rounded border border-zinc-300 px-2 py-1 text-red-600 hover:border-red-500 dark:border-zinc-700 dark:text-red-400"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
