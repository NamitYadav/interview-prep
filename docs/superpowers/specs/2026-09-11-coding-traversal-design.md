# Coding round — data structures and traversal

**Goal:** Close the one substantive gap left from the review rounds. The `coding` round
has 13 build prompts and 5 debugging items, and **none of them requires traversing a
tree, reasoning about a sweep, or stating a complexity out loud.** Amazon, Google,
Microsoft and Klarna's EU offices all test this, and it is the only thing in the bank a
candidate could pass every question of and still freeze in a CoderPad.

**Scope:** content only, 8 new `coding` questions. No code changes beyond the round's
test floor.

## What is NOT the gap

An earlier framing said the round had "no vanilla-JS utility classics". That was wrong
and is not what this adds. `coding-037` (LRU, O(1), stated), `coding-038` (retry with
backoff and jitter), `coding-039` (`memoizeAsync` with in-flight de-duplication),
`coding-040` (debounce and throttle with `cancel`) and `coding-033` (promise pool) are
exactly that genre and are strong. Do not duplicate them.

The real gap is **data-structure manipulation, traversal, and complexity articulation**.

## The 8 questions

All land in a new category, `Data structures & traversal`, after `Build prompts`. All are
`scratch: true` with a starter signature, so the drill's scratch editor (now persisted)
is usable. Ids `coding-041` through `coding-048`.

1. **Lowest common ancestor of two DOM nodes.** A long-standing staple of frontend
   loops at the large US employers with EU offices. Parent-chain-plus-set vs depth-equalise-then-walk; the `Node.contains` shortcut and
   why an interviewer usually bars it; detached nodes and different documents.
2. **Implement `getElementsByClassName`.** Tree walk, recursion vs an explicit stack and
   why the stack matters on deep trees, `classList` vs `className` parsing, and the
   live-vs-static distinction real DOM collections have.
3. **Merge overlapping intervals.** Sort-then-sweep, O(n log n) dominated by the sort.
   Frame it in a frontend context — overlapping availability blocks in a calendar, or
   merging visible row ranges in a virtualised list — not as an abstract puzzle.
4. **Flatten a comment tree, and rebuild it.** Nested tree to a flat list with depth for
   rendering, and the reverse from a flat `parentId` list in one pass with a lookup map.
   The most frequently *actually needed* of these on real frontend work.
5. **`deepEqual`.** `Object.is` for primitives (NaN, ±0), `Date`/`Map`/`Set`/typed
   arrays, cycles via a seen-pair set, and why `JSON.stringify` comparison is wrong
   (key order, `undefined`, cycles throwing).
6. **`EventEmitter` with `on`/`off`/`once`/`emit`.** The subscriber-list-mutated-during-
   emit trap, `once` unsubscribing itself, and why unbounded listener growth is a real
   frontend memory leak rather than a theoretical one.
7. **`Promise.all` from scratch**, then contrast with `allSettled`. Results ordered by
   input index and not completion order, the empty-array case, first-rejection
   semantics, and that the other promises are not cancelled — only ignored.
8. **Infinite scroll with `IntersectionObserver`.** A custom hook: observer lifecycle and
   cleanup, re-observing when the sentinel node changes, guarding against a fetch storm
   while one page is already in flight, and why a scroll-offset calculation is the wrong
   tool.

## Requirements on every answer

- **State the complexity out loud, in the answer text**, time and space, with the
  operation that dominates it named. This is the specific habit the round never trains.
- Name the **brute-force version first and why you would not ship it** — interviewers
  score the progression, not just the destination.
- Name at least one **edge case that breaks a naive solution** (a cycle, an empty input,
  a detached node, a listener removed mid-emit).
- Say what to **narrate while writing it**, since these are live-coded under observation.
- `keyPoints` must include a complexity item and an edge-case item.
- Within the 390-word budget; overflow to `deeper`.

## Constraints

- Public repo rules stand: no employer facts, no real stories, no CV specifics.
- `data.test.ts`'s `coding` floor moves 27 → 35.
- `keyPoints` must be tickable from `answer` alone; placeholders never nest.
