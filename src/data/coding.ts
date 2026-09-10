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
      'Narrate at boundaries rather than continuously: before starting a piece, say what you are about to do; after finishing it, say what you know works and what is still missing. That rhythm gives the interviewer natural places to steer you without interrupting.',
      'If you notice you are talking to avoid admitting confusion, stop and name the confusion instead. "I am not sure whether this should live in state or a ref, here is the trade-off" is a strong staff-level move; filling air is not.',
    ],
    keyPoints: [
      'Narrates decisions and rejected alternatives, not keystrokes',
      'Announces thinking pauses rather than going silent unexpectedly',
      'Speaks at task boundaries so the interviewer can steer',
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
      'Read it and list what is missing before touching anything, so the interviewer hears your priority order rather than watching you pick at whatever is nearest the cursor. Here the real issues are: a request per keystroke with no debounce, no cancellation so a slow early response can overwrite a newer one, no loading or error state at all, an unencoded query string, a missing key on the list, and an unlabelled input.',
      'Fix in risk order, not in file order. The race condition is a correctness bug and goes first, then error handling, then the debounce, then the accessibility and the key. Saying "I am fixing the correctness problems before the polish" is itself the answer they are listening for.',
      'For the race, the shape you want is an abort signal or an ignore flag in the effect cleanup, so a superseded response cannot write to state. Narrate why: this is the bug that survives to production and shows up as "search results sometimes show the wrong thing", which nobody can reproduce.',
      'Say out loud what you would extract only if it earns it. A starting component like this does not need a custom hook to be correct, so pulling one out is a judgement call about reuse, not a fix, and worth naming as optional rather than doing reflexively.',
    ],
    keyPoints: [
      'Enumerates problems before editing, in an explicit priority order',
      'Fixes correctness before polish and says so',
      'Identifies the stale-response race, not just the missing debounce',
      'Treats extraction and abstraction as optional, not as part of the fix',
    ],
    followUps: ['Which of those fixes would you do inline versus leave as a comment?', 'How would you test the race condition you just described?'],
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
      'Name one thing you would change about your own approach in hindsight. Volunteering a real self-criticism, rather than a fake modest one, is the closest thing to a free point in these rounds.',
      'Then ask one question about how they work: how they pair in practice, or what the review culture is like. It converts the last minute from evaluation into conversation, and it is genuinely useful information for you.',
    ],
    keyPoints: [
      'Stops editing in time to summarise deliberately',
      'Reports what works, what is missing, and what comes next',
      'Volunteers one genuine hindsight criticism of the approach',
      'Closes with a real question about how the team works',
    ],
    followUps: ['What would you say if almost nothing worked?', 'How do you keep the summary from sounding like excuses?'],
  },

  // Debugging (9)
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
    id: 'coding-013',
    round: 'coding',
    category: 'Debugging',
    question: 'How do you narrate hypotheses while debugging so the interviewer can actually follow you?',
    answer: [
      'State the hypothesis and the test in the same breath: "I think the effect is re-running on every render, and I will check by logging at the top of it". A hypothesis without a stated test sounds like a guess; a test without a stated hypothesis looks like poking.',
      'Say what the result told you, including when it eliminates your idea. "That printed once, so it is not the effect, which means the problem is downstream of the fetch" keeps the interviewer oriented and demonstrates that you are narrowing rather than wandering.',
      'Keep an explicit list of what you have ruled out, out loud, because in a short session it is easy to loop back onto an eliminated branch under pressure. Saying "so far I have ruled out the network and the effect timing" is cheap and reads as method.',
      'Resist committing hard to a first theory. Say "my leading theory is X, my second is Y" so that being wrong about X is a step in your plan rather than a visible surprise.',
    ],
    keyPoints: [
      'Pairs every hypothesis with the specific test that would falsify it',
      'Reports negative results as progress and states what they eliminate',
      'Maintains a spoken list of ruled-out causes',
      'Holds a second theory openly instead of over-committing to the first',
    ],
    followUps: ['What do you do when three hypotheses in a row are wrong?', 'How do you keep this discipline when the clock is nearly out?'],
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
    id: 'coding-017',
    round: 'coding',
    category: 'Debugging',
    question: 'You find and fix the bug in the first two minutes. What do you do with the rest of the session?',
    answer: [
      'Do not treat it as finished. Verify the fix against the original reproduction, out loud, and check that you have not simply moved the symptom somewhere less visible. A candidate who declares victory without re-running the failing case is showing the habit that produces regressions.',
      'Then go looking for siblings. Ask whether the same mistake exists elsewhere: grep for the pattern, check the other callers of the function you touched, and say what you find. Fixing one instance of a class of bug while five others remain is the most common way a real fix fails to help.',
      'Offer the guard next: the test that fails on the original code, or the type or lint rule that makes the whole class unrepresentable. This is where a short debugging exercise turns into a demonstration of staff scope.',
      'Finally, say what you would want to know that the exercise cannot tell you: how this reached production, whether review or CI should have caught it, and what the cheap process change would be. Interviewers usually have follow-up material ready, and asking for it is better than sitting on a fixed bug.',
    ],
    keyPoints: [
      'Re-runs the original reproduction rather than declaring victory',
      'Searches for the same mistake in sibling call sites',
      'Proposes the guard: a failing test, a type, or a lint rule',
      'Raises how it escaped review or CI as a process question',
    ],
    followUps: ['How would you search for other instances of the same pattern?', 'What would you do if you found twenty other instances?'],
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

  // Code review (9)
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
    ],
    keyPoints: [
      'Establishes the intent of the change before reading lines',
      'Reads for correctness first, style last, and announces that order',
      'Treats the tests as part of the reviewable diff',
      'Ends with an explicit verdict and the reasons driving it',
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
      'Leave the loose equality as a nit and say which it is. Comparing with double equals here is not going to fail in practice because both sides are strings, so it is a consistency point, not a bug. Being explicit about "this one is a nit, the three above are not" is what makes the review usable rather than a flat list of twelve remarks.',
      'Flag one thing that is neither: there is no test in the diff for a function that computes money and has two branches. That is a request for change, but it is a request about the PR rather than about a line, so it belongs in the summary comment rather than inline.',
      'Say the priority out loud in the summary, because a review with four blocking comments and eight nits and no ordering leaves the author to guess. Name the one thing that must change before this merges: the missing guard on an unknown code.',
    ],
    keyPoints: [
      'Blocks on the crash for unknown codes, the negative total, and float money',
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
    ],
    keyPoints: [
      'Anchors the comment on a concrete failing case, not on the code style',
      'States clearly that it blocks, rather than softening the signal away',
      'Separates the required outcome from a suggested implementation',
      'Assumes a reason may exist and asks, in one clause',
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
    id: 'coding-023',
    round: 'coding',
    category: 'Code review',
    question: 'The PR is correct and tested, but you would have built it differently. What do you say?',
    answer: [
      'Approve it. A review is a check on correctness, clarity, and consistency with the codebase, not a vote on whose design taste wins. Blocking working, tested code over a preference is the single most corrosive habit a senior reviewer can have, because it teaches the team that merging requires guessing your aesthetics.',
      'Say the alternative anyway, labelled clearly as non-blocking, if it carries information worth having: "approving, and for what it is worth I would have kept this derived rather than stored, because the two can drift. Not worth changing now." The author learns something and nothing is held hostage.',
      'Distinguish preference from consistency, because they feel identical and are not. If the codebase has an established pattern and this PR diverges from it without reason, that is a legitimate comment about the codebase rather than about your taste, and it is worth raising as such.',
      'If the difference is large enough that you genuinely believe it will cost the team later, that is not a review comment at all. Approve the PR and start a separate conversation about the direction, because a comment thread on a merged-ready diff is the wrong venue for an architecture discussion.',
    ],
    keyPoints: [
      'Approves correct, tested code rather than blocking on preference',
      'Shares the alternative explicitly labelled as non-blocking',
      'Separates personal taste from codebase consistency, which is legitimate',
      'Moves genuine architecture disagreements out of the PR thread',
    ],
    followUps: ['How do you tell your preference apart from a real maintainability concern?', 'What do you do if this pattern keeps recurring across many PRs?'],
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
    id: 'coding-025',
    round: 'coding',
    category: 'Code review',
    question: 'A junior engineer opens a PR with fifteen real issues. How many comments do you leave?',
    answer: [
      'Not fifteen. A review that returns a wall of comments reads as a verdict on the person rather than the change, and the author cannot tell which three matter. Pick the blocking issues, pick two or three teaching points that generalise, and let the rest go or fold them into a single summary note.',
      'Group rather than repeat. If the same mistake appears seven times, comment once on the first instance and say it applies throughout, which turns seven annoyances into one lesson. Repeating the same comment down the file is how reviewers accidentally send a message about the author.',
      'Take the larger conversation out of the thread. Fifteen issues usually means a gap in shared context, not carelessness, so a fifteen-minute call walking through the change together is faster and considerably kinder than three rounds of written comments. Say the decision out loud in the interview, because knowing when a review is the wrong medium is a staff-level judgement.',
      'Be explicit about what is required versus optional, and say something true about what worked. Not as decoration, but because a review that only names faults gives the author no signal about which of their instincts to keep.',
    ],
    keyPoints: [
      'Selects blocking issues plus a few generalising teaching points',
      'Groups a repeated mistake into one comment rather than repeating it',
      'Escalates to a conversation when the volume signals missing context',
      'Marks required versus optional and names what genuinely worked',
    ],
    followUps: ['How does your approach change if it is a staff peer rather than a junior?', 'What if the same fifteen issues come back in the next PR?'],
  },
  {
    id: 'coding-026',
    round: 'coding',
    category: 'Code review',
    question: 'You are asked to review a PR in an area of the codebase you do not know. How do you handle it?',
    answer: [
      'Say what you can and cannot review, up front and in writing. "I have reviewed this for correctness of the React and the error handling, but I do not know this domain well enough to confirm the business rule is right, so it needs someone who does" is a genuinely useful review. An approval that implies more scrutiny than you applied is worse than declining.',
      'Review what travels regardless of domain, because it is more than people assume: whether the change does what the description says, whether the tests would fail without it, whether failures are handled visibly, whether names match what the code does, and whether anything here is inconsistent with the surrounding file.',
      'Use your ignorance as a signal rather than hiding it. If you cannot follow the flow after a fair effort, that is data about the code, and "I could not follow this without a walkthrough, which suggests the next person will not either" is legitimate feedback rather than an admission.',
      'Then name who should also look at it, and say so rather than assuming someone will notice. Routing a review to the person with the missing context is part of doing the review, not a way of avoiding it.',
    ],
    keyPoints: [
      'States the scope of the review and what was not checked',
      'Reviews the domain-independent properties, which are substantial',
      'Treats being unable to follow the code as feedback about the code',
      'Actively routes the PR to someone with the missing context',
    ],
    followUps: ['What if you are the only reviewer available?', 'How do you build context in an unfamiliar area without blocking the author for days?'],
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

  // Build prompts (12)
  {
    id: 'coding-028',
    round: 'coding',
    category: 'Build prompts',
    question: 'Build an autocomplete input: as the user types, fetch suggestions and show them in a list. You have 45 minutes. In-flight requests must not race — a slow response for an earlier keystroke must never overwrite a later, faster one.',
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
      'Wire it up: on each keystroke, bump the sequence/create a new controller, debounce, fetch, and on resolution check the request is still current before calling setSuggestions.',
    ],
    keyPoints: [
      'Minimal state: query, suggestions, loading — no premature fields',
      'Debounces the fetch instead of firing on every keystroke',
      'Explicitly solves the race with AbortController or a sequence number',
      'Only applies a response if it is still the latest in-flight request',
    ],
    followUps: ['How would you add keyboard navigation (arrow keys, Enter) to the list?', 'What would you change if suggestions came from a local array instead of a network call?'],
  },
  {
    id: 'coding-029',
    round: 'coding',
    category: 'Build prompts',
    question: 'Build a virtualised list that can smoothly render 100,000 rows of fixed height. You have 45 minutes. Only the rows currently in (or near) the viewport should exist in the DOM.',
    code: `function VirtualList({ items, rowHeight, viewportHeight }: { items: string[]; rowHeight: number; viewportHeight: number }) {
  // state: scrollTop
  // TODO: compute the visible index range from scrollTop, rowHeight, viewportHeight
  // TODO: render a spacer for the rows above/below instead of the full list
  return null;
}`,
    answer: [
      'Say the core idea before coding: track scrollTop, derive the first and last visible row index from it and the row height, and render only that slice — everything else is a spacer, not real DOM.',
      'Use two spacer elements (or one padding-top/height trick) rather than absolutely positioning every row, since fixed-height rows make the arithmetic trivial: startIndex = floor(scrollTop / rowHeight), endIndex = startIndex + ceil(viewportHeight / rowHeight).',
      'Add a small overscan (render a few extra rows above/below the viewport) so fast scrolling does not show a flash of blank space before the next paint.',
      'Name what you are deliberately not building: dynamic/variable row heights, which need a measured-height cache and are a materially harder problem — scope that out explicitly rather than let it derail the 45 minutes.',
    ],
    keyPoints: [
      'Computes visible range from scrollTop and fixed row height',
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
    question: 'Build an accessible combobox: a text input with a filtered, keyboard-navigable listbox of options, following the ARIA Authoring Practices Guide pattern. You have 45 minutes.',
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
    question: 'Build an accessible tabs component (tab list, tabs, panels) following the ARIA Authoring Practices Guide pattern, with roving tabindex keyboard navigation. You have 45 minutes.',
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
      'Keep only the active panel\'s content mounted or visually shown, and make sure the panel is in the tab order (tabIndex=0 on the panel itself) since it often contains no other focusable content.',
    ],
    keyPoints: [
      'Correct roles: tablist, tab (aria-selected, aria-controls), tabpanel (aria-labelledby)',
      'Roving tabindex: exactly one tab is tabbable at a time',
      'Arrow keys move between tabs; states the chosen activation model (automatic vs manual)',
      'Panel is reachable in the tab order even with no other focusable content',
    ],
    followUps: ['How would you support closable tabs?', 'What changes for a vertical tablist?'],
  },
  {
    id: 'coding-032',
    round: 'coding',
    category: 'Build prompts',
    question: 'Implement debounce and throttle from scratch (no library), then explain when you would reach for each. You have 45 minutes. Both must support cancel().',
    code: `function debounce<T extends (...args: any[]) => void>(fn: T, wait: number): T & { cancel: () => void } {
  // TODO
}

function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T & { cancel: () => void } {
  // TODO
}`,
    answer: [
      'Debounce: reset a single timer on every call, only invoking fn once the calls stop for `wait` ms — implemented with one setTimeout id in closure, cleared and reset each call, plus a cancel() that clears it.',
      'Throttle: invoke fn immediately on the first call, then ignore calls for `wait` ms, typically also scheduling one trailing call at the end of the window so the very last event in a burst is not dropped — this trailing-call detail is the part candidates most often miss.',
      'State the use-case split plainly: debounce for "wait until the user stops" (search-as-you-type, resizing before recalculating layout), throttle for "at most once every N ms while it keeps happening" (scroll position tracking, mousemove-driven drag feedback).',
      'Test both with fake timers out loud: rapid calls to debounce should invoke fn once at the end; rapid calls to throttle should invoke it near-immediately, then again after the window, not on every call.',
    ],
    keyPoints: [
      'Debounce resets a single timer per call, fires once calls stop',
      'Throttle fires immediately then rate-limits, with a stated trailing-call behavior',
      'Both implement cancel() to clear pending/queued invocations',
      'Correctly explains which one fits which real use case',
    ],
    followUps: ['How would you add a leading:false option to throttle?', 'How would you unit test the trailing-call behavior deterministically?'],
  },
  {
    id: 'coding-033',
    round: 'coding',
    category: 'Build prompts',
    question: 'Build a promise pool: given an array of tasks (functions returning promises) and a concurrency limit N, run them with at most N in flight at once, resolving with all results in original order. You have 45 minutes.',
    code: `async function promisePool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  // TODO: run at most "limit" tasks concurrently
  // TODO: results[i] must correspond to tasks[i], regardless of completion order
  return [];
}`,
    answer: [
      'State the shape of the solution first: an array of N "worker" loops running concurrently, each pulling the next unstarted task index off a shared cursor and writing its result into a results array at that task\'s original index — order comes from indexing, not from completion order.',
      'Implement the worker as a small async function that loops while a shared mutable index is less than tasks.length, incrementing it and awaiting that task before looping again; start N of these workers with Promise.all.',
      'Cover the failure case explicitly: does one task rejecting abort the whole pool (fail-fast) or should the rest continue (collect settled results)? State the choice and implement fail-fast with Promise.all propagating the rejection unless asked for the alternative.',
      'Sanity-check with a small example out loud: 5 tasks, limit 2 — task 3 should start only once one of the first two finishes, not after both.',
    ],
    keyPoints: [
      'Uses a shared cursor and N worker loops, not a queue-per-batch approach',
      'Results array is indexed by original task position, not completion order',
      'States and implements a clear failure-mode choice (fail-fast vs collect-all)',
      'Verifies concurrency behavior with a concrete example, not just types',
    ],
    followUps: ['How would you support cancelling remaining tasks partway through?', 'How would you report progress as tasks complete?'],
  },
  {
    id: 'coding-034',
    round: 'coding',
    category: 'Build prompts',
    question: 'Build a minimal type-safe event emitter: on, off, and emit, where the event map and payload types are checked at compile time. You have 45 minutes.',
    code: `type EventMap = Record<string, unknown[]>;

class Emitter<T extends EventMap> {
  // TODO: on<K extends keyof T>(event: K, handler: (...args: T[K]) => void): void
  // TODO: off<K extends keyof T>(event: K, handler: (...args: T[K]) => void): void
  // TODO: emit<K extends keyof T>(event: K, ...args: T[K]): void
}`,
    answer: [
      'Design the type first: a generic Emitter<T extends EventMap> where T maps event names to their argument tuples, so on/off/emit are all constrained by the same map and a caller cannot emit an event with the wrong argument types.',
      'Store handlers in a Map (or object) keyed by event name, each holding a Set of handler functions, so off can remove one handler without disturbing others and duplicate on calls do not double-register the same function.',
      'Implement emit to iterate a snapshot (a copied array) of the handler set, not the live set, since a handler that calls off on itself or another handler during emit must not skip or double-fire remaining handlers.',
      'Call out the type-safety payoff concretely: Emitter<{ login: [userId: string]; logout: [] }> makes emitter.emit(\'login\', 123) a compile error, catching a real class of bug before runtime.',
    ],
    keyPoints: [
      'Generic EventMap constrains on/off/emit to consistent, checked argument types',
      'Handlers stored per-event in a Set, supporting clean removal via off',
      'Emits over a snapshot of handlers so mutation during emit is safe',
      'Can state a concrete example of a type error the design prevents',
    ],
    followUps: ['How would you add a once() method?', 'How would you support wildcard/"any event" listeners without losing type safety?'],
  },
  {
    id: 'coding-035',
    round: 'coding',
    category: 'Build prompts',
    question: 'Build a drag-to-reorder list: dragging an item to a new position updates the list order, keyboard-operable, no external DnD library. You have 45 minutes.',
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
    question: 'Build a tiny external store (get, set, subscribe) and a React hook that reads it via useSyncExternalStore, with no external state library. You have 45 minutes.',
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
    question: 'Build an LRU (least-recently-used) cache with get and put, both O(1), fixed capacity. You have 45 minutes.',
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
    followUps: ['How would you make this thread-safe if used from multiple async contexts?', 'How would you add a TTL (time-based expiry) on top of the LRU eviction?'],
  },
  {
    id: 'coding-038',
    round: 'coding',
    category: 'Build prompts',
    question: 'Build a fetch wrapper that retries a failed request with exponential backoff and jitter, up to a max number of attempts. You have 45 minutes.',
    code: `async function fetchWithRetry(url: string, options: RequestInit = {}, maxAttempts = 3): Promise<Response> {
  // TODO: retry on network error or 5xx, not on 4xx
  // TODO: exponential backoff with jitter between attempts
  return fetch(url, options);
}`,
    answer: [
      'Decide what is retryable before coding: a thrown network error or a 5xx response are worth retrying (transient), a 4xx is not (the request itself is wrong and will fail identically every time) — retrying a 4xx just wastes time and can violate rate limits.',
      'Implement exponential backoff: wait base * 2^attempt ms before the next try, with an upper cap so it does not grow unbounded on a high max-attempts value.',
      'Add jitter explicitly and explain why: pure exponential backoff across many clients retrying the same failing endpoint synchronizes them into a thundering herd — adding random jitter (e.g. backoff * (0.5 + Math.random() * 0.5)) spreads retries out and reduces load on a recovering server.',
      'Surface the final failure clearly: after maxAttempts, throw or return the last real error/response rather than swallowing it, so the caller can distinguish "eventually succeeded" from "gave up."',
    ],
    keyPoints: [
      'Retries network errors and 5xx, explicitly does not retry 4xx',
      'Implements exponential backoff with a sensible cap',
      'Adds jitter and can explain the thundering-herd problem it solves',
      'Surfaces the final failure after exhausting attempts instead of swallowing it',
    ],
    followUps: ['How would you respect a Retry-After header if the server sends one?', 'How would you make retries cancellable via AbortSignal?'],
  },
  {
    id: 'coding-039',
    round: 'coding',
    category: 'Build prompts',
    question: 'Build a memoized async lookup: given an expensive async function, return a wrapped version that caches results by argument and de-duplicates concurrent calls for the same argument (only one real call in flight per key at a time). You have 45 minutes.',
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
];
