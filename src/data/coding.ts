import type { Question } from '../types';

export const coding: Question[] = [
  // Pairing & building (9)
  {
    id: 'coding-001',
    round: 'coding',
    category: 'Pairing & building',
    question: 'The interviewer shares a blank editor and says "build an autocomplete". Walk me through your first five minutes before you type any implementation.',
    answer: [
      'Restate the ask out loud in one sentence, then ask the two or three questions that actually change the shape of the code: is the data source local or a network call, is the list bounded or thousands of rows, and does selection need to be keyboard-operable. Anything with an obvious default you state as an assumption instead of asking.',
      'Say what you are deliberately not building, so the interviewer knows it is a choice rather than an oversight: [no virtualisation unless the list is large], [no debounce tuning beyond a sensible default], [no styling beyond structure].',
      'Sketch the state before the JSX, out loud: what the query is, what the results are, whether "loading" is a boolean or derived, and what the selected index is. Getting the state shape wrong is the single most expensive mistake in a timed build, because every later line depends on it.',
      'Only then type, and type the skeleton first: the component signature, the state, and a static render. A visible non-working shell in minute five is far stronger than a half-typed clever version in minute fifteen.',
    ],
    keyPoints: [
      'Restates the ask and asks only scope-changing questions',
      'Names explicit non-goals up front rather than silently skipping them',
      'Designs the state shape out loud before writing JSX',
      'Gets a rendering skeleton on screen early instead of perfecting one piece',
    ],
    followUps: ['Which of those clarifying questions would you skip if the interviewer seemed impatient?', 'What would change if they said the data source is a slow network call?'],
  },
  {
    id: 'coding-002',
    round: 'coding',
    category: 'Pairing & building',
    question: 'How do you narrate while coding without either going silent or rambling over your own thinking?',
    answer: [
      'Narrate decisions, not keystrokes. "I am putting the selected index in state rather than deriving it, because the list can reorder" is useful; "now I am typing a div" is noise. The interviewer is scoring judgement, and judgement is only visible when you say the alternative you rejected.',
      'Use the silence deliberately when you genuinely need to think: say "give me twenty seconds to work through this edge case" and then go quiet. An announced pause reads as composure; an unannounced two-minute silence reads as being stuck.',
      'Narrate at boundaries rather than continuously: before starting a piece, say what you are about to do; after finishing it, say what you know works and what is still missing. That rhythm gives the interviewer natural places to steer you without interrupting. When you are debugging rather than building, the same rhythm becomes hypothesis and test in one breath — "I think the effect is re-running every render, and I will check by logging at the top of it" — followed by what the result ruled out, so a wrong guess reads as narrowing rather than wandering. Keep the ruled-out list spoken and cumulative — "so it is not the fetch and not the reducer" — and hold a second theory in reserve before you test the first, so a disproved guess turns straight into the next test instead of a restart.',
      'If you notice you are talking to avoid admitting confusion, stop and name the confusion instead. "I am not sure whether this should live in state or a ref, here is the trade-off" is a strong staff-level move; filling air is not.',
    ],
    keyPoints: [
      'Narrates decisions and rejected alternatives, not keystrokes',
      'Announces thinking pauses rather than going silent unexpectedly',
      'Speaks at task boundaries so the interviewer can steer',
      'When debugging, says what each test ruled out and keeps a second theory in reserve',
      'Names confusion directly instead of talking around it',
    ],
    followUps: ['How do you adapt if the interviewer is completely silent back?', 'What do you do when narrating is visibly slowing your typing down?'],
  },
  {
    id: 'coding-003',
    round: 'coding',
    category: 'Pairing & building',
    question: 'You are thirty minutes into a forty-five minute build and the core flow still does not work. What do you do?',
    answer: [
      'Say it out loud immediately: "I am behind where I wanted to be, so I am going to cut X to get the main flow working." Announcing the trade-off converts a bad situation into evidence of judgement. Discovering it silently at minute forty-four does not.',
      'Cut toward a working narrow path rather than a broken wide one. Hard-code the thing you were going to make configurable, drop the second feature entirely, and get one end-to-end flow that runs. A working subset is a pass; a non-running superset usually is not.',
      'Resist the urge to debug something incidental. If a piece of setup is fighting you, stub it out with a comment saying what the real version would do, and keep moving toward the core behaviour they asked for.',
      'In the last few minutes, stop coding and talk: what works, what you cut, what you would do next with another hour. That summary is often what the interviewer writes down.',
    ],
    keyPoints: [
      'Surfaces being behind schedule out loud rather than hiding it',
      'Cuts breadth to reach one working end-to-end path',
      'Stubs incidental blockers instead of debugging them under time pressure',
      'Reserves the final minutes for a spoken summary of state and next steps',
    ],
    followUps: ['What would you never cut, even at minute forty?', 'How do you tell the difference between a blocker worth debugging and one worth stubbing?'],
  },
  {
    id: 'coding-004',
    round: 'coding',
    category: 'Pairing & building',
    question: 'The interviewer hands you this starting component and asks you to make it production-ready. Where do you start?',
    code: `function ProductSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    fetch('/api/products?q=' + query)
      .then((r) => r.json())
      .then(setResults);
  }, [query]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {results.map((p) => <div>{p.name}</div>)}
    </div>
  );
}`,
    answer: [
      'Read it and list what is missing before touching anything, so the interviewer hears your priority order rather than watching you pick at whatever is nearest the cursor. Here the real issues are: an unencoded query string, no handling of a rejected fetch or a non-ok response, no loading state at all, a request per keystroke with no debounce, a missing key on the list, and an unlabelled input.',
      'Fix in risk order, not in file order. The unencoded query goes first, because a query containing an ampersand or a hash silently sends a different request than the user typed, and that is a correctness bug rather than a polish item. Then the failure handling, then the debounce, then the accessibility and the key. Saying "I am fixing the correctness problems before the polish" is itself the answer they are listening for.',
      'Name what the missing error path costs, concretely: fetch does not reject on a 500, so res.json() either throws on an HTML error page or hands back an error payload that gets rendered as results. With no catch and no res.ok check, the user sees the previous results sitting there forever with no indication that anything failed.',
      'Say out loud what you would extract only if it earns it. A starting component like this does not need a custom hook to be correct, so pulling one out is a judgement call about reuse, not a fix. The same restraint now applies to memoisation: with the React Compiler enabled, most useMemo and useCallback calls in a component like this are redundant, and manual memoisation is worth writing only where you can name the reason the compiler cannot help — a value crossing into non-compiled code, or a dependency you are stabilising for an effect rather than for a render.',
    ],
    keyPoints: [
      'Enumerates problems before editing, in an explicit priority order',
      'Fixes correctness before polish and says so',
      'Names the unencoded query string as a bug, not a style point',
      'Says a res.ok check is needed because fetch does not reject on a 500',
      'Treats extraction and manual memoisation as optional, and names the React Compiler',
    ],
    followUps: ['Which of those fixes would you do inline versus leave as a comment?', 'What would you render while the request is in flight, and why not just a spinner?'],
  },
  {
    id: 'coding-005',
    round: 'coding',
    category: 'Pairing & building',
    question: 'How much accessibility do you do inline during a timed build, and how much do you flag as "I would add this next"?',
    answer: [
      'Do inline the things that are cheap and structural, because they are harder to retrofit than to type: real semantic elements instead of clickable divs, a label tied to every input, and a sensible heading order. These cost seconds and their absence reads as a habit rather than a time constraint.',
      'Flag rather than build the things that need real care: a full combobox keyboard and ARIA pattern, focus management across a modal, or live-region announcements. Say "the correct pattern here is a combobox with active-descendant, which I would rather implement properly than half-do in the time we have" so the interviewer knows you know the pattern exists.',
      'Never claim accessibility you have not implemented. Sprinkling ARIA attributes onto a component whose keyboard behaviour does not exist is worse than plain markup, and an interviewer who knows the area will spot it immediately.',
      'If they ask you to pick one thing, pick keyboard operability of the main flow. An interface you cannot drive without a mouse is broken for a real user in a way that a missing announcement usually is not.',
    ],
    keyPoints: [
      'Does the cheap structural basics inline: semantics, labels, heading order',
      'Flags full keyboard and ARIA patterns rather than half-implementing them',
      'Refuses to add ARIA attributes that imply unbuilt behaviour',
      'Prioritises keyboard operability of the core flow when forced to choose',
    ],
    followUps: ['What is the most common accessibility mistake you see in interview code?', 'How would you verify the keyboard flow with two minutes left?'],
  },
  {
    id: 'coding-006',
    round: 'coding',
    category: 'Pairing & building',
    question: 'The interviewer suggests an approach you think is worse than yours. What do you do?',
    answer: [
      'Take it seriously first, out loud, because sometimes the hint encodes a constraint you have not been told. Repeat back what you understood the suggestion to be, which either confirms it or surfaces that you were solving different problems.',
      'Then state your reasoning as a trade-off rather than a verdict: "I was going to keep this derived rather than in state, because it cannot then disagree with the source of truth. Your way is fewer moving parts up front. Which matters more here?" That gives them room to supply the missing constraint.',
      'If they hold their position, do it their way and say why you are: "happy to go with that, it is a reasonable call and this is your codebase in this exercise". A staff engineer who can be overruled without friction is more valuable than one who wins a whiteboard argument.',
      'If the suggestion is actually incorrect rather than merely different, say so plainly and concretely, with the failing case: "that would break when the list reorders, because the index no longer points at the same row". Naming the specific failure is disagreement done well; sighing and complying is not.',
    ],
    keyPoints: [
      'Restates the suggestion first to check for a missing constraint',
      'Frames disagreement as a trade-off question, not a verdict',
      'Yields gracefully and visibly when overruled',
      'Escalates with a concrete failing case when the suggestion is genuinely wrong',
    ],
    followUps: ['Has an interviewer hint ever changed your approach for the better?', 'How do you tell a hint apart from a test of whether you will cave?'],
  },
  {
    id: 'coding-007',
    round: 'coding',
    category: 'Pairing & building',
    question: 'When do you write a test during a live coding round, and when is it a waste of the clock?',
    answer: [
      'Write a test when it is faster than the alternative. If the logic has a shape you would otherwise verify by clicking through the UI repeatedly, one test on that function is the cheaper loop, and you get credit for the habit as a side effect.',
      'Skip the test when the code is a thin render with no branching. A test asserting that a component renders a heading proves nothing, costs minutes, and an interviewer reading it sees test theatre rather than test discipline.',
      'Ask rather than assume: "do you want me to build this test-first, or build it and then test the interesting part?" Some panels are explicitly scoring TDD and some consider it a waste of a short slot, and the question itself signals that you have an opinion either way.',
      'If there is no time, say what you would test and why, naming the specific case: "I would test that a superseded response cannot overwrite a newer one, since that is the bug most likely to survive review". Naming the right test earns most of the credit of writing it.',
    ],
    keyPoints: [
      'Writes a test when it is the faster verification loop',
      'Refuses tests that assert nothing about branching logic',
      'Asks whether the panel is scoring test-first explicitly',
      'Names the specific test that matters when there is no time to write it',
    ],
    followUps: ['What is the one test you would write for the component you just built?', 'How do you handle a panel that wants strict TDD in a thirty-minute slot?'],
  },
  {
    id: 'coding-008',
    round: 'coding',
    category: 'Pairing & building',
    question: 'With ten minutes left the interviewer says "now make it handle ten thousand items". How do you respond?',
    answer: [
      'Ask what "handle" means before optimising, because the answer changes the work entirely: is the problem initial render time, typing latency, scroll jank, or memory. Guessing here is how candidates spend their last ten minutes on the wrong axis.',
      'Say where the cost actually is before reaching for a technique. Ten thousand rows in the DOM is a rendering problem that virtualisation solves; ten thousand items being filtered on every keystroke is a computation problem that memoisation or a debounce solves. Naming which one you believe it is, and why, is the substance of the answer.',
      'Then propose the smallest change that addresses it and be explicit that you are not going to finish it: "I would reach for windowing here, and in ten minutes I can show you the shape of it rather than a working version". Sketching the right approach honestly beats starting an implementation you cannot land.',
      'Mention what you would measure rather than asserting an improvement. A staff answer includes "I would profile before and after, because the intuitive bottleneck is often not the real one" instead of claiming a speedup you have not observed.',
    ],
    keyPoints: [
      'Clarifies which performance symptom is meant before optimising',
      'Separates rendering cost from computation cost and picks the right lever',
      'Sketches the approach honestly instead of starting an unfinishable build',
      'Commits to measuring rather than asserting an improvement',
    ],
    followUps: ['What would you profile first, and with what tool?', 'When is virtualisation the wrong answer to a long list?'],
  },
  {
    id: 'coding-009',
    round: 'coding',
    category: 'Pairing & building',
    question: 'How do you use the last three minutes of a live coding session?',
    answer: [
      'Stop coding. A half-finished edit at the buzzer is worth less than a clear spoken account of where things stand, and interviewers write their notes from the last thing they heard.',
      'Give the same three-part summary every time: what works and how you know, what is missing or stubbed, and what you would do next in priority order. Being able to state your own gaps accurately is a strong signal that you would be honest about status on a real team.',
      'If you finished early instead, do not sit on it. Re-run the original failing case rather than declaring victory, then say whether the same mistake exists in sibling call sites — fixing one instance of a class of bug while five others remain is the most common way a real fix fails to help. Then ask the question that outlives the session: how did this get past review and CI, and what check would have caught it?',
      'Name one thing you would change about your own approach in hindsight. Volunteering a real self-criticism, rather than a fake modest one, is the closest thing to a free point in these rounds.',
      'Then ask one question about how they work: how they pair in practice, or what the review culture is like. It converts the last minute from evaluation into conversation, and it is genuinely useful information for you.',
    ],
    keyPoints: [
      'Stops editing in time to summarise deliberately',
      'Reports what works, what is missing, and what comes next',
      'If finished early, re-runs the original failing case and checks sibling call sites',
      'Asks how the bug escaped review and CI, not only how to fix it',
      'Volunteers one genuine hindsight criticism of the approach',
      'Closes with a real question about how the team works',
    ],
    followUps: ['What would you say if almost nothing worked?', 'How do you keep the summary from sounding like excuses?'],
  },

  // Debugging (7)
  {
    id: 'coding-010',
    round: 'coding',
    category: 'Debugging',
    question: 'The interviewer shares a repo and says "the filter is broken". Walk me through your first ninety seconds.',
    answer: [
      'Reproduce before reading any code. Run it, click the thing, and see the wrong behaviour with your own eyes. Candidates who start by reading the filter function are guessing at which bug they are looking for, and often fix a real problem that is not the reported one.',
      'Then pin down the observation precisely, out loud: what you did, what you expected, what happened instead, and whether it happens every time or only in some state. "Broken" is a symptom report, and half of debugging is converting it into a statement specific enough to falsify.',
      'Ask what changed, if anything: was this ever working, and is there a recent commit in the area. In an interview the answer is usually "assume it never worked", but asking shows the instinct that saves hours on a real incident.',
      'Only now read code, and read it narrowly: follow the actual data path from the input to the rendered list rather than skimming the whole file. Say where you are looking and why, so the interviewer can redirect you cheaply if you are heading somewhere unproductive.',
    ],
    keyPoints: [
      'Reproduces the failure before reading any code',
      'Restates the symptom as a precise, falsifiable observation',
      'Asks what changed and whether it ever worked',
      'Reads along the data path, narrating where and why',
    ],
    followUps: ['What if it only reproduces sometimes?', 'How do you avoid getting anchored on your first hypothesis?'],
  },
  {
    id: 'coding-011',
    round: 'coding',
    category: 'Debugging',
    question: 'This counter shows the wrong value after a few seconds. What is wrong, and how would you have found it?',
    code: `function Ticker({ step }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + step);
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  return <p>{count}</p>;
}`,
    answer: [
      'The interval closes over the first render value of count, and because the effect only re-runs when step changes, that stale value never refreshes. So every tick computes the same sum from the same starting point and the display sticks at one increment instead of climbing.',
      'The fix is to stop reading the current value from the closure at all: use the updater form, setCount((c) => c + step), which asks React for the latest value rather than capturing it. That keeps the effect correctly depending only on step.',
      'Note out loud why the wrong fix is tempting: adding count to the dependency array also "works", but it tears down and recreates the interval every second, which drifts the timing and is a different bug wearing the first one as a disguise. Choosing the updater form over the dependency patch is the judgement being tested.',
      'How you find it matters as much as the fix: the symptom is a value that updates once and then freezes, which is the signature of a stale closure. Saying "a value that changes exactly once points at a captured variable, not at the arithmetic" is the reusable pattern.',
    ],
    keyPoints: [
      'Identifies the stale closure over count, not an arithmetic error',
      'Fixes with the functional updater rather than a dependency patch',
      'Explains why adding count to deps is a worse fix, not just a different one',
      'Names the symptom-to-cause pattern: updates once then freezes',
    ],
    followUps: ['How would you write a test that fails on the original code?', 'When is a ref the right answer instead of the updater form?'],
  },
  {
    id: 'coding-012',
    round: 'coding',
    category: 'Debugging',
    question: 'Adding an item to this cart does nothing visible until the page is interacted with again. Why?',
    code: `function Cart() {
  const [items, setItems] = useState([]);

  function addItem(item) {
    items.push(item);
    setItems(items);
  }

  const total = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <>
      <ItemPicker onPick={addItem} />
      <p>Total: {total}</p>
    </>
  );
}`,
    answer: [
      'The array is mutated in place and then handed back to setItems as the same reference. React compares the previous and next state by identity, sees no change, and skips the re-render, so the new item is in the data but not on screen until some unrelated update forces a render.',
      'The fix is to produce a new array: setItems((prev) => [...prev, item]). The updater form also removes the dependency on the closed-over items, which matters as soon as two additions can happen in the same tick.',
      'Say what makes this class of bug nasty in production rather than just wrong: the state is not corrupted and no error is thrown, so it presents as an intermittent UI staleness that depends on what else happens to re-render. That is why the reflex is to treat state as immutable rather than to remember to copy in the places it matters.',
      'The finding pattern to name: when the data is right but the screen is wrong, suspect identity and re-render, not the calculation. Logging inside the render, rather than inside the handler, is what makes the difference visible in seconds.',
    ],
    keyPoints: [
      'Identifies in-place mutation and identity comparison as the cause',
      'Fixes with a new array via the updater form',
      'Explains why the bug presents as intermittent staleness rather than an error',
      'Names the heuristic: data right, screen wrong means suspect identity',
    ],
    followUps: ['Where else does this same mistake commonly appear?', 'How would you catch this class of bug in review or in CI?'],
  },
  {
    id: 'coding-014',
    round: 'coding',
    category: 'Debugging',
    question: 'You have fixed the bug and the interviewer asks "what test would have caught this?" How do you answer well?',
    answer: [
      'Answer at the level of the bug, not at the level of the fix. A test that asserts your new line of code exists is worthless; the test you want asserts the behaviour that was wrong, so it would have failed on the original code and passes now. Say that criterion out loud, because it is the actual standard.',
      'Name the layer honestly. Many of these bugs are unit-testable on a pure function, some need a component test that drives the interaction, and a few are genuinely only catchable end-to-end or by a type. Picking the cheapest layer that fails on the original code is the judgement being scored.',
      'Then say why it was not caught, which is usually more interesting than the test itself: the case was outside the shape anyone thought to write, or the existing test asserted a rendered snapshot rather than the behaviour. That is a process observation, and it is what a staff engineer is expected to notice.',
      'If a test is genuinely not the right guard, say so and name the better one: a type that makes the state unrepresentable, a lint rule, or an assertion at the boundary. Reaching for a test reflexively when a constraint would prevent the whole class is the weaker answer.',
    ],
    keyPoints: [
      'Requires the test to fail on the original code, not merely cover the fix',
      'Chooses the cheapest layer that actually catches it',
      'Explains why existing tests missed it, as a process observation',
      'Proposes a type or constraint when that beats a test',
    ],
    followUps: ['Give an example where a type would have been the better guard.', 'How do you decide this bug does not deserve a regression test at all?'],
  },
  {
    id: 'coding-015',
    round: 'coding',
    category: 'Debugging',
    question: 'Users report that the detail panel sometimes shows the wrong record, but only on a slow connection. Where do you look?',
    code: `useEffect(() => {
  setLoading(true);
  fetchUser(userId).then((data) => {
    setUser(data);
    setLoading(false);
  });
}, [userId]);`,
    answer: [
      'This is a request race. When userId changes quickly, two requests are in flight and nothing guarantees they resolve in order, so a slow response for the previous id can land after the fast response for the current one and overwrite it. The panel then shows a record that does not match the selection, which is exactly the "sometimes wrong, only when slow" report.',
      'The fix is to make superseded responses unable to write: either abort the previous request with an AbortController, or set an ignore flag in the effect cleanup and check it before calling setUser. The cleanup runs before the next effect, so the stale branch is neutralised by construction rather than by luck.',
      'Note that setLoading has the same problem and is a common partial fix: a candidate who guards the data but not the loading flag leaves a spinner that flickers or sticks. Saying "every write in this effect needs the same guard, not just the interesting one" is the complete answer.',
      'On finding it: the tell is a bug whose frequency depends on latency, which almost always means ordering rather than logic. Throttling the network in devtools to reproduce deliberately, instead of hoping it happens again, is the move worth narrating.',
    ],
    keyPoints: [
      'Diagnoses out-of-order responses rather than a logic error',
      'Fixes by aborting or ignoring in the effect cleanup',
      'Guards every write in the effect, including the loading flag',
      'Reproduces deliberately by throttling, given a latency-dependent symptom',
    ],
    followUps: ['How would you test this without real network timing?', 'When would you reach for a data-fetching library instead of hand-rolling the guard?'],
  },
  {
    id: 'coding-016',
    round: 'coding',
    category: 'Debugging',
    question: 'You cannot reproduce the reported bug. What now?',
    answer: [
      'Treat the gap between your environment and theirs as the actual subject of investigation, and enumerate it out loud: data, permissions, browser, device, network speed, timezone, locale, feature flags, and whether they were mid-flow rather than starting fresh. Most irreproducible reports are a state difference, not a lie.',
      'Go back to the reporter for specifics rather than guessing more: what exactly they clicked, what they saw, and when it last worked. Ask for the artefact that removes ambiguity, whether that is a screenshot, a recording, or an id you can look up.',
      'If the symptom is timing-dependent, try to force the conditions instead of waiting: throttle the network, slow the CPU, or drive the interaction faster than a human would. A bug you can only see under artificial pressure is still reproduced.',
      'Say what you would add if it stays invisible: logging or an error report at the boundary you suspect, shipped deliberately to catch the next occurrence with enough context. Being willing to close the loop with instrumentation rather than a guessed fix is the staff-level answer, and it is worth saying that shipping a speculative fix you cannot verify is the thing you are refusing to do.',
    ],
    keyPoints: [
      'Enumerates environment and state differences as the primary suspects',
      'Returns to the reporter for specifics and a concrete artefact',
      'Forces timing conditions artificially rather than waiting for a recurrence',
      'Adds targeted instrumentation instead of shipping an unverified fix',
    ],
    followUps: ['What would you log, and how would you avoid logging sensitive data?', 'How do you communicate "not reproduced yet" without sounding dismissive?'],
  },
  {
    id: 'coding-018',
    round: 'coding',
    category: 'Debugging',
    question: 'This component fires network requests in an endless loop. Diagnose it.',
    code: `function Report({ from, to }) {
  const [rows, setRows] = useState([]);
  const range = { from, to };

  useEffect(() => {
    loadRows(range).then(setRows);
  }, [range]);

  return <Table rows={rows} />;
}`,
    answer: [
      'The range object is rebuilt on every render, so it is a new reference each time. React compares dependencies by identity, sees a changed dependency, re-runs the effect, which sets state, which renders again, which builds another new object. The loop is structural rather than a mistake in the loading logic.',
      'The smallest correct fix is to depend on the primitives rather than the object: pass from and to in the dependency array and build the range inside the effect. That removes the unstable reference entirely instead of trying to stabilise it.',
      'Say why useMemo is the tempting but weaker answer here: memoising the object works, but it adds machinery to preserve an identity you did not need in the first place. Reaching for the simpler shape rather than the more sophisticated one is the point being tested.',
      'The recognition pattern worth stating: a loop that starts immediately on mount, with no user interaction, is almost always an unstable dependency, so the first place to look is any object, array, or function literal created in the render body.',
    ],
    keyPoints: [
      'Identifies the fresh object identity on each render as the cause',
      'Fixes by depending on primitives instead of the object',
      'Rejects useMemo as unnecessary machinery for an unneeded identity',
      'Names the pattern: immediate loop on mount means unstable dependency',
    ],
    followUps: ['When is useMemo genuinely the right fix for this shape?', 'How would a lint rule have caught this earlier?'],
  },

  // Code review (6)
  {
    id: 'coding-019',
    round: 'coding',
    category: 'Code review',
    question: 'The interviewer says "review this PR out loud". How do you structure the first pass?',
    answer: [
      'Start with intent, not lines. Say what you understand the change to be trying to do and check that against the description, because a review that never establishes the goal cannot judge whether the code achieves it. If you cannot tell what the PR is for, that is your first comment.',
      'Then read for correctness in the main path, out loud: does the happy case work, what happens on empty, error, and concurrent use. Only after that do you look at naming, structure, and style. Announcing that order matters, because it stops you from spending the session on formatting while a real bug sits three lines down.',
      'Read the tests as part of the diff rather than as an appendix. A test that asserts nothing, or that would pass against the unfixed code, is a defect in the PR and worth flagging as clearly as the implementation would be.',
      'Finish with an explicit verdict rather than trailing off: approve, approve with nits, or request changes, and name the one or two things that drive that decision. Interviewers are listening for whether you can hold a position, not just generate observations.',
      'Say what you did not review, if anything. Plenty of a diff travels regardless of domain — whether it does what the description says, whether the tests would fail without it, whether failures are handled visibly, whether names match behaviour — but if a business rule or an unfamiliar subsystem is outside what you can judge, write that in the verdict and name who should also look. An approval that implies more scrutiny than you applied is worse than declining the review.',
    ],
    keyPoints: [
      'Establishes the intent of the change before reading lines',
      'Reads for correctness first, style last, and announces that order',
      'Treats the tests as part of the reviewable diff',
      'Ends with an explicit verdict and the reasons driving it',
      'States what was outside their scope and routes it to someone who can judge it',
    ],
    followUps: ['What would you do if the PR description was empty?', 'How long would you spend before asking the author to walk you through it?'],
  },
  {
    id: 'coding-020',
    round: 'coding',
    category: 'Code review',
    question: 'What do you block on and what do you leave as a nit in this diff?',
    code: `export function applyDiscount(cart, code) {
  const rule = DISCOUNTS[code];
  const total = cart.items.reduce((s, i) => s + i.price * i.qty, 0);

  if (rule.type == 'percent') {
    return total - total * rule.value;
  }
  return total - rule.value;
}`,
    answer: [
      'Block on the correctness problems. An unknown or absent code makes rule undefined and throws on property access, so any typo becomes a crash on a money path. The fixed-amount branch can return a negative total with no floor at zero. And this is currency arithmetic in floating point, which will produce fractions of a cent that later reconcile badly. Each of those is a real defect on a path where being wrong costs money.',
      'Then name the defect that is easiest to read past, because each branch looks correct in isolation: rule.value means two different things depending on rule.type. In the percent branch it is a fraction, so 0.2 means twenty percent. In the other branch it is an absolute amount of money. Nothing in the name, the type, or the shape of the data separates them, so a rule authored as { type: "percent", value: 20 } — the obvious reading of "twenty percent" — subtracts twenty times the cart total instead. The fix is a discriminated union so the two branches carry differently named, differently typed fields, not a comment telling the next author which convention applies.',
      'Leave the loose equality as a nit and say which it is. Comparing with double equals here is not going to fail in practice because both sides are strings, so it is a consistency point, not a bug. Being explicit about "this one is a nit, the three above are not" is what makes the review usable rather than a flat list of twelve remarks.',
      'Flag one thing that is neither: there is no test in the diff for a function that computes money and has two branches. That is a request for change, but it is a request about the PR rather than about a line, so it belongs in the summary comment rather than inline.',
      'Say the priority out loud in the summary, because a review with four blocking comments and eight nits and no ordering leaves the author to guess. Name the one thing that must change before this merges: the missing guard on an unknown code.',
    ],
    keyPoints: [
      'Blocks on the crash for unknown codes, the negative total, and float money',
      'Says rule.value is a fraction in one branch and an absolute amount in the other, and asks for a discriminated union',
      'Explicitly labels the loose equality as a nit rather than mixing it in',
      'Raises the missing test for branching money logic in the summary',
      'Orders the feedback so the author knows what must change first',
    ],
    followUps: ['How would you represent the money value instead?', 'Would your review change if this were prototype code rather than production?'],
  },
  {
    id: 'coding-021',
    round: 'coding',
    category: 'Code review',
    question: 'How do you phrase a blocking comment so it lands as a technical judgement rather than a personal one?',
    answer: [
      'Anchor on the failing case rather than the author. "This throws when the code is not in the map, so a typo in a discount code becomes a crash on checkout" is impossible to take personally and impossible to argue with. "This is fragile" is both an opinion and an invitation to defend.',
      'Say plainly that it is blocking and why, because softening the signal is its own failure mode. A comment written so gently that the author reads it as optional wastes a round trip; "this needs to change before merge, because it can crash a paid flow" is kinder than three hedged sentences that get skipped.',
      'Separate the requirement from the solution. State the problem as non-negotiable and the fix as a suggestion: it leaves the author room to solve it better than you would have, and it avoids review turning into dictation.',
      'Assume competence in the wording. "Was there a reason to skip the guard here, or is this an oversight?" costs one clause and protects against the case where they know something you do not, which happens more often than review culture likes to admit.',
      'The same principle scales up to the review as a whole: make the required change unmistakable and everything else visibly optional. That means blocking only on correctness, clarity, or consistency with the existing codebase — approving working, tested code you would have built differently, and labelling any alternative explicitly as non-blocking — and it means commenting once on the first instance of a repeated mistake, saying it applies throughout, and folding the remainder into the summary rather than inline. Fifteen inline comments read as a verdict on the author and leave them guessing which two actually matter; naming those two is the job.',
    ],
    keyPoints: [
      'Anchors the comment on a concrete failing case, not on the code style',
      'States clearly that it blocks, rather than softening the signal away',
      'Separates the required outcome from a suggested implementation, and asks whether a reason exists',
      'Approves correct, tested code instead of blocking on preference, and labels the alternative non-blocking',
      'Names the two or three findings that must change rather than listing fifteen',
    ],
    followUps: ['How do you handle it when the author pushes back and you still disagree?', 'What do you do differently when reviewing across a language barrier or timezone?'],
  },
  {
    id: 'coding-022',
    round: 'coding',
    category: 'Code review',
    question: 'A PR adds this abstraction to support one caller. Do you block it?',
    code: `interface NotifierStrategy {
  send(message: string): Promise<void>;
}

class NotifierFactory {
  static create(kind: string): NotifierStrategy {
    switch (kind) {
      case 'email':
        return new EmailNotifier();
      default:
        throw new Error('unknown notifier: ' + kind);
    }
  }
}`,
    answer: [
      'Do not block it, and do comment on it. There is one implementation behind an interface, a factory that can produce exactly one thing, and a runtime error for a case the type system could have made unrepresentable. That is speculative structure, and the cost is real: every future reader now has three indirections to walk before finding the code that sends anything.',
      'Say the trade-off honestly rather than quoting a principle. The abstraction is not wrong, it is unpaid-for. The question to put to the author is whether a second implementation is actually coming this quarter, because if it is imminent this is reasonable groundwork and if it is hypothetical it is a guess about the future encoded as indirection.',
      'Offer the cheaper shape concretely, since a comment that only says "this is over-engineered" gives the author nothing to act on: call the notifier directly now, and extract the interface when the second implementation arrives, at which point the right seam will be obvious rather than predicted.',
      'Do flag the string parameter as a separate and smaller point: a union type instead of string moves the unknown-kind case from a runtime throw to a compile error, which is a genuine improvement regardless of how the abstraction question resolves.',
    ],
    keyPoints: [
      'Names the specific cost of speculative structure: indirection for every reader',
      'Asks whether the second implementation is real or hypothetical',
      'Suggests the concrete cheaper shape rather than quoting a principle',
      'Separately proposes a union type to replace a runtime throw',
    ],
    followUps: ['What if the author says the second implementation is in next sprint?', 'Where do you draw the line between premature and prudent abstraction?'],
  },
  {
    id: 'coding-024',
    round: 'coding',
    category: 'Code review',
    question: 'What is wrong with the error handling in this diff?',
    code: `async function loadSettings(userId) {
  try {
    const res = await fetch('/api/settings/' + userId);
    return await res.json();
  } catch (e) {
    console.log('failed to load settings');
    return {};
  }
}`,
    answer: [
      'The failure is swallowed and disguised as success. Returning an empty object means every caller receives what looks like valid settings, so a network failure silently becomes "this user has no preferences" and the UI renders defaults with no indication that anything went wrong. If those settings gate anything, the fallback is not neutral.',
      'A non-ok response is not caught at all: fetch only rejects on network errors, so a 500 or a 404 sails through and res.json() either throws on the body or returns an error payload that the caller treats as settings. Checking res.ok is the missing line, and it is the one most often missed in review.',
      'The log discards the diagnostic. console.log at the wrong level, without the error object and without the userId, produces a message that tells whoever is on call that something failed and nothing about what or for whom. Either report the error properly or do not pretend to log it.',
      'Say what the right shape is rather than only listing faults: let the failure propagate, or return an explicit result that distinguishes loaded settings from a load failure, so the caller has to decide what to render. The general rule worth stating is that a fallback is only safe when the caller can tell the difference between the fallback and real data.',
    ],
    keyPoints: [
      'Identifies the silent failure: an error returned as a plausible success value',
      'Catches the missing res.ok check, since fetch does not reject on 4xx or 5xx',
      'Flags the log as discarding the error object and the identifying context',
      'Proposes propagating or returning an explicit failure the caller must handle',
    ],
    followUps: ['When is an empty-object fallback genuinely the right call?', 'How would you make the failure visible without breaking the whole page?'],
  },
  {
    id: 'coding-027',
    round: 'coding',
    category: 'Code review',
    question: 'What do you look for in review that a linter or a type checker cannot catch?',
    answer: [
      'Whether the change does what it claims. Tooling verifies internal consistency; only a reader can compare the diff against the intent in the description and notice that the fix addresses a symptom while the described bug remains. That comparison is the part of review that cannot be automated, and it is where the highest-value findings come from.',
      'Whether the tests would fail without the change. A suite can be green, fully typed, and lint-clean while asserting nothing that pins the new behaviour, and this is invisible to every tool in the pipeline. Reading a test and asking "what would break this" is a habit worth naming explicitly.',
      'Whether the abstraction earns its cost, and whether the code is consistent with how this codebase already solves the same problem. Both are judgement about context that no rule can encode: a factory for one implementation is valid code, and a pattern that is idiomatic in one repository is foreign in the next.',
      'Whether the failure modes are acceptable to a person. Silent fallbacks, a spinner with no timeout, an error message that tells the user nothing actionable, and data loss on a failed save are all type-safe. So is anything with a missing label or an unreachable keyboard path. These are the review findings that only exist because a human imagined using the thing.',
    ],
    keyPoints: [
      'Checks the diff against the stated intent, which no tool can do',
      'Verifies the tests would actually fail without the change',
      'Judges whether abstraction and pattern choices fit this codebase',
      'Evaluates human-facing failure modes: silent fallbacks, dead ends, accessibility',
    ],
    followUps: ['Which of these have you caught in a real review recently?', 'What would you automate away first so review can focus on the rest?'],
  },

  // Build prompts (13)
  {
    id: 'coding-028',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build an autocomplete input: as the user types, fetch suggestions and show them in a list. In-flight requests must not race — a slow response for an earlier keystroke must never overwrite a later, faster one. Talk me through your approach.',
    code: `function Autocomplete({ fetchSuggestions }: { fetchSuggestions: (q: string) => Promise<string[]> }) {
  // state: query, suggestions, loading
  // TODO: debounce the fetch
  // TODO: cancel or ignore a stale in-flight request when a newer one starts
  return null;
}`,
    answer: [
      'State shape first: query (the input value), suggestions (the list), and a loading flag — resist adding a fourth "error" field until asked, a caught error can just clear suggestions and log.',
      'Debounce the fetch (150-300ms) so you are not firing a request per keystroke, using a ref-held timeout id cleared on the next keystroke.',
      'Solve the race explicitly, out loud, before typing it: either an AbortController per request (cancel the previous one when a new keystroke fires) or a request-id/sequence-number check (only apply the response if it is still the latest request issued) — AbortController is the stronger answer since it also stops wasted network work.',
      'Wire it up: on each keystroke, bump the sequence/create a new controller, debounce, fetch, and on resolution check the request is still current before calling setSuggestions. Say the rejection-handler detail out loud, because it is where the abort approach usually goes wrong: aborting rejects the fetch promise with an AbortError, which is the expected outcome of the next keystroke rather than a failure, so the catch must check err.name and return silently for that case — otherwise every character the user types renders "search failed".',
    ],
    keyPoints: [
      'Minimal state: query, suggestions, loading — no premature fields',
      'Debounces the fetch instead of firing on every keystroke',
      'Explicitly solves the race with AbortController or a sequence number',
      'Only applies a response if it is still the latest in-flight request',
      'Checks for an AbortError in the catch and ignores it instead of showing an error',
    ],
    followUps: ['How would you add keyboard navigation (arrow keys, Enter) to the list?', 'What would you change if suggestions came from a local array instead of a network call?'],
  },
  {
    id: 'coding-029',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build a virtualised list that can smoothly render 100,000 rows of fixed height. Only the rows currently in (or near) the viewport should exist in the DOM. Talk me through your approach.',
    code: `function VirtualList({ items, rowHeight, viewportHeight }: { items: string[]; rowHeight: number; viewportHeight: number }) {
  // state: scrollTop
  // TODO: compute the visible index range from scrollTop, rowHeight, viewportHeight
  // TODO: render a spacer for the rows above/below instead of the full list
  return null;
}`,
    answer: [
      'Say the core idea before coding: track scrollTop, derive the first and last visible row index from it and the row height, and render only that slice — everything else is a spacer, not real DOM.',
      'Use two spacer elements (or one padding-top/height trick) rather than absolutely positioning every row, since fixed-height rows make the arithmetic trivial: startIndex = floor(scrollTop / rowHeight), endIndex = startIndex + ceil(viewportHeight / rowHeight) + 1.',
      'Say why the "+ 1" is there, because dropping it is the standard off-by-one in this exercise: unless scrollTop happens to be an exact multiple of rowHeight, the row at startIndex is only partly above the fold, which pushes a sliver of one extra row into view at the bottom. Overscan hides the mistake in practice, which is exactly why it survives code review — state the arithmetic rather than relying on the padding to cover it.',
      'Add that small overscan anyway (render a few extra rows above and below the viewport) so fast scrolling does not show a flash of blank space before the next paint.',
      'Name what you are deliberately not building: dynamic/variable row heights, which need a measured-height cache and are a materially harder problem — scope that out explicitly rather than let it eat the session.',
    ],
    keyPoints: [
      'Computes the visible range from scrollTop and row height, including the +1 for the partly scrolled top row',
      'Renders a spacer for off-screen rows instead of the full item list',
      'Adds overscan to avoid blank flashes on fast scroll',
      'Explicitly scopes out variable row heights as a harder follow-on problem',
    ],
    followUps: ['How would this change for variable-height rows?', 'How would you make individual rows keyboard-focusable without breaking virtualization?'],
  },
  {
    id: 'coding-030',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build an accessible combobox: a text input with a filtered, keyboard-navigable listbox of options, following the ARIA Authoring Practices Guide pattern. Talk me through your approach.',
    code: `function Combobox({ options }: { options: string[] }) {
  // state: query, activeIndex, open
  // TODO: role="combobox" on the input, aria-expanded, aria-controls, aria-activedescendant
  // TODO: role="listbox" + role="option" on the results, arrow-key navigation
  return null;
}`,
    answer: [
      'Lead with the ARIA contract, not the styling: the input gets role="combobox", aria-expanded, aria-controls pointing at the listbox id, and aria-activedescendant pointing at the currently highlighted option id — this is what makes it a combobox to assistive tech, not the visual look.',
      'The listbox itself uses role="listbox" with role="option" children; focus stays on the input the whole time (a well-known combobox convention) while ArrowDown/ArrowUp move a highlighted-index state and aria-activedescendant, not actual DOM focus.',
      'Wire the keys explicitly: ArrowDown/Up move the active index (clamped, or wrapping — state your choice), Enter selects the active option and closes the list, Escape closes without selecting, and typing further filters and reopens.',
      'Close the loop on mouse/touch parity: clicking an option must select it the same way Enter does, and closing on outside-click or blur should not fire a "select nothing" side effect that clears a valid typed query.',
    ],
    keyPoints: [
      'Uses the correct ARIA roles/attributes: combobox, listbox, option, aria-activedescendant',
      'Keeps real DOM focus on the input; highlighting is state-driven, not focus-driven',
      'Implements ArrowDown/Up, Enter, Escape with clearly stated behavior',
      'Mouse selection and keyboard selection converge on the same select handler',
    ],
    followUps: ['How would you announce the number of results to a screen reader as they change?', 'What changes if multiple selection is required?'],
  },
  {
    id: 'coding-031',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build an accessible tabs component (tab list, tabs, panels) following the ARIA Authoring Practices Guide pattern, with roving tabindex keyboard navigation. Talk me through your approach.',
    code: `function Tabs({ tabs }: { tabs: { id: string; label: string; panel: string }[] }) {
  // state: activeId
  // TODO: role="tablist" / role="tab" / role="tabpanel", aria-selected, aria-controls, aria-labelledby
  // TODO: roving tabindex — only the active tab is tabbable, arrow keys move between tabs
  return null;
}`,
    answer: [
      'State the roles up front: a role="tablist" container, role="tab" buttons with aria-selected and aria-controls pointing at their panel, and role="tabpanel" elements with aria-labelledby pointing back at their tab.',
      'Implement roving tabindex correctly: only the active tab has tabIndex=0, every other tab has tabIndex=-1, so a single Tab key press moves focus out of the whole tablist rather than through every tab — this is the detail most implementations get wrong.',
      'Wire ArrowLeft/ArrowRight (or Up/Down for a vertical tablist) to move focus and activation between tabs, with Home/End jumping to the first/last tab; state whether activation is automatic-on-arrow or requires a follow-up Enter (both are valid APG patterns — automatic activation is more common and simpler to build first).',
      'Keep only the active panel\'s content mounted or visually shown, and make the panel focusable conditionally rather than by default. APG puts tabIndex=0 on the tabpanel only when the panel contains no focusable elements of its own, so a keyboard user can still reach the content and read it. If the panel already holds a link, an input, or a button, adding tabIndex=0 to the panel creates a redundant tab stop that a screen reader user has to pass through for nothing — that is a defect, not extra care, and saying which case you are in is the part being scored.',
    ],
    keyPoints: [
      'Correct roles: tablist, tab (aria-selected, aria-controls), tabpanel (aria-labelledby)',
      'Roving tabindex: exactly one tab is tabbable at a time',
      'Arrow keys move between tabs; states the chosen activation model (automatic vs manual)',
      'Puts tabIndex=0 on the panel only when the panel has no focusable content, and says why',
    ],
    followUps: ['How would you support closable tabs?', 'What changes for a vertical tablist?'],
  },
  {
    id: 'coding-032',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build a transactions table: around 2,000 rows of { id, date, counterparty, amountMinor, currency, status }, with sortable columns, a text filter, and pagination at 50 rows a page. Amounts render formatted for their currency. Talk me through your approach.',
    code: `type Transaction = {
  id: string;
  date: string;
  counterparty: string;
  amountMinor: number;
  currency: string;
  status: 'settled' | 'pending' | 'failed';
};

function TransactionsTable({ rows }: { rows: Transaction[] }) {
  // state: sortKey + direction, filter text, page index
  // TODO: filter -> sort -> paginate as derived values, not three more pieces of state
  // TODO: stable sort; compare amountMinor numerically, never the formatted string
  // TODO: one Intl.NumberFormat per currency, reused across rows
  return null;
}`,
    answer: [
      'Say the data-flow rule before you type anything: the only state is the sort key and direction, the filter text, and the page index. Everything on screen is derived from those three, in a fixed order — filter the rows, sort the filtered result, slice the page out of the sorted one — each step a memoised derivation of the step before it. Storing filteredRows, sortedRows and pageRows as their own state is the mistake that sinks this exercise: they drift out of agreement, and you end up writing effects whose only job is to keep three copies of the same list in sync.',
      'Sort on the raw values, never the rendered ones. amountMinor is an integer count of minor units, so the comparator is a subtraction; comparing formatted strings like "1.234,56" sorts character by character and produces an order that looks plausible enough to ship. Dates compare as ISO strings or timestamps, not as display labels. Array.prototype.sort has been required to be stable since ES2019, so you get stability for free — but add an explicit tiebreak on id anyway, so that two rows with the same amount have one defined order rather than whatever the previous sort happened to leave behind.',
      'Format with Intl.NumberFormat and hoist the formatters out of the row. Constructing one is comparatively expensive, so keep a small Map from currency code to formatter and reuse it, rather than calling the constructor 50 times per render while someone is typing in the filter box. Convert from minor units only at that display boundary, and get the divisor from the currency rather than hard-coding 100 — EUR and GBP have two decimal places, JPY has none, and a hard-coded 100 is a bug waiting for the first yen transaction.',
      'Use a real table rather than a grid of divs: thead, th with scope="col", tbody. Each sortable header is a button inside its th, and the th carries aria-sort set to "ascending", "descending" or "none", so a screen reader user hears the current order instead of having to infer it from an arrow glyph. The filter input gets a real label, and the pagination controls say which page of how many rather than just showing two arrows.',
      'Close by naming what you are not building and why. Two thousand rows paginated at 50 means 50 rows in the DOM at a time, so virtualisation buys nothing here and adding it would be speculative work on top of a correct answer. Say the trigger instead: if they drop pagination and want all 2,000 rows scrolling in one list, that is the moment windowing earns its place.',
    ],
    keyPoints: [
      'Keeps sort, filter and page as the only state; filter, sort and paginate are memoised derivations',
      'Compares amountMinor numerically and adds an explicit id tiebreak',
      'Builds one Intl.NumberFormat per currency and reuses it instead of one per row',
      'Uses table semantics with aria-sort on the sorted column header',
      'Says virtualisation is not warranted at 50 rows a page, and names what would change that',
    ],
    followUps: ['What moves to the server if the dataset were two million rows instead of two thousand?', 'How would you render a total row when the rows span several currencies?'],
  },
  {
    id: 'coding-033',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build a promise pool: given an array of tasks (functions returning promises) and a concurrency limit N, run them with at most N in flight at once, resolving with all results in original order. Talk me through your approach.',
    code: `async function promisePool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  // TODO: run at most "limit" tasks concurrently
  // TODO: results[i] must correspond to tasks[i], regardless of completion order
  // TODO: guard limit <= 0 — zero workers means the pool never resolves
  return [];
}`,
    answer: [
      'State the shape of the solution first: an array of N "worker" loops running concurrently, each pulling the next unstarted task index off a shared cursor and writing its result into a results array at that task\'s original index — order comes from indexing, not from completion order.',
      'Implement the worker as a small async function that loops while a shared mutable index is less than tasks.length, incrementing it and awaiting that task before looping again; start N of these workers with Promise.all. Write the guard on N as you type it: clamp the worker count to at least one and at most tasks.length, because a caller passing limit 0 — or a limit computed from an empty config — starts no workers at all, and Promise.all of an empty array resolves instantly with nothing done. That is the failure mode nobody notices in review, since it does not throw.',
      'Be precise about what happens on a rejection, rather than calling it fail-fast. Promise.all does reject as soon as one worker throws, so the caller hears about the failure immediately — but the other N-1 workers are still running, still pulling the next index off the shared cursor, and will keep launching tasks until the list is exhausted. Nothing aborts. If "stop as soon as one fails" is the actual requirement, you need a shared cancelled flag that each worker checks before taking the next index, and you set it in the catch. Otherwise say plainly that you are letting every task run and collecting settled results.',
      'Sanity-check with a small example out loud: 5 tasks, limit 2 — task 3 should start only once one of the first two finishes, not after both.',
    ],
    keyPoints: [
      'Uses a shared cursor and N worker loops, not a queue-per-batch approach',
      'Results array is indexed by original task position, not completion order',
      'Guards limit <= 0, naming that zero workers resolves immediately with nothing run',
      'Says a rejection does not stop the other workers, and writes the cancelled flag if stopping is required',
      'Walks the 5-tasks-limit-2 case out loud to check the concurrency, not just the types',
    ],
    followUps: ['How would you support cancelling remaining tasks partway through?', 'How would you report progress as tasks complete?'],
  },
  {
    id: 'coding-034',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build an amount input — an amount field plus a currency select — submitted with a React 19 form Action. The action validates that the amount parses to integer minor units, and the form shows pending state and a field-level error. Talk me through your approach.',
    code: `type FormState = { error?: string; amountMinor?: number };

async function submitAmount(prev: FormState, formData: FormData): Promise<FormState> {
  // TODO: parse the amount string to integer minor units for the chosen currency
  // TODO: reject empty input, floats, and anything that does not parse
  // TODO: return { error } rather than throwing, so the form can render it
  return {};
}

function AmountForm() {
  // TODO: const [state, formAction, isPending] = useActionState(submitAmount, {})
  // TODO: <form action={formAction}> with a labelled amount input and a currency select
  // TODO: aria-invalid on the input, aria-describedby pointing at the error element id
  return null;
}`,
    answer: [
      'Lead with the signature, because it is what the question is actually about: const [state, formAction, isPending] = useActionState(action, initialState), where the action has the shape (previousState, formData) => nextState and formAction goes straight onto the form as action={formAction}. That one line replaces the hand-rolled trio of an isLoading boolean, an error state, and an onSubmit that calls preventDefault — and because it is a real form submission rather than a click handler, the pending flag is managed for you and cannot get stuck true when an early return skips the reset.',
      'Put the validation on the action boundary, not in the input onChange. The field is free text and people type money in their own locale: "1.234,56" is one thousand two hundred thirty-four and fifty-six in German, and something else entirely read as English. So parse deliberately — pick the separators from the locale, strip the grouping separator, normalise the decimal one, then reject anything remaining that is not digits plus at most one separator, and reject more decimal places than the currency allows. Do the conversion as integer arithmetic on the digit string, not by multiplying a parsed number.',
      'Say out loud the thing you would never do: parseFloat on money. 19.99 * 100 evaluates to 1998.9999999999998, so a naive round trip through a float loses or gains a minor unit depending on the value, and on a payments path that surfaces weeks later as a reconciliation difference nobody can explain. The amount is an integer number of minor units from the moment it leaves the input, and the currency decides the exponent — two for EUR, zero for JPY, three for a handful of others.',
      'Return failures as state rather than throwing: the action returns { error: "Enter an amount like 12,50" } and the component renders it. Then wire the accessibility so the message is actually reachable — a real label tied to the input, aria-invalid set from whether state.error exists, and aria-describedby pointing at the id of the element holding the message, so a screen reader reads the error when focus lands on the field rather than leaving it as red text next to a control that claims to be fine.',
      'If they push on it, separate pending from optimistic. isPending is the honest "the server has not answered yet" signal and is what disables the submit button. useOptimistic is a different tool: it renders the expected outcome immediately and rolls back if the action fails. For anything that moves money, pending is the right choice — showing an optimistic balance that then reverses is worse for the user than a second of spinner.',
    ],
    keyPoints: [
      'Names the useActionState signature and why it beats hand-rolled loading and error flags',
      'Parses the amount locale-aware and converts to integer minor units without a float',
      'Says parseFloat on money is out, and takes the exponent from the currency rather than assuming 100',
      'Returns the error as action state and wires aria-invalid plus aria-describedby to the message',
      'Distinguishes isPending from useOptimistic and says which one a money path gets',
    ],
    followUps: ['How would you keep the typed value in the field after a failed submit?', 'Where does the same validation live so the client and the server cannot disagree about it?'],
  },
  {
    id: 'coding-035',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build a drag-to-reorder list: dragging an item to a new position updates the list order, keyboard-operable, no external DnD library. Talk me through your approach.',
    code: `function ReorderableList({ items, onReorder }: { items: string[]; onReorder: (next: string[]) => void }) {
  // TODO: draggable items, onDragStart/onDragOver/onDrop to compute the new order
  // TODO: keyboard equivalent (e.g. focus an item, Alt+ArrowUp/Down to move it)
  return null;
}`,
    answer: [
      'For mouse/touch: use native HTML5 drag-and-drop (draggable, onDragStart storing the dragged index, onDragOver preventing default and computing the hover target index, onDrop reordering the array immutably and calling onReorder) rather than building pointer-tracking from scratch.',
      'Compute the reorder with a pure function (remove the dragged item, splice it back in at the target index) so the logic is unit-testable independent of any DOM event.',
      'State the accessibility gap in native drag-and-drop plainly: it is mouse/touch-only and has no keyboard equivalent, so a keyboard path is a hard requirement, not a nice-to-have, for a genuinely accessible list.',
      'Implement the keyboard path with a per-item "move up"/"move down" affordance (or a documented Alt+Arrow shortcut while an item is focused) calling the same pure reorder function, and move focus to the item\'s new position after the move so focus does not get lost.',
    ],
    keyPoints: [
      'Uses native HTML5 drag events rather than hand-rolled pointer tracking',
      'Reorder logic is a pure, independently testable function',
      'Explicitly names drag-and-drop\'s keyboard-accessibility gap',
      'Implements a working keyboard alternative that preserves focus after the move',
    ],
    followUps: ['How would you announce the new position to a screen reader after a move?', 'How would you support dragging across two separate lists?'],
  },
  {
    id: 'coding-036',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build a tiny external store (get, set, subscribe) and a React hook that reads it via useSyncExternalStore, with no external state library. Talk me through your approach.',
    code: `function createStore<T>(initial: T) {
  // TODO: getSnapshot(), setState(next: T | ((prev: T) => T)), subscribe(listener: () => void)
}

function useStore<T>(store: ReturnType<typeof createStore<T>>): T {
  // TODO: useSyncExternalStore(store.subscribe, store.getSnapshot)
  return null as T;
}`,
    answer: [
      'The store is plain JS: a mutable value in closure, a Set of listener callbacks, getSnapshot returning the current value, setState replacing it and calling every listener, and subscribe adding/removing a listener from the set.',
      'Use useSyncExternalStore instead of a manual useEffect+useState subscription — it exists specifically to make external-store reads safe under concurrent rendering (tearing-free), which a hand-rolled subscription cannot guarantee.',
      'Get getSnapshot right: it must return referentially stable values when nothing changed (returning a new object every call causes an infinite re-render loop), so setState should replace the reference only when the value actually changes.',
      'Note the real-world implication: this is close to what small state libraries (Zustand-style) do under the hood, so the exercise shows you understand the primitive beneath the library, not just how to import one.',
    ],
    keyPoints: [
      'Store is plain closure state: value, listener Set, getSnapshot, setState, subscribe',
      'Uses useSyncExternalStore rather than a manual effect-based subscription',
      'getSnapshot returns a stable reference when the value has not changed',
      'Connects the exercise to what real external-store libraries do internally',
    ],
    followUps: ['How would you add a selector so a component only re-renders on part of the state changing?', 'How would you support server-side rendering with this store?'],
  },
  {
    id: 'coding-037',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build an LRU (least-recently-used) cache with get and put, both O(1), fixed capacity. Talk me through your approach.',
    code: `class LRUCache<K, V> {
  constructor(private capacity: number) {}
  // TODO: get(key: K): V | undefined — must count as a "use", refreshing recency
  // TODO: put(key: K, value: V): void — evict the least-recently-used entry when over capacity
}`,
    answer: [
      'State the data structure choice up front: a Map, because JavaScript Maps preserve insertion order and support O(1) get/set/delete — re-inserting a key on access is enough to move it to the "most recent" end without a hand-rolled doubly linked list.',
      'Implement get: if the key exists, delete and re-set it (moving it to the end, i.e. most-recently-used), and return its value; if it does not exist, return undefined without mutating anything.',
      'Implement put: if the key already exists, delete it first (so the re-insertion moves it to the end); set the new value; if the map now exceeds capacity, delete the first key returned by map.keys().next() — the least-recently-used one.',
      'State the complexity honestly: every operation here is O(1) amortized, since Map operations are O(1) and each get/put does a small constant number of them.',
    ],
    keyPoints: [
      'Chooses Map for its insertion-order guarantee instead of a hand-rolled linked list',
      'get() correctly refreshes recency by re-inserting on access',
      'put() evicts the true least-recently-used entry (Map iteration order, not insertion time alone)',
      'States and justifies O(1) complexity for both operations',
    ],
    followUps: ['How would you keep this safe under concurrent async callers, where an await can interleave between a get and a put?', 'How would you add a TTL (time-based expiry) on top of the LRU eviction?'],
  },
  {
    id: 'coding-038',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build a fetch wrapper that retries a failed request with exponential backoff and jitter, up to a max number of attempts. Talk me through your approach.',
    code: `async function fetchWithRetry(url: string, options: RequestInit = {}, maxAttempts = 3): Promise<Response> {
  // TODO: retry on network error, 5xx, 408 and 429; honour Retry-After; other 4xx are not retried
  // TODO: exponential backoff with jitter between attempts
  return fetch(url, options);
}`,
    answer: [
      'Decide what is retryable before coding, and be precise about it rather than saying "5xx yes, 4xx no". A thrown network error and a 5xx are transient and worth retrying. So are two specific 4xx codes: 408 request timeout, and 429 too many requests — rate limiting is the canonical backoff case, not the counterexample to it, and a client that gives up on a 429 is failing on exactly the signal that says "try again shortly". Everything else in the 4xx range is a malformed or unauthorised request that will fail identically on every attempt, so retrying it only burns time and quota.',
      'Honour Retry-After when it is present. A 429 or a 503 may carry it, and the server telling you when to come back beats your own computed delay every time — take the larger of Retry-After and your backoff rather than replacing one with the other, and cap it so a hostile or misconfigured header cannot park the request for an hour.',
      'Implement exponential backoff: wait base * 2^attempt ms before the next try, with an upper cap so it does not grow unbounded on a high max-attempts value.',
      'Add jitter explicitly and explain why: pure exponential backoff across many clients retrying the same failing endpoint synchronizes them into a thundering herd — adding random jitter (e.g. backoff * (0.5 + Math.random() * 0.5)) spreads retries out and reduces load on a recovering server.',
      'Surface the final failure clearly: after maxAttempts, throw or return the last real error/response rather than swallowing it, so the caller can distinguish "eventually succeeded" from "gave up."',
    ],
    keyPoints: [
      'Retries network errors, 5xx, 408 and 429, and says the rest of the 4xx range is not retried',
      'Honours Retry-After when the server sends it, with a cap',
      'Implements exponential backoff with a sensible cap',
      'Adds jitter and names the thundering-herd problem it prevents',
      'Surfaces the final failure after exhausting attempts instead of swallowing it',
    ],
    followUps: ['What do you do when Retry-After is an HTTP date rather than a number of seconds?', 'How would you make retries cancellable via AbortSignal?'],
  },
  {
    id: 'coding-039',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Build a memoized async lookup: given an expensive async function, return a wrapped version that caches results by argument and de-duplicates concurrent calls for the same argument (only one real call in flight per key at a time). Talk me through your approach.',
    code: `function memoizeAsync<A extends string, R>(fn: (arg: A) => Promise<R>): (arg: A) => Promise<R> {
  // TODO: cache resolved results by argument
  // TODO: if a call for the same argument is already in flight, return that same promise instead of calling fn again
  return fn;
}`,
    answer: [
      'Two caches, not one: a Map of resolved values keyed by argument (the actual memoization), and a Map of in-flight promises keyed by argument (the de-duplication) — conflating them causes either stale-forever caching or duplicate concurrent calls.',
      'On a call: if the argument has a resolved value cached, return it synchronously wrapped in Promise.resolve; else if a promise is already in flight for that argument, return that same promise (this is the de-dupe — a second caller for the same key gets the same in-flight promise, not a second network call).',
      'Otherwise call fn, store the resulting promise in the in-flight map immediately (before awaiting), and on resolution move the value into the resolved cache and delete the in-flight entry; on rejection, delete the in-flight entry without caching a failure, so a later call can retry.',
      'Name the real-world use case directly: this is exactly the shape of a "get user by id" cache used across many components that might all mount and request the same id in the same tick — without de-dupe, that is N redundant network calls instead of one.',
    ],
    keyPoints: [
      'Separates the resolved-value cache from the in-flight-promise cache',
      'A second concurrent call for the same key reuses the in-flight promise instead of calling fn again',
      'Does not cache a rejected result, allowing a later retry',
      'Connects the pattern to a concrete real-world case (shared lookups across components)',
    ],
    followUps: ['How would you add a TTL so cached values expire?', 'How would you support cache invalidation for a specific key after a mutation?'],
  },
  {
    id: 'coding-040',
    round: 'coding',
    category: 'Build prompts',
    scratch: true,
    question: 'Implement debounce and throttle from scratch, each with a cancel() method, and tell me when you would reach for one over the other. Talk me through your approach.',
    code: `function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  // TODO: call fn only after "wait" ms have passed with no further calls
  // TODO: expose cancel() to drop a pending call
}

function throttle<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  // TODO: call fn at most once per "wait" ms
  // TODO: expose cancel() to drop a pending trailing call
}`,
    answer: [
      'Say what each one means before writing either, because the two get used interchangeably and they are not interchangeable. Debounce waits for quiet: every call resets the timer, and fn runs only once no call has arrived for the whole wait window — so a burst of a hundred calls produces exactly one invocation, at the end. Throttle enforces a rate: fn runs immediately, then at most once per window however many calls arrive — so a burst of a hundred produces a call at the start and one per window after. Debounce can starve forever under continuous input; throttle never does. That difference is the whole of the choice.',
      'Debounce is a closure over one timer id. Each call clears the pending timeout and schedules a new one, and the scheduled callback applies fn with the most recent arguments — the last arguments, not the first, which is the part people get wrong when they capture args outside the handler. Keep this over a variable so a method passed in still gets its receiver. cancel() clears the timeout and nulls the id so a later call schedules cleanly rather than clearing a stale handle.',
      'Throttle needs a last-run timestamp and a trailing timer, because leading-only throttle silently drops the final call of a burst, which is the bug that shows up as a filter that never applies the last keystroke. On a call, if the elapsed time since the last run is at least wait, run immediately and record the time; otherwise store the arguments and schedule a trailing run for the remainder of the window, replacing any already-scheduled trailing call so the newest arguments win. cancel() clears the trailing timer and drops the stored arguments.',
      'Then say where each belongs. Debounce for work that only matters once the user stops: a search-as-you-type request, a resize handler recomputing layout, autosaving a form field. Throttle for work that must stay responsive during a continuous stream: scroll position, pointer move, a progress readout, a rate-limited API. And name the cases where neither is right — requestAnimationFrame for anything painting per frame, since a timer does not align to the frame, and an AbortController rather than a debounce when the real requirement is that a stale in-flight request must not overwrite a newer one.',
    ],
    keyPoints: [
      'States the behavioural difference: debounce fires once after quiet, throttle fires at a bounded rate during the burst',
      'Debounce resets the timer on every call and applies the most recent arguments, not the first',
      'Throttle handles the trailing call so the last event of a burst is not dropped',
      'cancel() clears the pending timer and any stored trailing arguments on both',
    ],
    followUps: ['How would you add a leading/trailing option to debounce, and what does each combination do to a single isolated call?', 'How would you test these deterministically without waiting real milliseconds?'],
  },
];
