import type { Question } from '../types';

export const hm: Question[] = [
  // Architecture & system design (10)
  {
    id: 'hm-001',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'How do you decide between a monolith SPA and micro-frontends?',
    answer: [
      'Start from the organizational problem, not the technology: micro-frontends earn their complexity when [multiple teams] need independent deploy cadence, separate release trains, or different tech stack lifecycles, not because the codebase feels big.',
      'Name the real costs up front: duplicated dependencies unless you share a runtime, cross-app design consistency, shared state and auth handled once instead of N times, and a harder local dev setup. A strong answer treats these as a checklist, not an afterthought.',
      'Give the decision framework directly: team count and topology first, deploy independence need second, then shared-library maturity, then only consider it if a monolith SPA with clear internal module boundaries genuinely cannot serve those needs.',
      'Close with the default position at staff level: prefer a well-modularized monolith SPA until team-scaling pain is concrete and repeated, since most projects reach for micro-frontends before they need them.',
    ],
    keyPoints: [
      'Frames the decision around team topology, not codebase size',
      'Names concrete costs: duplicated deps, shared state, dev setup complexity',
      'Gives an explicit ordered decision framework',
      'States a default bias toward a modular monolith until proven otherwise',
    ],
    followUps: ['What would make you migrate an existing monolith to micro-frontends?', 'How do you keep design consistency across independently deployed apps?'],
  },
  {
    id: 'hm-002',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'What are the real trade-offs of Module Federation for micro-frontends?',
    answer: [
      'Lead with what it actually solves: independently deployable, independently built remotes sharing a runtime, so you avoid the classic iframe/duplication tax while still letting teams ship on their own schedule.',
      'Be direct about the costs: shared dependency version drift (React or a design system loaded twice if versions mismatch), harder debugging across remote boundaries, and a build/deploy pipeline that now has to reason about host-remote compatibility, not just one app.',
      'Cover the operational tax: you need a strategy for versioning shared singletons, a fallback story if a remote fails to load, and a way to test host + remote combinations before they hit production — this is infrastructure work, not a config flag.',
      'End with when it is worth it: [genuine multi-team independent-deploy need], not as a default architecture for a single team that could just use one build.',
    ],
    keyPoints: [
      'Explains what Module Federation actually buys you',
      'Names concrete costs: version drift, cross-remote debugging, pipeline complexity',
      'Covers shared singleton versioning and remote-failure fallback',
      'States when it is and is not worth adopting',
    ],
    followUps: ['How would you test a host against a remote before deploy?', 'How would you detect a remote that loaded but is silently degraded in production?'],
  },
  {
    id: 'hm-003',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'How would you design a shared component library used by N product teams?',
    answer: [
      'Start with governance, not code: define who owns the library, how a new component gets proposed and accepted, and what the bar is for "generic enough to belong here" versus staying in one app.',
      'Cover the technical shape: a clear public API surface (props, not implementation details), theming/tokens as the extension point instead of one-off style overrides, and a documented deprecation path so teams are not surprised by breaking changes.',
      'Address adoption directly: a library nobody uses is dead weight — plan for a migration/adoption push (codemods, office hours, a visible changelog) rather than assuming teams will pull it in on their own.',
      'Name the failure mode to avoid: a library that grows unbounded props/variants trying to serve every team\'s edge case, which usually means the API needs a composition primitive instead of another flag.',
    ],
    keyPoints: [
      'Governance and contribution model defined before code details',
      'Public API surface and tokens/theming as the extension point',
      'Explicit deprecation and migration/adoption plan',
      'Names the "too many variants" failure mode and its fix',
    ],
    followUps: ['How do you handle a team that needs a variant the library does not support?', 'How do you decide something belongs in the shared library versus staying app-specific?'],
  },
  {
    id: 'hm-004',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'How do you version and roll out breaking changes in a design system?',
    answer: [
      'Use semver meaningfully: patch/minor for additive and non-breaking changes, major for anything that changes an existing public API or visual contract consumers rely on, and communicate that distinction clearly in release notes.',
      'Prefer additive migration paths over hard cuts: ship the new API alongside the old one behind a clearly named prop or component variant, give consumers a deprecation window with a real deadline, and provide a codemod where the change is mechanical.',
      'Make the blast radius visible before you ship: know which consuming apps use the changing component and at what usage volume, so you can sequence rollout from lowest-risk to highest-risk consumers.',
      'Close the loop with monitoring: track how many consumers are still on the deprecated path and chase the long tail explicitly, rather than assuming a changelog entry is enough.',
    ],
    keyPoints: [
      'Meaningful semver discipline tied to actual API/visual contract',
      'Additive deprecation path plus codemod where mechanical',
      'Visibility into which apps use the changing component before rollout',
      'Active tracking of long-tail migration, not just a changelog note',
    ],
    followUps: ['How do you handle a team that cannot migrate before the deprecation deadline?', 'What would you automate first in this rollout process?'],
  },
  {
    id: 'hm-005',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'Walk me through your framework for choosing state management: server state vs client state, and when Redux still makes sense.',
    answer: [
      'Split the problem first: server state (data fetched from an API, with caching/invalidation/loading semantics) is a fundamentally different problem from client/UI state (form values, a modal being open, a wizard step), and reaching for one tool for both is the most common mistake.',
      'For server state, favor a dedicated data-fetching layer (cache-aware, with built-in invalidation and background refetch) over hand-rolled state in a global store, since that logic is genuinely hard to get right by hand.',
      'For client state, default to local component state or context for anything scoped to a feature, and reserve a global store for state that is genuinely cross-cutting: [shared UI state used by unrelated parts of the app, real-time collaborative state, or state that must survive route changes].',
      'State plainly when Redux (or an equivalent) still earns its place: large teams needing strict, inspectable state transitions with time-travel debugging, or complex cross-cutting client state where prop-drilling or ad hoc context would become unmanageable.',
    ],
    keyPoints: [
      'Separates server state from client state as different problems',
      'Prefers a dedicated data-fetching/cache layer for server state',
      'Defaults to local/context for scoped client state',
      'Gives a concrete, non-dogmatic case for when Redux still helps',
    ],
    followUps: ['How would you migrate a team off over-used global state?', 'What is a case where you regretted using local state instead of a global store?'],
  },
  {
    id: 'hm-006',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'How do you design a data-fetching layer: caching, invalidation, optimistic updates?',
    answer: [
      'Anchor caching to a key strategy, not a timer: cache by [resource + params], with a clear rule for what invalidates it — a mutation touching that resource, an explicit refetch trigger, or time-based staleness for data that tolerates it.',
      'Cover invalidation directly: prefer targeted invalidation (invalidate the specific query keys a mutation affects) over broad "refetch everything," and have a fallback for cases where the affected keys are not fully known.',
      'For optimistic updates, be explicit about the contract: update the cache immediately assuming success, keep the previous value to roll back on failure, and always pair it with a visible error/rollback UX so a failed mutation is never silently swallowed.',
      'Name the edge cases that separate a junior from a staff-level answer: race conditions between an optimistic update and a slower background refetch, and how you avoid stale data winning the race.',
    ],
    keyPoints: [
      'Key-based caching strategy with an explicit invalidation rule',
      'Targeted invalidation preferred over blanket refetch',
      'Optimistic updates always paired with rollback and visible error handling',
      'Names the race-condition edge case between optimistic and background updates',
    ],
    followUps: ['How would you debug a cache that shows stale data intermittently?', 'When would you avoid optimistic updates entirely?'],
  },
  {
    id: 'hm-007',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'How would you choose a rendering strategy — SPA vs SSR vs streaming — for a B2B dashboard?',
    answer: [
      'Start from the actual user profile: a B2B dashboard is typically behind auth, used repeatedly by the same logged-in users, and less SEO-sensitive than a marketing site — that alone removes a big argument for SSR.',
      'Weigh what SSR/streaming actually buys you here: faster first paint and better perceived performance on a data-heavy first load, at the cost of a more complex deployment (a server runtime, hydration mismatches to manage, more moving pieces to operate).',
      'Give the practical framework: if the dashboard is data-heavy and first-load time matters (e.g. for on-call or time-sensitive users), streaming server rendering for the shell plus client-side data fetching for the heavy parts is a reasonable middle ground; if it is used all day by the same session, a well-optimized SPA with route-based code splitting is often simpler and sufficient.',
      'Flag the trap: choosing SSR because it is trendy rather than because the metrics (LCP, INP, bounce on cold load) actually justify the added operational complexity for this specific user base.',
    ],
    keyPoints: [
      'Starts from the actual user/auth profile, not a technology preference',
      'States concretely what SSR/streaming buys versus costs',
      'Gives a practical decision framework tied to data-heaviness and session pattern',
      'Names the "SSR because trendy" anti-pattern explicitly',
    ],
    followUps: ['How would you measure whether SSR actually helped after adopting it?', 'What would make you migrate a dashboard back to a pure SPA?'],
  },
  {
    id: 'hm-008',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'How do you architect a frontend for a multi-tenant / whitelabel product?',
    answer: [
      'Separate the two axes clearly: theming (colors, logos, typography — a design-token layer resolved per tenant at runtime or build time) versus behavior differences (feature flags per tenant, not forked code paths), since conflating them is the root cause of most whitelabel messes.',
      'Push tenant differences to configuration, not branches: a tenant config object driving tokens and enabled features, loaded once per session, so the same build serves every tenant rather than maintaining N forked builds.',
      'Plan for the two failure modes explicitly: tenant-specific one-off requests that tempt you into a special-cased code branch (resist this, generalize the config schema instead), and a tenant config that grows so large it becomes its own maintenance burden — mitigate with a clear schema and validation.',
      'Cover testing: you need at least one representative tenant configuration exercised in CI beyond the default, since a change that only gets tested against tenant A silently breaks tenant B\'s theme or flag combination.',
    ],
    keyPoints: [
      'Separates theming (tokens) from behavior (feature flags) as distinct axes',
      'Pushes differences to configuration rather than forked code paths',
      'Names the one-off special-case trap and the config-bloat failure mode',
      'CI covers more than one representative tenant configuration',
    ],
    followUps: ['How would you onboard a new tenant with a genuinely unique requirement?', 'How do you test theming regressions across tenants?'],
  },
  {
    id: 'hm-009',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'How do you handle a large framework upgrade across many apps?',
    answer: [
      'Start with a dependency and usage audit: which apps depend on which deprecated APIs, which third-party libraries block the upgrade, and which apps are lowest-risk to go first — this sequencing decision matters more than the migration mechanics themselves.',
      'Pick a pilot app deliberately: [smallest real app that still exercises the risky surface area], migrate it fully, and use it to build the actual playbook (codemods, common breakage patterns, a rollback path) before touching the rest.',
      'Roll out in escalating batches rather than all at once: each batch validated against its own test suite and a canary/staged rollout where possible, with a clear rollback trigger defined in advance (a specific error-rate or regression threshold, not a vague "if it looks bad").',
      'Keep the human side visible: communicate the plan and timeline to affected teams early, and budget real calendar time for the long tail of edge-case apps that always take longer than the pilot suggested.',
    ],
    keyPoints: [
      'Dependency/usage audit before any migration work starts',
      'Deliberately chosen pilot app used to build a reusable playbook',
      'Escalating batch rollout with a predefined rollback trigger',
      'Explicit communication plan and buffer for long-tail apps',
    ],
    followUps: ['What would you do if the pilot app revealed a blocking issue?', 'How do you decide the rollback trigger threshold in advance?'],
  },
  {
    id: 'hm-010',
    round: 'hm',
    category: 'Architecture & system design',
    question: 'How do you design a frontend for offline or flaky networks?',
    answer: [
      'Start by naming what must work offline versus what can degrade gracefully: not every feature needs offline support, so scope it to [the specific critical flows] rather than the whole app.',
      'Cover the mechanics: a service worker or equivalent for asset caching, a local persistence layer (IndexedDB or similar) for data that needs to survive a refresh or connectivity drop, and a clear sync strategy for reconciling local changes once connectivity returns.',
      'Be explicit about conflict handling: when a local change and a server change to the same resource both exist, define the resolution rule up front (last-write-wins, a merge strategy, or surfacing the conflict to the user) rather than discovering it in production.',
      'Address UX honestly: users need visible, accurate connectivity/sync-status indicators — a queued action that silently fails to sync is worse than one that visibly tells the user it is pending.',
      'For an EU/GDPR context, treat local persistence of personal data deliberately: only cache what the offline flow genuinely needs, give queued data a bounded lifetime, and make sure a user-initiated data deletion or logout actually clears the local store rather than leaving stale personal data behind on the device.',
    ],
    keyPoints: [
      'Scopes offline support to specific critical flows, not the whole app',
      'Covers asset caching, local persistence, and a sync strategy',
      'Defines a conflict-resolution rule for local vs server changes up front',
      'Visible, accurate connectivity/sync-status UX for the user',
      'Addresses GDPR data-minimization and clearing local personal data on logout/deletion',
    ],
    followUps: ['How would you test this reliably in CI?', 'What is your conflict-resolution rule when both sides changed the same field?'],
  },

  // Performance (6)
  {
    id: 'hm-011',
    round: 'hm',
    category: 'Performance',
    question: 'Walk me through how you find and fix a slow page.',
    answer: [
      'Measure before touching anything: start with Core Web Vitals (LCP, INP, CLS) from real-user data if available, then reproduce with a profiler (browser performance panel, or a framework-specific profiler) to find where time actually goes rather than guessing.',
      'Look specifically for long tasks blocking the main thread, unnecessary re-renders, oversized bundle chunks loaded eagerly, and waterfall data fetches — these four cover the large majority of real-world slow pages.',
      'Fix in priority order by impact, not by what is easiest: a single long task blocking interaction usually matters more than a marginal render optimization, so quantify each candidate fix\'s expected impact before implementing it.',
      'Close the loop: after the fix, re-measure the same metric you started with and confirm the improvement in a real environment, not just locally — perceived improvement without a measurement is not a fix you can defend later.',
    ],
    keyPoints: [
      'Starts from Core Web Vitals / real-user data, not guessing',
      'Uses a profiler to find actual bottlenecks: long tasks, re-renders, bundle size, waterfalls',
      'Prioritizes fixes by measured impact, not ease of implementation',
      'Re-measures after the fix to confirm the improvement',
    ],
    followUps: ['What tool would you reach for first?', 'How do you distinguish a real regression from noise in the metrics?'],
  },
  {
    id: 'hm-012',
    round: 'hm',
    category: 'Performance',
    question: 'What is your bundle size strategy: code splitting, tree shaking, analyzing, budgets?',
    answer: [
      'Start with visibility: run a bundle analyzer regularly, not just once, so you can see what is actually shipped and catch an accidental large dependency before it ships, not after users report slowness.',
      'Apply code splitting at natural boundaries: route-based splitting as the default, plus splitting genuinely large, rarely-used features (a heavy chart library, an admin-only panel) behind a dynamic import rather than bundling them into the initial payload.',
      'Make tree shaking actually work: prefer libraries with real ESM support and named exports, avoid side-effectful imports that block dead-code elimination, and periodically audit for a dependency that silently defeats tree shaking.',
      'Set a performance budget and enforce it in CI (a maximum bundle size per route, checked automatically), since without an enforced budget, bundle size creeps up gradually and nobody notices until it is a real problem.',
    ],
    keyPoints: [
      'Regular bundle analysis, not a one-time audit',
      'Route-based plus feature-based code splitting for heavy, rare features',
      'Active attention to what actually enables tree shaking',
      'CI-enforced performance budget, not just aspirational goals',
    ],
    followUps: ['What would you do if a budget check started failing?', 'How do you decide what counts as "rarely used" enough to split out?'],
  },
  {
    id: 'hm-013',
    round: 'hm',
    category: 'Performance',
    question: 'How do you handle rendering performance in large tables or lists?',
    answer: [
      'For genuinely large datasets, virtualization is the primary lever: render only the visible rows plus a small buffer, since no amount of memoization saves you from rendering thousands of DOM nodes.',
      'Use memoization deliberately, not everywhere: memoize expensive cell renderers or derived data, but recognize memoization has real limits — it adds its own comparison overhead, so over-memoizing simple components can make things slower, not faster. If the codebase runs the React Compiler, most component-level memoization is already handled and hand-written memo is only worth it for expensive derived data the compiler cannot see through — check which regime you are in before adding any.',
      'Watch for the classic large-table traps: recreating row/column definitions or callback props on every render (breaking memoization downstream), and expensive formatting/derivation logic running per cell per render instead of being precomputed once.',
      'Measure with a real dataset size in mind: performance work validated on 50 rows tells you nothing about behavior at [your product\'s realistic upper bound], so test against representative scale before declaring a fix done.',
    ],
    keyPoints: [
      'Virtualization as the primary lever for genuinely large lists',
      'Deliberate, not blanket, use of memoization with awareness of its limits',
      'Names the "unstable props breaking memoization" trap explicitly',
      'Tests against representative data scale, not a small sample',
    ],
    followUps: ['What virtualization approach have you used, and what were its limits?', 'How do you handle variable row heights in a virtualized list?'],
  },
  {
    id: 'hm-014',
    round: 'hm',
    category: 'Performance',
    question: 'How do you avoid waterfalls in data fetching?',
    answer: [
      'Name the pattern first: a waterfall happens when a component fetches, waits, renders a child, and that child then fetches again, serializing requests that could have run in parallel.',
      'Fix it structurally: fetch what you know you need at the top of the tree (or in a route loader) in parallel, rather than letting each nested component discover its own data dependency only after mounting.',
      'For cases where a genuine dependency exists (fetch B needs an ID from fetch A\'s result), be explicit about it rather than accidental — and consider whether the backend can combine them into one request instead of forcing two sequential round trips.',
      'Verify with the network waterfall view directly: a fix is only real if you can show the requests now overlapping in time, not just that the page "feels faster."',
    ],
    keyPoints: [
      'Correctly defines what a data-fetching waterfall is',
      'Fixes it by fetching in parallel at the right level (loader/top of tree)',
      'Distinguishes accidental sequential fetches from genuine dependencies',
      'Verifies the fix with an actual network waterfall, not a feeling',
    ],
    followUps: ['How would you fetch data for a page with several independent widgets?', 'When is a genuine sequential dependency unavoidable?'],
  },
  {
    id: 'hm-015',
    round: 'hm',
    category: 'Performance',
    question: 'How do you build performance budgets into CI?',
    answer: [
      'Pick metrics that are both meaningful and stable enough to gate on: bundle size per route and lab metrics from a synthetic Lighthouse run (LCP, CLS, and Total Blocking Time as the lab proxy for INP — INP itself is interaction-driven and only comes from field data) are common choices, since real-user metrics are too noisy to block a merge on directly.',
      'Set the budget as a concrete threshold tied to user impact, not an arbitrary round number — anchor it to [the current baseline plus an agreed tolerance], and revisit it periodically rather than letting it go stale.',
      'Decide the failure mode deliberately: a hard CI block for a clear regression versus a warning/dashboard for softer signals, since blocking merges on every noisy metric will just get the check disabled by a frustrated team.',
      'Pair budgets with real-user monitoring in production, since a synthetic CI check catches regressions before merge but cannot replace seeing what actually happens for real users after deploy.',
      'For an EU audience, pick or configure the RUM tool with two regimes in mind: the consent gate before it reads or writes anything on the device is ePrivacy law (§25 TDDDG in Germany) and applies whether or not the data is personal; GDPR then governs what it captures — minimize personal data (IP, precise identifiers), and treat EU hosting as risk reduction rather than a legal requirement.',
    ],
    keyPoints: [
      'Chooses stable, CI-appropriate metrics over noisy real-user ones',
      'Ties the threshold to a real baseline, revisited periodically',
      'Deliberate choice between hard block and soft warning per metric',
      'Pairs CI budgets with production RUM rather than relying on one or the other',
      'Separates the ePrivacy/TDDDG consent gate from GDPR data minimization for the RUM tool',
    ],
    followUps: ['What would you do if a budget check became a source of team friction?', 'How often would you revisit the budget thresholds?'],
  },
  {
    id: 'hm-016',
    round: 'hm',
    category: 'Performance',
    question: 'What perceived-performance techniques do you actually use — skeletons, prefetch, optimistic UI?',
    answer: [
      'Treat perceived performance as a real, separate lever from raw load time: users tolerate a slower true load time much better when the UI gives clear, honest feedback that something is happening.',
      'Use skeleton screens for predictable-shape content (matching the eventual layout) rather than a generic spinner, since a layout-matching skeleton reduces perceived wait and avoids layout shift when real content arrives.',
      'Use prefetching deliberately for high-confidence next steps (hovering a link, an obvious next page in a flow), but bound it — over-eager prefetching wastes bandwidth and can itself slow down the current page.',
      'Use optimistic UI where the success case is the overwhelming likely outcome and failure has a clear, honest rollback path — never where a silent failure would leave the user with incorrect information.',
    ],
    keyPoints: [
      'Treats perceived performance as distinct from raw load time',
      'Layout-matching skeletons over generic spinners',
      'Prefetching scoped to high-confidence cases, not blanket',
      'Optimistic UI bounded to cases with honest, visible rollback',
    ],
    followUps: ['When would you avoid a skeleton screen?', 'How do you decide what to prefetch versus what to leave lazy?'],
  },

  // Testing & quality (6)
  {
    id: 'hm-017',
    round: 'hm',
    category: 'Testing & quality',
    question: 'How do you think about the testing pyramid for a frontend at scale, and where do you put the money?',
    answer: [
      'Take a position and defend it: the classic pyramid (many unit tests, fewer integration, a thin e2e layer) versus the integration-weighted "trophy" that argues component tests with a real DOM give more confidence per test — a staff answer names both, says which one you default to for a UI-heavy codebase and why, and agrees that the one shape that fails at scale is a suite dominated by e2e.',
      'Put the money where the shape says: aggressively unit-test business logic, hooks, and utility functions; use integration/component tests to cover realistic user interactions within a feature; reserve e2e for [the handful of flows that must never break], since e2e is the slowest and flakiest layer per test.',
      'Be honest about the anti-pattern seen at scale: teams that lean on e2e as a substitute for unit coverage because it "feels more real," which produces a slow, flaky suite that erodes trust and gets skipped under deadline pressure.',
      'Tie test investment to risk, not to code volume: a small, high-risk piece of logic (pricing, auth, data integrity) deserves disproportionate test coverage relative to its size.',
    ],
    keyPoints: [
      'Names pyramid vs trophy and defends a default rather than asserting one as settled',
      'Concrete allocation: unit for logic, integration for composition, thin e2e layer',
      'Names the "e2e as a crutch" anti-pattern explicitly',
      'Ties test investment to risk, not raw code volume',
    ],
    followUps: ['How would you fix a team that has inverted the pyramid?', 'What is the first test you would write for a new critical feature?'],
  },
  {
    id: 'hm-018',
    round: 'hm',
    category: 'Testing & quality',
    question: 'When does visual regression testing pay off, and what are its failure modes?',
    answer: [
      'It pays off specifically for [a shared component library or design system, or a small number of pixel-sensitive critical screens] where a subtle visual break (broken layout, wrong color from a token change) would otherwise ship unnoticed, since functional tests do not catch pure visual regressions.',
      'Be direct about the cost side: it is slower and more maintenance-heavy than most test types — every intentional visual change requires updating baseline snapshots, and cross-environment rendering differences (fonts, OS-level anti-aliasing) can produce false positives.',
      'Name the classic failure modes: snapshot noise from non-deterministic content (dates, animations, random data) causing constant false failures, and a team approving snapshot updates without actually looking at the diff, which quietly defeats the whole point.',
      'Scope it deliberately rather than blanket: apply it to the highest-value, most stable surfaces first, and resist covering every screen, since an overly broad suite becomes a maintenance tax that outweighs its value.',
    ],
    keyPoints: [
      'Names the specific case where it earns its cost (shared components, pixel-sensitive screens)',
      'States the real maintenance cost of updating baselines',
      'Names concrete failure modes: snapshot noise, rubber-stamped diffs',
      'Recommends scoping it deliberately rather than applying it everywhere',
    ],
    followUps: ['How do you handle a snapshot test failing because of an intentional change?', 'How would you reduce false positives from font rendering differences?'],
  },
  {
    id: 'hm-019',
    round: 'hm',
    category: 'Testing & quality',
    question: 'How do you deal with flaky e2e tests — root causes and remedies?',
    answer: [
      'Diagnose the actual root cause before applying a fix: the most common causes are race conditions (asserting before an async update settles), shared/leaking state between tests, environment-dependent timing, and tests coupled to implementation details rather than user-visible behavior.',
      'Fix the root cause, not the symptom: prefer explicit waits for a specific condition (an element appearing, a network call resolving) over fixed sleeps, and isolate test state so one test\'s side effects cannot bleed into the next.',
      'Treat retries as a mitigation, not a cure: a small, bounded retry can absorb genuine environment flakiness, but a test that only passes on retry is a signal to investigate, not to silently accept forever — track retry rates as a health metric.',
      'Address the team-level failure mode: a flaky suite that gets ignored trains people to ignore all e2e failures, including real ones, so treat flakiness with the same urgency as a broken build, with an owner and a deadline to fix or quarantine the test.',
    ],
    keyPoints: [
      'Diagnoses actual root causes: race conditions, shared state, timing, brittle selectors',
      'Fixes root cause with explicit waits and isolated state, not sleeps',
      'Treats retries as bounded mitigation with tracked retry rate, not a permanent fix',
      'Names the team-trust erosion risk of an ignored flaky suite',
    ],
    followUps: ['How would you quarantine a flaky test without losing its coverage?', 'What retry policy would you consider acceptable long-term?'],
  },
  {
    id: 'hm-020',
    round: 'hm',
    category: 'Testing & quality',
    question: 'How do you design quality gates in CI without slowing teams down?',
    answer: [
      'Separate gates by cost and confidence: fast, cheap checks (lint, type check, unit tests) run on every push and block merge; slower or less deterministic checks (full e2e suite, visual regression) run on a tighter subset of triggers or asynchronously, with a clear escalation path if they fail after merge.',
      'Make failures actionable, not just red: a failing gate should point clearly at what broke and how to reproduce it locally, since an opaque CI failure is what actually slows teams down, not the gate itself.',
      'Keep gates honest: a gate that is frequently overridden or skipped is not doing its job — either fix the underlying flakiness/noise, or acknowledge it is not a real gate and stop pretending it blocks anything.',
      'Revisit the gate set periodically as the codebase and team grow: what was proportionate at [10 engineers] may be too loose or too strict at [50 engineers], so treat the CI pipeline itself as something with an owner and a review cadence.',
    ],
    keyPoints: [
      'Tiers gates by cost/confidence: fast blocking checks vs slower async ones',
      'Ensures gate failures are actionable and locally reproducible',
      'Treats a frequently-overridden gate as a signal to fix or retire it',
      'Revisits the gate set as team/codebase scale changes',
    ],
    followUps: ['What would you do if engineers started routinely bypassing a gate?', 'How do you decide what blocks merge versus what runs post-merge?'],
  },
  {
    id: 'hm-021',
    round: 'hm',
    category: 'Testing & quality',
    question: 'How do you approach contract testing with backend teams?',
    answer: [
      'Start from the actual failure it prevents: a frontend built against an assumed API shape breaks when the backend changes a field or response shape without the frontend knowing — contract tests catch that mismatch before it reaches production.',
      'Pick a concrete mechanism appropriate to the org: a shared schema (OpenAPI/GraphQL schema) validated in both the frontend\'s and the backend\'s CI, or a dedicated consumer-driven contract testing tool, so both sides run against the same source of truth rather than trusting documentation to stay accurate.',
      'Make ownership explicit: who updates the contract when the API changes, and does that change require the frontend\'s explicit sign-off before backend ships it — without a clear process, contract tests decay into unenforced documentation.',
      'Treat it as complementary, not a replacement for integration tests against a real (or realistic staging) backend, since a contract test proves shape compatibility, not full behavioral correctness.',
    ],
    keyPoints: [
      'States the concrete failure mode contract testing prevents',
      'Names a specific mechanism: shared schema or consumer-driven contract tooling',
      'Defines clear ownership and update process for the contract',
      'Positions it as complementary to, not a replacement for, integration tests',
    ],
    followUps: ['What would you do if the backend team resisted adopting this?', 'How do you handle a contract change that is a genuine breaking change?'],
  },
  {
    id: 'hm-022',
    round: 'hm',
    category: 'Testing & quality',
    question: 'What is your approach to accessibility testing?',
    answer: [
      'Layer it like any other quality concern: automated checks (axe or equivalent) in CI catch a meaningful subset of issues (missing labels, contrast, ARIA misuse) cheaply and continuously, but they cannot catch everything.',
      'Pair automation with manual checks for the parts it structurally cannot cover: full keyboard-only navigation through key flows, and periodic screen reader testing on the most-used surfaces, since automated tools reliably miss real usability problems for assistive-tech users.',
      'Bake it into the definition of done for new components rather than treating it as a separate audit pass afterward — an accessibility bug caught at review time is far cheaper than one found in a later dedicated audit.',
      'Be honest about where the bar is for a given product: a real target ([WCAG 2.2 AA / EN 301 549], for instance) stated explicitly, rather than a vague "we care about accessibility" with no measurable standard behind it.',
      'For EU products, know that the bar may not be optional: the European Accessibility Act (BFSG in Germany) has applied since June 2025 to many consumer-facing digital services, so a staff answer checks whether the product is in scope before treating accessibility as a quality preference.',
    ],
    keyPoints: [
      'Automated checks in CI as the continuous, cheap first layer',
      'Manual keyboard and screen reader testing for what automation misses',
      'Accessibility folded into component definition-of-done, not a separate audit',
      'States a concrete, named standard as the target bar',
      'Knows whether the European Accessibility Act makes the bar mandatory for this product',
    ],
    followUps: ['What automated tool have you used and what did it miss?', 'How would you get a team to actually act on accessibility findings?'],
  },

  // React & data (6)
  {
    id: 'hm-023',
    round: 'hm',
    category: 'React & data',
    question: 'Which concurrent React features do you actually use, and why?',
    answer: [
      'Anchor the answer in a real problem each feature solves rather than reciting the feature list: transitions for marking a state update as non-urgent so a heavy re-render does not block user input (e.g. typing in a filter while a large list re-renders), and suspense for coordinating loading states declaratively instead of ad hoc boolean flags scattered across components.',
      'Cover the React 19 additions the same way: useDeferredValue for keeping an input responsive while an expensive dependent render lags behind, the Actions family (useActionState, useOptimistic, form actions) for collapsing pending/error/optimistic state around a mutation into one primitive, and use() for reading a promise or context inside render under Suspense.',
      'Be honest about where the value is concrete versus marginal: transitions genuinely help on [a specific slow interaction, like filtering a large list], while some concurrent features matter more for library authors and framework internals than for typical application code.',
      'Note the adoption cost: these features assume the surrounding code is already reasonably structured (no synchronous side effects hidden in render, predictable data fetching), so retrofitting them onto a codebase with those issues surfaces bugs that were arguably already there.',
      'Close with a grounded stance: adopt incrementally where a concrete symptom (jank on a specific interaction) justifies it, rather than adopting concurrent features wholesale because they are new.',
    ],
    keyPoints: [
      'Ties each feature to a concrete problem it solves, not a feature list',
      'Covers React 19 primitives (useDeferredValue, Actions, use) not just transitions and Suspense',
      'Honest about where the benefit is real versus marginal for app code',
      'Notes the prerequisite of well-structured code before adoption helps',
      'Recommends incremental adoption driven by a concrete symptom',
    ],
    followUps: ['Give an example of a re-render problem you solved with a transition.', 'What bugs did adopting suspense surface in existing code?'],
  },
  {
    id: 'hm-024',
    round: 'hm',
    category: 'React & data',
    question: 'What are the common useEffect misuse patterns you watch for, and what do you use instead?',
    answer: [
      'Name the classic misuse: using an effect to synchronize derived state that could just be computed during render, which causes an extra render pass and a class of stale/out-of-sync bugs — the fix is usually to compute the value directly instead of storing and syncing it.',
      'Flag effects used purely to respond to a user event (e.g. an effect watching a piece of state that only ever changes from one button handler) — that logic belongs directly in the event handler, not smuggled into an effect that fires on every relevant render.',
      'Watch for missing or incorrect dependency arrays used to silence a warning rather than to fix the actual data flow, which produces stale-closure bugs that are hard to debug later — the fix is to restructure so the effect\'s dependencies are naturally correct, not to suppress the lint rule.',
      'State the general principle you check every effect against: an effect should synchronize your component with an external system (network, subscription, DOM API) — if it is not doing that, it probably should not be an effect at all.',
    ],
    keyPoints: [
      'Names "derived state synced via effect" as the classic misuse, with the direct-computation fix',
      'Flags event-response logic smuggled into an effect instead of a handler',
      'Calls out dependency-array suppression as a root-cause dodge, not a fix',
      'States the general test: an effect synchronizes with an external system or it should not exist',
    ],
    followUps: ['Show me how you would refactor an effect that computes derived state.', 'How do you catch this pattern in code review?'],
  },
  {
    id: 'hm-025',
    round: 'hm',
    category: 'React & data',
    question: 'How do you architect form handling at scale — validation, async, large forms?',
    answer: [
      'Separate concerns clearly: form state and validation logic should be decoupled from the rendering layer, so a form library (or a hand-rolled equivalent) owns field state, dirty/touched tracking, and validation timing, while components stay focused on presentation.',
      'Handle validation in layers: synchronous field-level rules for immediate feedback, and async validation (e.g. a uniqueness check against the backend) debounced and clearly scoped to not block the rest of the form from being usable while it resolves.',
      'For genuinely large forms, favor splitting into logical sections with independent validation and lazy rendering of sections not yet reached, rather than one flat form tree re-validating and re-rendering as a whole on every keystroke.',
      'Treat submission as its own state machine: idle, validating, submitting, success, error — each with clear, honest UI feedback, since a form that silently does nothing on a slow submission is a common and avoidable source of user frustration and duplicate submissions.',
      'At staff level, the leverage is in the shared contract, not one form: own the form primitive and validation conventions that [N teams] use, so error display, async validation timing, and submission states behave the same everywhere — and drive adoption with codemods and a migration deadline rather than hoping teams switch.',
    ],
    keyPoints: [
      'Decouples form state/validation logic from the rendering layer',
      'Layers sync and debounced async validation without blocking the form',
      'Splits large forms into sections with independent validation/rendering',
      'Models submission as an explicit state machine with honest feedback',
      'Frames the shared form contract across teams as the staff-level lever',
    ],
    followUps: ['How do you prevent double submission on a slow network?', 'How would you handle a form field whose validation depends on another field?'],
  },
  {
    id: 'hm-026',
    round: 'hm',
    category: 'React & data',
    question: 'What is your error boundary and error-handling strategy?',
    answer: [
      'Use error boundaries for what they are actually good at: catching render-time errors in a subtree and showing a graceful fallback instead of a blank white screen, scoped at a granularity that isolates failure (per major section, not just one at the root) so one broken widget does not take down the whole page.',
      'Be precise about what they do not catch: errors in event handlers, async code, or effects need their own try/catch and explicit error state, since a common mistake is assuming an error boundary is a universal safety net.',
      'Pair every boundary with real observability: log the caught error with enough context (component, user action, relevant state) to a monitoring system, since a silently swallowed error that just shows a fallback UI is a debugging dead end later.',
      'Design the fallback UI itself deliberately: a clear, honest message and a recovery action (retry, reload, go back) rather than a generic "something went wrong" with no path forward for the user.',
      'Close with the org question: who gets paged when a boundary fires, what error rate on a section is acceptable before it counts as an incident, and how the shared boundary component and its logging contract are owned across teams so every product surface reports errors the same way.',
    ],
    keyPoints: [
      'Scopes error boundaries per meaningful section, not just at the app root',
      'Correctly states what boundaries do not catch (handlers, async, effects)',
      'Pairs every caught error with real logging/observability',
      'Designs a fallback UI with an actual recovery action, not a dead end',
      'Names ownership, alerting, and the cross-team error-reporting contract',
    ],
    followUps: ['How do you handle an error thrown inside an async data fetch?', 'What context do you log alongside a caught error?'],
  },
  {
    id: 'hm-027',
    round: 'hm',
    category: 'React & data',
    question: 'How do you think about TypeScript strictness, and where do you draw the line?',
    answer: [
      'Default to strict mode as the baseline for any new codebase: it catches a meaningful class of real bugs (null/undefined handling, implicit any) cheaply, and loosening it later is much harder than starting strict.',
      'Draw the line at diminishing returns, not zero return: extremely elaborate generic types that make the code harder for the next engineer to read are a cost, not a pure win — the goal is catching real bugs and documenting intent, not maximizing type-system cleverness.',
      'Handle the boundary cases explicitly: data crossing an external boundary (API responses, third-party libraries with weak types) should be validated or narrowed at the edge, not trusted blindly just because a type annotation says so — an unchecked `as` cast at that boundary is where real production bugs hide.',
      'For a team with mixed TypeScript experience, invest in a small set of shared patterns (a few well-designed utility types, a documented approach to narrowing) rather than letting every engineer independently reinvent type gymnastics.',
    ],
    keyPoints: [
      'Defaults to strict mode as the baseline for new code',
      'States the diminishing-returns line: readability cost of excessive generics',
      'Flags unchecked boundary casts as the actual risk area',
      'Recommends shared team patterns over ad hoc type gymnastics',
    ],
    followUps: ['How do you validate data at an API boundary in practice?', 'What is a case where a type made code harder to read?'],
  },
  {
    id: 'hm-028',
    round: 'hm',
    category: 'React & data',
    question: 'When do server components help, and when do they not?',
    answer: [
      'Name the concrete win first: moving data-fetching and rendering that does not need interactivity to the server reduces client bundle size and can cut the number of client-server round trips for data-heavy pages.',
      'Be equally concrete about the cost: it introduces a new mental model (what runs where), a build/deploy setup that supports it, and constraints on what can live in a server component (no state or effect hooks, no event handlers, no browser APIs), which is a real learning curve for a team.',
      'Give the practical split: content-heavy, mostly-static or data-driven sections are good server component candidates; anything genuinely interactive (forms, real-time updates, client-side state) stays a client component — the skill is drawing that boundary well, not maximizing how much is server-rendered.',
      'Flag the real adoption risk: server components are stable in React 19, but they only work inside a framework or bundler that implements the server/client boundary, so the cost is framework lock-in plus retrofitting that boundary onto an existing client-only app — for a critical B2B product that argues for a deliberate pilot on one route, not a wholesale rewrite.',
    ],
    keyPoints: [
      'States the concrete bundle-size/round-trip win clearly',
      'States the real cost: new mental model, build setup, hook/API constraints',
      'Gives a practical boundary: data-heavy static content vs interactive client state',
      'Flags framework lock-in and boundary retrofit cost, not immaturity, as the adoption risk',
    ],
    followUps: ['How would you pilot this on an existing app without a full rewrite?', 'What would make you decide against adopting them for a given page?'],
  },

  // Leadership & influence (8)
  {
    id: 'hm-029',
    round: 'hm',
    category: 'Leadership & influence',
    question: 'Tell me about a time you influenced a decision without having direct authority over the people involved.',
    answer: [
      'Use a STAR structure but keep every specific generic: situation (a decision affecting [multiple teams] where you had no formal authority over the deciders), task (the outcome you believed mattered and why), action (how you built the case — data, a prototype, one-on-one alignment before the group discussion), result (what changed and how you know).',
      'Emphasize the mechanism of influence explicitly, since that is what a staff-level interviewer is actually listening for: did you win the room through pre-alignment and relationship investment, through a compelling demonstration (a working prototype beats a slide deck), or through framing the decision around a shared goal the other party already cared about.',
      'Include one honest note on what you would improve: even a successful influence story should show self-awareness about what could have gone faster or smoother, since a story with zero friction reads as rehearsed rather than real.',
      'Close by connecting it to staff scope: this is the muscle that scales beyond a single team, and the interviewer wants evidence you can do it repeatedly, not as a one-off.',
    ],
    keyPoints: [
      'Clean STAR structure covering situation, task, action, and result',
      'Names the actual mechanism of influence used (data, prototype, pre-alignment)',
      'Includes one honest, non-defensive note on what could have gone better',
      'Explicitly ties the story to staff-level, cross-team scope',
    ],
    followUps: ['What would you have done if that approach had not worked?', 'How do you know the change actually stuck after you moved on?'],
  },
  {
    id: 'hm-030',
    round: 'hm',
    category: 'Leadership & influence',
    question: 'Tell me about a technical decision you made and later reversed.',
    answer: [
      'Pick a genuine reversal, not a minor tweak: describe the original decision and the reasoning that felt sound at the time (given [the information available then]), so the interviewer sees you were not simply careless the first time.',
      'Be specific about the signal that triggered the reversal — new information, a production incident, a changed requirement, or data that contradicted the original assumption — since the quality of that trigger detection is what staff-level judgment is actually being evaluated on.',
      'Describe how you handled the reversal itself: how you communicated the change to people who had already bought into the original decision, and how you minimized the cost of the change (a migration plan, not just flipping a switch).',
      'Close with the lesson generalized beyond this one instance: what changed in how you make decisions of that type going forward, which shows the reversal became a durable improvement, not just a one-off correction.',
    ],
    keyPoints: [
      'Original decision framed as reasonable given information at the time',
      'Specific, credible trigger for the reversal named',
      'Describes managing the human side of reversing a decision others bought into',
      'Generalizes the lesson to a lasting change in decision-making process',
    ],
    followUps: ['How did the team react to the reversal?', 'What would have made you catch this sooner?'],
  },
  {
    id: 'hm-031',
    round: 'hm',
    category: 'Leadership & influence',
    question: 'Tell me about a technical disagreement with a senior engineer peer and how it was resolved.',
    answer: [
      'Frame the disagreement around substance, not personality: state the actual technical or strategic point of difference plainly (e.g. [a trade-off between two architectural approaches]), and be fair to the other side\'s position — a one-sided account reads as bias, not conviction.',
      'Describe the resolution process concretely: did you gather more data, prototype both approaches, escalate to a shared decision-maker, or find a genuine third option — the mechanism matters more than who "won."',
      'Be honest about the outcome, including if you were the one who changed your mind — a staff-level story that only ever ends with "and I was right" is a red flag, not a strength.',
      'Close on the relationship, not just the decision: note how you worked with that person afterward, since preserving a working relationship through disagreement is itself part of the skill being assessed.',
    ],
    keyPoints: [
      'States the substantive disagreement fairly, without caricaturing the other side',
      'Describes a concrete resolution mechanism, not just an outcome',
      'Comfortable admitting you were the one who changed your mind, if true',
      'Addresses how the working relationship held up afterward',
    ],
    followUps: ['What would you have done if no resolution had been reached?', 'How do you decide when to escalate versus keep working it out directly?'],
  },
  {
    id: 'hm-032',
    round: 'hm',
    category: 'Leadership & influence',
    question: 'Tell me about mentoring an engineer to their next level.',
    answer: [
      'Start with the diagnosis: what specific gap (technical depth, scope of ownership, communication, confidence) was between this engineer and the next level, identified through concrete observation, not a vague sense that "they were ready."',
      'Describe the concrete mechanism you used: a stretch project scoped to expose the gap safely, structured feedback on a regular cadence, or pairing them with the right kind of visibility (presenting their own work to a wider group) — generic but specific enough to show real method.',
      'Be honest about your own role versus theirs: staff-level mentoring is about creating the conditions and removing the obstacles, not doing the work for them — name one moment you deliberately stepped back so they could own the outcome.',
      'Close with the evidence of the outcome: what changed that was visible to others (a promotion, a new level of ownership, feedback from peers), not just your own assessment.',
    ],
    keyPoints: [
      'Concrete diagnosis of the specific gap, not a vague readiness feeling',
      'Names a specific mentoring mechanism used',
      'Distinguishes creating conditions from doing the work for them',
      'Closes with externally visible evidence of the outcome',
    ],
    followUps: ['What was the hardest part of that mentoring relationship?', 'How do you calibrate how much to step back versus stay involved?'],
  },
  {
    id: 'hm-033',
    round: 'hm',
    category: 'Leadership & influence',
    question: 'Tell me about handling an underperformer on your team when you were not their manager.',
    answer: [
      'Be precise about your actual role and boundaries: as a non-manager, your lever is different from a manager\'s — you can give direct, specific technical feedback and offer support, but performance management itself belongs to their manager, and a good staff engineer respects that line.',
      'Describe how you approached the person directly first: specific, observable feedback on the work (not the person), delivered privately and early rather than letting frustration build or going straight to their manager without a direct conversation first.',
      'Cover how and when you involved the manager: what you shared, what you kept to direct observation versus speculation, and how you avoided undermining the person by going around them unnecessarily.',
      'Close honestly on the outcome, including if it did not fully resolve — a staff-level answer acknowledges that not every underperformance situation resolves cleanly, and that is a realistic, credible note to end on.',
    ],
    keyPoints: [
      'Clearly distinguishes a peer\'s lever (direct feedback) from a manager\'s (performance management)',
      'Direct, specific, private feedback attempted before escalating',
      'Describes a considered, non-undermining way of involving the manager',
      'Honest about outcomes, including partial or unresolved ones',
    ],
    followUps: ['How did the person respond to your direct feedback?', 'What would have made you escalate sooner?'],
  },
  {
    id: 'hm-034',
    round: 'hm',
    category: 'Leadership & influence',
    question: 'Tell me about driving an initiative across multiple teams.',
    answer: [
      'Frame the initiative by its cross-team nature specifically: why it required more than one team\'s buy-in (a shared platform capability, a standard adopted org-wide, a migration touching several codebases), since that is the staff-scope signal the question is probing for.',
      'Describe the mechanics of alignment: how you got each team\'s priorities and constraints understood before proposing a plan, and how you sequenced the rollout to respect each team\'s own roadmap rather than assuming they would drop everything for your initiative.',
      'Name a real obstacle honestly: a team that pushed back, a timeline that slipped, or a technical assumption that turned out wrong mid-rollout — and how you adapted, since a frictionless retelling is less credible than one with a real recovery.',
      'Close with the durable outcome: what is still true today because of the initiative, and how you made it sustainable (documentation, ownership handoff) rather than dependent on you personally continuing to push it.',
    ],
    keyPoints: [
      'Clearly states why the initiative genuinely required multiple teams',
      'Describes concrete alignment mechanics respecting each team\'s constraints',
      'Names a real obstacle and adaptation, not a frictionless story',
      'Closes with a durable, self-sustaining outcome, not personal dependency',
    ],
    followUps: ['Which team was hardest to bring on board, and why?', 'How did you keep the initiative from stalling once the initial excitement faded?'],
  },
  {
    id: 'hm-035',
    round: 'hm',
    category: 'Leadership & influence',
    question: 'Tell me about a time you said no to a product request, and how.',
    answer: [
      'Be precise about the reason for the no: a technical cost that was not visible to the requester (e.g. [a hidden scaling or maintenance cost]), a conflict with a higher-priority commitment, or a risk that was not being weighed in the ask — name which one, since a vague "it was too complex" is not a real answer.',
      'Describe how you delivered the no constructively: leading with the shared goal, laying out the trade-off in terms the requester cares about, and — critically — offering an alternative path (a smaller version, a different sequencing, a way to get partial value sooner) rather than a flat refusal.',
      'Address the relationship outcome honestly: whether the requester was satisfied, pushed back further, or needed the decision escalated, and how you kept the relationship constructive either way.',
      'Close with why this matters at staff level: saying no well, with a clear trade-off and an alternative, is often more valuable to the business than saying yes to everything and quietly under-delivering.',
    ],
    keyPoints: [
      'Names the actual specific reason for the no, not a vague complexity claim',
      'Describes a constructive delivery: shared goal framing plus an alternative offered',
      'Honest about the relationship outcome, not just the technical decision',
      'Connects the story to why disciplined "no" is a staff-level skill',
    ],
    followUps: ['What would you have done if the requester escalated over your head?', 'How do you decide when a no needs to go to a wider group instead of staying one-on-one?'],
  },
  {
    id: 'hm-036',
    round: 'hm',
    category: 'Leadership & influence',
    question: 'Tell me about a failure you own, and what changed because of it.',
    answer: [
      'Choose a real failure with real consequences, not a disguised humble-brag — the interviewer can tell the difference immediately, and a safe non-answer here actively hurts you at staff level.',
      'Own it plainly: state what you specifically got wrong (a technical assumption, a missed risk, a decision made without enough input) without diluting it with excessive blame on circumstances or other people.',
      'Describe the concrete consequence and how you handled it in the moment: what you did to contain or fix the impact, and how you communicated it to people who were affected, since how you handle the aftermath is as telling as the mistake itself.',
      'Close with a specific, durable change to how you work now as a result — a checklist you adopted, a step you now never skip, a question you now always ask — so the story demonstrates growth, not just regret.',
    ],
    keyPoints: [
      'A genuine failure, not a disguised strength dressed as a weakness',
      'Plain ownership without excessive external blame',
      'Concrete consequence and honest account of the immediate handling',
      'A specific, lasting change in practice that resulted from it',
    ],
    followUps: ['How did the people affected react?', 'How did you make sure the lesson stuck for the team, not just for you?'],
  },

  // Delivery & process (6)
  {
    id: 'hm-037',
    round: 'hm',
    category: 'Delivery & process',
    question: 'How do you design feature flags and progressive delivery, and what are the pitfalls?',
    answer: [
      'Cover the core design: a flag system that supports at least percentage-based rollout, user/segment targeting, and a fast kill switch, with flag state resolved close to the request so a rollback is near-instant rather than requiring a redeploy, and a predefined safe default per flag for when the flag service is unreachable.',
      'Name the real pitfalls directly: flag debt (flags left in code long after the decision is made, quietly increasing complexity and testing surface), flag interaction bugs (two flags combined in a state nobody tested), and flags used as a substitute for actually finishing a feature before shipping it dark.',
      'Address process discipline: every flag needs an owner and an expected removal date at creation time, and a periodic audit to actually remove stale flags, since flags without a lifecycle plan accumulate indefinitely.',
    ],
    keyPoints: [
      'Covers percentage rollout, targeting, a fast kill switch, and a safe default per flag',
      'Names flag debt and flag-interaction bugs as concrete pitfalls',
      'Requires an owner and removal date per flag from creation',
    ],
    followUps: ['How do you test a combination of flags before rollout?', 'How do you decide the rollout percentage steps?'],
  },
  {
    id: 'hm-038',
    round: 'hm',
    category: 'Delivery & process',
    question: 'How do you write and use ADRs?',
    answer: [
      'Keep the structure lightweight and consistent: context (the problem and constraints), the decision itself stated plainly, the alternatives genuinely considered with why they were rejected, and the consequences — including the ones you are accepting as trade-offs, not just the upside.',
      'Write it for the future reader, not the current room: someone joining [a year later] should understand why the decision was made without needing to ask the original authors, which means naming constraints that were true then even if they have since changed.',
      'Use them at the right altitude: an ADR is for decisions with real, hard-to-reverse consequences (an architectural direction, a cross-team standard), not for every implementation choice — over-using them creates noise that buries the ones that matter.',
      'Treat them as living but immutable records: if a decision is reversed later, write a new ADR that supersedes the old one rather than editing history, so the record of reasoning at each point in time stays intact.',
    ],
    keyPoints: [
      'Uses a consistent, lightweight structure including rejected alternatives',
      'Writes for a future reader who lacks current context',
      'Reserves ADRs for genuinely hard-to-reverse decisions',
      'Supersedes rather than edits when a decision is later reversed',
    ],
    followUps: ['Walk me through the shape of the last ADR you wrote.', 'How do you decide if something is ADR-worthy versus just a normal PR decision?'],
  },
  {
    id: 'hm-039',
    round: 'hm',
    category: 'Delivery & process',
    question: 'Tell me about an incident you led or were part of, and your RCA process.',
    answer: [
      'Separate the timeline clearly into phases: detection (how it was noticed — monitoring, a user report), mitigation (the fastest safe way to reduce user impact, not necessarily the permanent fix), and root cause investigation (done after the immediate fire is out, not rushed under pressure).',
      'Describe the RCA method concretely: tracing back through the actual sequence of events to the true root cause rather than stopping at the first proximate cause, and distinguishing what caused the issue from what allowed it to reach production undetected (often two different, both important, findings).',
      'Keep the RCA blameless in substance, not just in name: focus on what in the system or process allowed the failure, and state the concrete follow-up actions with owners and dates, not just a narrative of what happened.',
      'Close with what changed afterward that you can point to concretely — a new alert, a new check in CI, a changed rollout process — since an RCA without a durable change is just a postmortem story.',
    ],
    keyPoints: [
      'Clear phase separation: detection, mitigation, root cause investigation',
      'Distinguishes root cause from what allowed it to reach production',
      'Genuinely blameless RCA with concrete owned follow-up actions',
      'Names an actual durable change that resulted from it',
    ],
    followUps: ['What was the hardest part of the mitigation?', 'How do you make sure follow-up actions actually get done after the incident fades from memory?'],
  },
  {
    id: 'hm-040',
    round: 'hm',
    category: 'Delivery & process',
    question: 'How do you estimate and sequence a risky migration?',
    answer: [
      'Start by surfacing the actual risk sources before estimating anything: what could go wrong, what is genuinely unknown versus just unfamiliar, and which parts of the migration are mechanical versus which require real design decisions.',
      'Estimate in ranges tied to confidence, not single numbers: state clearly which parts of the estimate are well-understood versus [genuinely uncertain and dependent on what a pilot reveals], since presenting a risky migration as a precise point estimate sets up a credibility problem later.',
      'Sequence from lowest-risk, highest-learning first: a pilot on a small but representative slice before committing to a full timeline, so the plan for the rest is built on real data rather than assumption.',
      'Build in explicit checkpoints where the plan can be revised: a risky migration should have decision points where new information (from the pilot, from an early batch) can change the sequencing or timeline, rather than one fixed plan set at the start and never revisited.',
    ],
    keyPoints: [
      'Surfaces real risk and unknowns before producing any estimate',
      'Gives ranged estimates tied to confidence, not false-precision numbers',
      'Sequences a small representative pilot before full commitment',
      'Builds in explicit checkpoints to revise the plan as new data arrives',
    ],
    followUps: ['How would you communicate a wide estimate range to a stakeholder who wants a firm date?', 'What would make you stop a migration partway through?'],
  },
  {
    id: 'hm-041',
    round: 'hm',
    category: 'Delivery & process',
    question: 'How do you balance tech debt against the roadmap?',
    answer: [
      'Reject the false framing that it is a binary choice: most tech debt work should be sized and folded into regular delivery (a slightly larger estimate that includes cleanup) rather than treated as a separate bucket that competes head-to-head with features for approval.',
      'For debt that genuinely needs dedicated time, make the cost of not doing it concrete and visible to stakeholders: translate it into terms they care about — slower future delivery, a specific reliability risk, a rising incident rate — rather than an abstract appeal to code quality.',
      'Prioritize debt the same way you prioritize features: by impact and cost, not by how long something has been annoying you, and be willing to explicitly defer debt that is real but low-impact.',
      'Protect a standing allocation if the team\'s trust in "we will get to it later" has already been broken — a fixed percentage of capacity reserved for debt is a pragmatic fallback when informal prioritization has failed to actually happen in practice.',
    ],
    keyPoints: [
      'Rejects debt-vs-features as a false binary; most debt folds into normal delivery',
      'Translates dedicated debt work into stakeholder-relevant impact, not abstract quality',
      'Prioritizes debt by impact and cost like any other work item',
      'Names a standing capacity allocation as a pragmatic fallback where trust is broken',
    ],
    followUps: ['How would you make the case for a piece of debt that has no visible user impact yet?', 'What would make you push back on a stakeholder who wants to defer debt work indefinitely?'],
  },
  {
    id: 'hm-042',
    round: 'hm',
    category: 'Delivery & process',
    question: 'How do you improve code review culture on a team?',
    answer: [
      'Start with what "good" looks like explicitly: review for correctness and design first, and treat style nitpicks as something a linter/formatter should catch automatically so humans stop spending review time on formatting debates.',
      'Address turnaround time directly, since a slow review culture is often more damaging to delivery than a lenient one — set a norm (e.g. [same-day first response]) and model it yourself, since culture here is set by behavior more than by policy.',
      'Coach the tone explicitly: reviews should challenge the code, not the person, and a senior reviewer\'s job includes teaching in the comment, not just flagging the issue — a "why" alongside every "what" turns review into mentoring.',
      'Measure it lightly, not bureaucratically: track something simple like review turnaround time or the rate of large, hard-to-review PRs, and use that signal to prompt a conversation, not to create a new compliance metric people optimize around.',
      'In Germany, where a works council exists, tooling that tracks per-person metrics (individual review turnaround, PR counts) falls under its co-determination right on systems suitable for monitoring employees (§87(1) Nr. 6 BetrVG) — the test is objective suitability, not intent, so team-level aggregates reduce but do not automatically remove the question on a small team; anything reported per individual goes through Betriebsrat agreement first, and GDPR/§26 BDSG data-minimization applies either way.',
    ],
    keyPoints: [
      'Automates style so humans focus review time on correctness and design',
      'Sets and models an explicit turnaround-time norm',
      'Coaches tone toward teaching, challenging the code not the person',
      'Uses light, conversation-prompting metrics rather than heavy compliance tracking',
      'Flags the Betriebsrat/§87(1) Nr. 6 BetrVG angle on any per-individual metric, hedged on whether a works council exists',
    ],
    followUps: ['How would you handle a reviewer whose comments are consistently harsh in tone?', 'What would you do about a team that routinely submits huge, hard-to-review PRs?'],
  },

  // From your CV (8)
  {
    id: 'hm-043',
    round: 'hm',
    category: 'From your CV',
    question: 'Walk me through a major React version migration across multiple apps: how you sequenced it, what broke, what you would do differently.',
    answer: [
      'Structure the walkthrough as a phased plan rather than a single leap: [a dependency and usage audit across all the affected apps first] to find which ones used APIs affected by the changes (rendering behavior, StrictMode double-invocation, any concurrent-feature-adjacent code), then a deliberately chosen pilot app to build the actual playbook before touching the rest.',
      'Cover sequencing logic explicitly: which app went first and why (lowest risk, still representative), how the remaining apps were batched (by risk, by team availability, by shared dependency), and what the rollback trigger was for each batch if something broke post-deploy.',
      'For "what broke," describe the shape of the breakage generically rather than inventing specifics: [a subtle rendering behavior change surfacing a latent bug that had been masked before], or a third-party library not yet compatible with the new version, and how you triaged whether to fix, patch around, or delay that app.',
      'Close with a genuine "what I would do differently": something concrete and non-defensive, like starting the dependency audit earlier, or investing in a shared upgrade checklist before app one instead of discovering the checklist as you went.',
    ],
    keyPoints: [
      'Presents a clear phased plan: audit, pilot, playbook, batched rollout',
      'Explicit sequencing logic and a stated rollback trigger per batch',
      'Describes the shape of real breakage without inventing specifics',
      'Ends with a genuine, concrete lesson learned, not a rehearsed non-answer',
    ],
    followUps: ['Which React-specific behavior change caused the most breakage, and why did the audit miss it?', 'How did you validate each app was stable before moving to the next batch?'],
  },
  {
    id: 'hm-044',
    round: 'hm',
    category: 'From your CV',
    question: 'You significantly cut down a security vulnerability backlog: how did you triage, what did you deliberately leave?',
    answer: [
      'Start with the triage framework, not a number: [severity] combined with [actual exploitability in this codebase\'s context] combined with [whether a fix path exists without a breaking change], since raw CVE severity alone is a poor proxy for real risk.',
      'Describe the sequencing: highest severity plus highest exploitability first, then anything with a low-cost automated fix (a dependency bump with no breaking API change) regardless of severity, since those are cheap wins that compound quickly.',
      'Be direct and honest about what you deliberately left: [vulnerabilities in dependencies with no available fix yet, or ones requiring a breaking change that needed its own separate migration plan] — and explain the compensating control you put in place for those (isolation, monitoring, a tracked follow-up item) rather than implying everything was resolved.',
      'Close with the process change, if any, that came out of it: e.g. a recurring scan integrated into CI so the count does not silently creep back up after the initial push.',
    ],
    keyPoints: [
      'States a real triage framework (severity, exploitability, fix cost), not just "we fixed the important ones"',
      'Explains sequencing logic including cheap high-value fixes',
      'Honest about what was deliberately left and what compensating control covers it',
      'Names a lasting process change, e.g. continuous scanning in CI',
    ],
    followUps: ['How did you validate a fix did not break existing functionality?', 'How do you keep the count from creeping back up over time?'],
  },
  {
    id: 'hm-045',
    round: 'hm',
    category: 'From your CV',
    question: 'Explain the feature-flag infrastructure you built and how the automatic fallback worked.',
    answer: [
      'Describe the core architecture generically: [a flag evaluation layer resolving flag state per request/session, backed by a configuration store, with a local cache so flag state does not require a network round trip on every check].',
      'Focus specifically on the fallback mechanism, since that is the crux of the question: what happened if the flag service or config store was unreachable — a predefined safe default value baked in per flag (not a blanket "assume false" or "assume true"), so the app degrades to a known-good, previously-tested state rather than an undefined one.',
      'Cover how you decided each flag\'s safe default: generally the more conservative behavior (the previously shipped, proven path) unless the flag specifically existed to guard a rollback, in which case the safe default was the rolled-back state.',
      'Close with how you validated the fallback actually worked: [a deliberate test simulating the config store being unreachable] before trusting it in production, since an untested fallback path is often the exact place a real incident later reveals a gap.',
    ],
    keyPoints: [
      'Describes flag evaluation architecture clearly: store, cache, resolution layer',
      'Focuses concretely on the fallback mechanism and per-flag safe defaults',
      'Explains the reasoning for choosing each default conservatively',
      'Names an explicit test that validated the fallback path before trusting it',
    ],
    followUps: ['How did you decide which flags needed which fallback default?', 'What would you change about that infrastructure with more time?'],
  },
  {
    id: 'hm-046',
    round: 'hm',
    category: 'From your CV',
    question: 'You wrote an ADR to consolidate dozens of divergent data-grid implementations onto one: how did you phase it and what were the rollback triggers?',
    answer: [
      'Start with why the ADR was needed: [a large number of instances built from divergent implementations of essentially the same UI pattern] representing a large, distributed maintenance and inconsistency cost, and the decision being consolidation onto one shared, configurable grid implementation.',
      'Describe the phasing generically but concretely: an audit categorizing the existing grids by how closely their behavior matched the new shared implementation (straightforward swaps versus ones needing custom behavior preserved), then migrating the straightforward category first in batches, saving the hardest edge cases for last once the shared implementation had matured.',
      'Name the rollback triggers explicitly, since that is what distinguishes a real migration plan from a hopeful one: [a defined regression rate or user-reported functional gap threshold per batch] that would pause further migration and force either a fix to the shared implementation or reverting that specific grid instance.',
      'Close with what made this hard in practice: reconciling genuinely different feature needs across that many usages without the shared implementation collapsing into an unmanageable pile of configuration flags, and how you drew that line.',
    ],
    keyPoints: [
      'States clearly why consolidation was the right call at that scale',
      'Describes a concrete phasing logic: audit, easy batch first, hard cases last',
      'Names explicit, measurable rollback triggers per batch',
      'Addresses the real difficulty of reconciling diverse needs without config bloat',
    ],
    followUps: ['How did you avoid the shared implementation becoming an unmanageable pile of flags?', 'What was the hardest single grid to migrate, generically speaking?'],
  },
  {
    id: 'hm-047',
    round: 'hm',
    category: 'From your CV',
    question: 'You introduced visual regression testing: what did it catch, what did it cost?',
    answer: [
      'Describe the scope decision first: [which surfaces you chose to cover, likely a shared component library or a set of pixel-sensitive critical screens] rather than the whole product, and why that scope was the right cost/value trade-off at the time.',
      'For what it caught, describe the category of bug generically rather than a specific incident: [a shared token or base style change unintentionally affecting a component nobody was actively watching], the kind of regression that a purely functional test suite structurally cannot detect.',
      'Close with whether the cost/benefit held up in practice: the baseline-maintenance and false-positive costs are known going in, so the interesting answer is whether they landed where you expected, and whether you would scope it the same way again or narrow/widen the coverage given what you learned.',
    ],
    keyPoints: [
      'States a deliberate scope decision, not blanket coverage',
      'Describes the category of bug caught without inventing a specific incident',
      'Gives an honest retrospective view on whether the cost landed as expected and the scope was right',
    ],
    followUps: ['How did you handle the false-positive rate in practice?', 'Would you expand or narrow the coverage today?'],
  },
  {
    id: 'hm-048',
    round: 'hm',
    category: 'From your CV',
    question: 'Tell me about a code-review nudge bot you built: what problem, what metric, did behavior change?',
    answer: [
      'State the problem plainly and generically: [reviews sitting unclaimed too long, or reviewers missing that a PR was waiting on them] — a visibility/nudging problem, not a code-quality problem, which shapes what kind of tool actually solves it.',
      'Describe the mechanism at a conceptual level: [surfacing outstanding review requests into the channel where the team already looks, on a cadence or trigger designed to prompt action without becoming noise that gets muted].',
      'Name the metric you tracked to know if it worked: [review turnaround time, or the age of the oldest open PR], and be candid about the honest form of the answer — behavior change from a nudging tool is usually partial and fades without reinforcement, not a permanent fix on its own.',
      'Close with the actual lesson: a bot addresses the visibility symptom, but a lasting fix usually still needs a team norm (an agreed turnaround expectation) behind it, and the tool\'s real value is making that norm easier to keep.',
      'For a German company with a works council, name the compliance step up front: a bot naming individuals and their turnaround times is a system suitable for monitoring employees under §87(1) Nr. 6 BetrVG, so it needs Betriebsrat agreement before shipping or should report team-level numbers only; without a works council the constraint is still GDPR and §26 BDSG on employee data.',
    ],
    keyPoints: [
      'States the actual visibility/nudging problem, not a vague code-quality claim',
      'Describes the mechanism conceptually without inventing implementation specifics',
      'Names a concrete metric it was judged against',
      'Honest that a nudge tool needs a team norm behind it to hold long-term',
      'Names the Betriebsrat/§87(1) Nr. 6 BetrVG step (or BDSG fallback) before naming individuals',
    ],
    followUps: ['What would you do if the team started ignoring the bot\'s messages?', 'How would you measure whether it actually improved turnaround time?'],
  },
  {
    id: 'hm-049',
    round: 'hm',
    category: 'From your CV',
    question: 'You built a micro-frontend with Module Federation: what did it decouple, what did it couple?',
    answer: [
      'Name what it decoupled clearly: [deploy cadence and release ownership for that specific surface from the rest of the host application], letting one team ship independently without waiting on the host\'s release train — the actual organizational win.',
      'Be equally direct about what it coupled, since that is the more interesting and more staff-level part of the question: a shared runtime dependency contract (framework version, design system version) between host and remote that both sides now must honor, and a build-time or runtime compatibility check that did not exist before.',
      'Describe a concrete tension this created generically: [the remote wanting to upgrade a shared dependency ahead of the host, or vice versa], and how you resolved or mitigated it — a versioning policy, a compatibility test, or a negotiated upgrade cadence between the teams.',
      'Close with an honest assessment: whether the decoupling benefit was worth the new coupling cost in this case, since that trade-off, not the technology itself, is what a staff engineer should be able to weigh clearly in hindsight.',
    ],
    keyPoints: [
      'Names the concrete organizational decoupling win (independent deploy)',
      'Equally names the new coupling introduced (shared runtime contract)',
      'Describes a real tension and how it was mitigated',
      'Gives an honest, weighed retrospective on whether the trade-off was worth it',
    ],
    followUps: ['How did you handle a shared dependency version mismatch between host and remote?', 'Would you make the same call again given what you learned?'],
  },
  {
    id: 'hm-050',
    round: 'hm',
    category: 'From your CV',
    question: 'You built a document-generation feature where an output error carried real contractual or compliance consequences: how did you make sure a data error could not slip through?',
    answer: [
      'Start with why this is different from ordinary feature work: the output is a document with real legal effect, so a data error is not just a bug, it is a correctness-critical failure with consequences outside the software itself — that framing should drive every choice described next.',
      'Describe the layered defense generically: [validation at data entry, a second independent validation pass immediately before document generation using the same rules expressed separately so a single bug cannot pass both], and a mandatory human review step for the fields that carry the most legal weight before the document is finalized.',
      'Cover traceability: every generated document should be tied to an auditable snapshot of the exact data used to produce it, so any later dispute or correction can be traced back to precisely what was known and used at generation time, not reconstructed from memory.',
      'Close with the testing posture this demanded: [a comprehensive set of edge-case and boundary tests around the data rules themselves], since this is a domain where a missed edge case has real consequences beyond a support ticket.',
    ],
    keyPoints: [
      'Frames the stakes correctly: legal effect, not an ordinary feature bug',
      'Describes layered, independent validation rather than a single check',
      'Names traceability/auditable snapshot of data used per document',
      'Ties the testing posture explicitly to the elevated stakes of the domain',
    ],
    followUps: ['What would you do if a data error was discovered after documents had already been issued?', 'How did you decide which fields needed mandatory human review?'],
  },

  // Live code review (8)
  {
    id: 'hm-051',
    round: 'hm',
    category: 'Live code review',
    question: 'The interviewer shares this markup and asks you to review it out loud. What do you say?',
    code: `<div class="card">
  <div class="title">Invite a teammate</div>
  <form>
    <div class="field">
      <span>Email</span>
      <input type="text" class="input" />
    </div>
    <div class="btn" onclick="submitInvite()">Send invite</div>
  </form>
  <div class="error" style="display:none">Something went wrong</div>
</div>`,
    answer: [
      'Lead with the one that is a functional bug, not a style opinion: the submit control is a div, so it is not reachable by keyboard, not in the tab order, does not fire on Enter or Space, and is not announced as a button. That is not an accessibility nicety, it is a control that a portion of users cannot operate at all. Replace it with a button element and the browser gives you focus, keyboard, and role for free.',
      'Then the input, which has two separate problems worth separating out loud: the visible text is a span rather than a label with a for attribute, so there is no programmatic association and clicking the text does not focus the field, and type is text rather than email, which loses the mobile keyboard and the built-in validation hint. Neither is expensive to fix, which is worth saying, because a reviewer who only lists problems reads as harsher than one who notes the fix is one attribute.',
      'Raise the error region as a third, subtler point: an element toggled from display:none announces nothing to a screen reader when it appears. It needs a live region so the failure is perceivable rather than merely visible, and it should be associated with the field it describes when the error is field-specific.',
      'Close on structure and on the inline handler, both as non-blocking. The title is a styled div where a heading element would put this card in the document outline, and the inline onclick couples markup to a global function name, which is a maintainability point rather than a correctness one. Say explicitly which of these you would block on and which you would leave as a comment, because in a live review the interviewer is listening for your threshold as much as your list.',
    ],
    keyPoints: [
      'Leads with the div-as-button as a functional defect, not a style preference',
      'Separates the missing label association from the wrong input type',
      'Notes that a display:none error is invisible to assistive technology',
      'States explicitly which findings block and which are comments',
    ],
    followUps: ['Which of those would you fix before merge and which would you file?', 'How would you verify the fix rather than assuming it works?'],
  },
  {
    id: 'hm-052',
    round: 'hm',
    category: 'Live code review',
    question: 'The active link colour is not applying and someone has reached for !important. Review this CSS.',
    code: `#app .sidebar ul li a.nav-link { color: #333; }

.nav-link { color: #0066cc; }

.nav-link.is-active { color: #003366 !important; }

a:hover { color: blue; }`,
    answer: [
      'Diagnose before prescribing: the first rule carries an ID plus a chain of descendants, so it outweighs both of the class-only rules regardless of source order. The author saw a rule that would not apply, reached for !important to win, and the !important worked, which is exactly why the underlying problem is still there and will recur on the next colour.',
      'Name the actual fix rather than the symptom: flatten the first selector to the class it is really targeting. Specificity is not a scoring game to win, it is a signal of how tightly a rule is bound to a place in the DOM, and a five-part selector claims that a link only looks like this inside that exact structure, which is almost never what anyone meant. Once it is flat, source order decides and !important is unnecessary.',
      'Flag the hover rule as its own defect: a bare element selector styles every link on the page, so it leaks well beyond the sidebar, and more importantly there is no focus-visible style anywhere in this block. A keyboard user gets no indication of where they are. That is the finding I would raise loudest, because it is invisible to anyone testing with a mouse.',
      'Leave the smaller points as comments so the review does not read as a pile-on: raw hex values rather than the design tokens the codebase presumably has, and if the project uses cascade layers, this whole class of conflict has a structural answer rather than a per-rule one. Both are worth saying once, not worth blocking on.',
    ],
    keyPoints: [
      'Explains why the ID chain wins rather than only noting the !important',
      'Prescribes flattening the selector, not raising specificity elsewhere',
      'Catches the missing focus-visible style, not just the over-broad hover',
      'Separates the structural fix from the token and layers comments',
    ],
    followUps: ['When is !important legitimate?', 'How would you stop this recurring across the codebase?'],
  },
  {
    id: 'hm-053',
    round: 'hm',
    category: 'Live code review',
    question: 'What concerns you about this layout CSS?',
    code: `.header { height: 64px; }

.content {
  margin-top: 64px;
  height: calc(100vh - 64px);
  overflow: auto;
}

.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  margin-left: -200px;
  width: 400px;
  z-index: 9999;
}`,
    answer: [
      'Start with the coupling, since it is the finding with the longest tail: 64px appears three times and each occurrence must change together. A custom property makes the relationship explicit and the next header redesign a one-line change instead of a grep. This is the kind of comment worth making concrete, because "use a variable" sounds pedantic until you point at the three places that silently drift apart.',
      'Raise 100vh as a correctness issue on mobile rather than a preference: vh does not account for the collapsing browser chrome, so the content area is taller than the visible viewport and the bottom is cut off exactly where the important controls usually are. The dynamic viewport units exist for this, and it is worth asking whether this needs a fixed height at all.',
      'On the modal, the negative margin centring is a technique that only works because the width is hardcoded, and the hardcoded width is itself the problem on a narrow screen. A transform-based or grid-based centre removes the coupling and works at any width, and a max-width with a percentage keeps it on screen at 320px. Two findings, one fix, worth saying in that order so the interviewer hears the reasoning rather than the recipe.',
      'Treat the z-index as the smallest but most diagnostic point: 9999 means there is no layering scale, only an escalation, and the next overlay will be 10000. Ask whether the project has a token scale for stacking, and mention that z-index only orders siblings within a stacking context, so this number may not even be doing what the author believes.',
    ],
    keyPoints: [
      'Names the repeated magic number as a coupling problem with a concrete fix',
      'Treats 100vh as a real mobile defect rather than a nit',
      'Ties the negative-margin centring to the hardcoded width as one issue',
      'Points at the missing z-index scale and how stacking contexts limit it',
    ],
    followUps: ['How would you introduce a layering scale to an existing codebase?', 'When is a fixed pixel height genuinely the right call?'],
  },
  {
    id: 'hm-054',
    round: 'hm',
    category: 'Live code review',
    question: 'Clicking any row opens the wrong detail panel. Review this and explain why.',
    code: `function attachRowHandlers(rows) {
  for (var i = 0; i < rows.length; i++) {
    document.querySelectorAll('.row')[i]
      .addEventListener('click', function () {
        showDetail(rows[i].id);
      });
  }
}`,
    answer: [
      'Give the diagnosis precisely, because a vague answer here reads as pattern-matching: var is function-scoped, so every handler closes over the same binding, and by the time any click fires the loop has finished and i equals rows.length. Every handler reads one past the end and throws or passes undefined. The one-character fix is let, which gives a fresh binding per iteration.',
      'Then say what you would actually write instead, since the minimal fix is not the review outcome you want: one delegated listener on the container reads the id from a data attribute on the clicked row. That removes the per-row listener cost, survives rows being added or removed without reattaching anything, and drops the querySelectorAll from inside the loop, which is re-querying the whole document on every iteration.',
      'Raise the leak as a separate finding: nothing here removes listeners, so if this function runs again after a re-render you accumulate handlers on elements that may already be detached. Delegation solves this too, which is worth pointing out explicitly so the suggestion lands as one change fixing three problems rather than three suggestions.',
      'Close on the structural smell underneath all of it: the code assumes the DOM order of .row matches the order of the rows array. That coupling is invisible, unenforced, and will break the first time anything filters or sorts one and not the other. Reading the id from the element rather than the index removes the assumption entirely.',
    ],
    keyPoints: [
      'Explains the var closure capture precisely rather than gesturing at it',
      'Proposes delegation as the real fix, not just swapping var for let',
      'Identifies the listener leak on re-render as a separate problem',
      'Names the hidden coupling between DOM order and array index',
    ],
    followUps: ['How would you test that the handler passes the right id?', 'When is a per-element listener still the right choice over delegation?'],
  },
  {
    id: 'hm-055',
    round: 'hm',
    category: 'Live code review',
    question: 'This logs "all saved" before anything is saved. What is wrong, and what would you write instead?',
    code: `async function saveAll(items) {
  items.forEach(async (item) => {
    await save(item);
  });
  console.log('all saved');
}`,
    answer: [
      'State the mechanism, not the symptom: forEach ignores the return value of its callback, so the promise each async callback returns is dropped on the floor. The loop finishes synchronously after kicking off every save, the log runs immediately, and any rejection becomes an unhandled promise rejection with no path back to the caller. This is the most common async mistake in review and worth being able to explain in one sentence.',
      'Ask the question the code does not answer before choosing a fix, because it changes the answer: are these saves meant to run in parallel or in sequence? If order does not matter, Promise.all over a map is right and gives you concurrency. If they must be sequential, because they hit a rate limit or depend on each other, a for...of with await inside is right. Picking one without asking is how a reviewer introduces a different bug.',
      'Raise partial failure as its own finding, since it is the part that survives to production: with Promise.all the first rejection abandons the results of the rest, which for a save operation usually means you do not know what did and did not persist. If the caller needs to report which items failed, allSettled and an explicit summary is the honest shape.',
      'Close on the caller contract: this function is async but returns nothing and swallows every error, so no caller can tell success from failure. Whatever concurrency choice is made, the fix is not complete until the failure is either thrown or returned in a form the UI can act on.',
    ],
    keyPoints: [
      'Explains that forEach discards the callback promise, precisely',
      'Asks whether the intent is parallel or sequential before prescribing',
      'Raises partial-failure semantics rather than only fixing the await',
      'Notes that the function currently gives its caller no way to detect failure',
    ],
    followUps: ['How would you limit concurrency if save hits a rate limit?', 'What would the UI show while this is in flight?'],
  },
  {
    id: 'hm-056',
    round: 'hm',
    category: 'Live code review',
    question: 'This renders fine and passes review from three people. What would you block on?',
    code: `function renderComments(comments) {
  const list = document.getElementById('comments');
  list.innerHTML = comments
    .map((c) => '<li class="comment">' + c.author + ': ' + c.body + '</li>')
    .join('');
}`,
    answer: [
      'Block, and say why in one sentence before elaborating: comment bodies are user-controlled and they are being concatenated into innerHTML, which is a stored cross-site scripting vulnerability. Anything an attacker puts in a comment executes in every other viewer session with their credentials. This is the rare review finding that is worth stopping the merge for regardless of deadline.',
      'Give the fix at the right level, since "escape it" invites a hand-rolled escaper that will be wrong: build the elements and set textContent, so the browser never parses the value as markup and there is nothing to escape. If the framework in use renders text nodes by default, the correct fix is to stop bypassing it rather than to sanitise on the way in.',
      'Raise the second, quieter problem: replacing innerHTML wholesale destroys and recreates every node, which loses focus, text selection, and scroll position in the list. If a user is midway through selecting a comment when a new one arrives, it vanishes under them. That is a real bug that will be reported as flakiness and never reproduced.',
      'Say how you would phrase the block, because the interviewer is assessing the reviewer as much as the finding: name the class of vulnerability, show the shape of the fix, and offer to pair on it. A security block delivered as an accusation gets argued with, and the same block delivered as "this is XSS, here is the two-line fix, want me to push it" gets fixed in ten minutes.',
    ],
    keyPoints: [
      'Identifies stored XSS and treats it as a genuine blocker',
      'Prescribes textContent over a hand-written escaping function',
      'Separately catches the lost focus, selection and scroll from full re-render',
      'Frames the blocking comment so it lands as help rather than as an accusation',
    ],
    followUps: ['What if the product genuinely needs to render rich text in comments?', 'What check would stop this reaching review next time?'],
  },
  {
    id: 'hm-057',
    round: 'hm',
    category: 'Live code review',
    question: 'The cards overflow their container and the layout breaks between 768px and 900px. Review this.',
    code: `.card-grid {
  display: flex;
  flex-wrap: wrap;
}

.card {
  width: 33%;
  padding: 16px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .card { width: 100%; }
}`,
    answer: [
      'Diagnose the overflow first because it is the reported bug: without border-box sizing, the 16px of padding is added outside the 33% width, so three cards plus their padding exceed the row and one wraps. Whether the fix is a global border-box rule or a per-component one depends on what the codebase already does, which is worth asking rather than assuming.',
      'Then explain the reported breakpoint gap, since it is the more interesting finding: below 768px each card is full width and above it each is a third, so between roughly 768px and 900px you get three cramped columns with no rule covering that range. This is the structural weakness of hardcoded breakpoints, and it is why the answer is not to add a fourth media query.',
      'Offer the intrinsic layout as the real fix: a grid with repeat(auto-fill, minmax(<min>, 1fr)) and a gap lets the number of columns fall out of the available width, which deletes the media query entirely and behaves correctly at every width including ones nobody tested. Flex plus percentage widths plus a breakpoint is three mechanisms doing one job.',
      'Leave two smaller comments rather than expanding the review: 12px is below a comfortable reading size and, being in px, ignores a user who has raised their browser font size, so rem is the more respectful unit here. And max-width breakpoints run against a mobile-first codebase if the rest of the project uses min-width, which is a consistency point worth raising once.',
    ],
    keyPoints: [
      'Traces the overflow to box-sizing rather than guessing at the width',
      'Explains the uncovered range between the breakpoint and the layout intent',
      'Proposes an intrinsic grid that removes the media query rather than adding one',
      'Notes that px font sizes ignore the user browser font preference',
    ],
    followUps: ['How would you pick the minmax minimum?', 'What would you check before making border-box global in an existing codebase?'],
  },
  {
    id: 'hm-058',
    round: 'hm',
    category: 'Live code review',
    question: 'The interviewer shares one HTML and CSS file and says "review this". There is no ticket, no description, and they are watching. How do you run the first two minutes?',
    answer: [
      'Ask what it is for before reading a line, because a review without intent is only a style opinion. One question is enough: what is this screen, who uses it, and is it new code or something being changed. In a real review that context comes from the PR description, and saying that out loud tells the interviewer you know what you are missing rather than that you did not notice.',
      'Then read the whole thing once without commenting. Narrate that you are doing it and why, because two minutes of silence is uncomfortable for both of you and unexplained silence reads as being stuck. The purpose of the first pass is to find the shape and the risk, and commenting from the top down means you spend your best attention on whatever happened to be first in the file.',
      'Give your findings in risk order and say the order out loud: anything a user cannot do at all, then anything that is wrong but recoverable, then maintainability, then preference. In HTML and CSS specifically the first bucket is almost always keyboard operability, form semantics, and anything that only works at the width the author had open, so those are where to look first rather than at naming and formatting.',
      'End the pass by saying what you would not comment on, which is the part most candidates skip. Naming, ordering of properties, and anything a formatter or linter owns are not worth a human review comment, and saying that explicitly signals that you understand review as a scarce resource rather than as a completeness exercise.',
    ],
    keyPoints: [
      'Asks for the intent of the code before reviewing it',
      'Reads once end to end and narrates that pass rather than going top-down',
      'Delivers findings in explicit risk order, not file order',
      'States what is deliberately not worth commenting on',
    ],
    followUps: ['How does this change if it is a 900-line file rather than a small one?', 'What do you do if you find nothing significant?'],
  },

  // Web fundamentals (8)
  {
    id: 'hm-059',
    round: 'hm',
    category: 'Web fundamentals',
    question: 'Walk me through what the browser does between a user click and the next frame on screen, and where your JavaScript sits in that.',
    answer: [
      'Lay out the loop in order rather than listing concepts: the click is dispatched as a task, your handler runs to completion, then the microtask queue drains fully, then the browser may run requestAnimationFrame callbacks, then style, layout, paint and composite produce the frame. Everything you do in the handler happens before any pixel moves, which is the point of the question.',
      'Draw the distinction that most answers blur: promise callbacks and queueMicrotask go on the microtask queue and run before the next frame, while setTimeout schedules a new task that runs after it. So awaiting a resolved promise does not yield to rendering, and an unbounded chain of microtasks can starve the frame just as effectively as a long synchronous function.',
      'Make the practical consequence explicit, because that is what separates a staff answer from a textbook one: a handler that takes 200ms delays the frame by 200ms, and the user perceives it as the click not working rather than as a slow animation. The fixes follow directly from the model, which is to break the work into tasks, move it off the main thread, or do less of it.',
      'Close by naming where reads and writes fit: reading a layout property mid-handler forces the browser to compute layout early, so an alternating read-write loop over many elements forces it repeatedly. Batching reads and then writes is not a trick, it is a direct consequence of the sequence you have just described, and saying it that way shows the model is doing work rather than being recited.',
    ],
    keyPoints: [
      'Gives the ordered sequence: task, microtasks, rAF, style, layout, paint',
      'Distinguishes microtask from task with a consequence, not just a label',
      'Connects a long handler to perceived input delay rather than to slow animation',
      'Explains layout thrashing as a consequence of the model just described',
    ],
    followUps: ['Where would you move work that must not block the frame?', 'How would you find which handler is blocking in a real app?'],
  },
  {
    id: 'hm-060',
    round: 'hm',
    category: 'Web fundamentals',
    question: 'Two rules set the same property on the same element. How does the browser decide which one wins?',
    answer: [
      'Give the ordered algorithm rather than jumping straight to specificity, because specificity is only one step of it: origin and importance first, then cascade layers, then specificity, then source order. Most day-to-day conflicts are resolved by the last two, which is why they get remembered as the whole rule, but the ones that confuse people are always resolved higher up.',
      'Be precise about specificity itself: it is three counters, for IDs, for classes and attributes and pseudo-classes, and for element types and pseudo-elements, compared left to right. It is not a single number, so no quantity of classes ever outweighs one ID. Mention that :where takes zero specificity and :is takes that of its most specific argument, since that is the mechanism modern resets use to stay overridable.',
      'Separate inheritance from the cascade, because they are commonly conflated: the cascade decides between declarations that target the element, inheritance supplies a value when no declaration targets it at all. That is why setting a colour on a container reaches the text inside it but setting a border does not, and why a rule with a lower specificity can still be the one that applies.',
      'Close with the practical position: rather than winning specificity contests, keep selectors flat and let source order or cascade layers do the deciding. Say plainly that reaching for !important is almost always a signal that a selector elsewhere is more specific than the thing it targets deserves, and that the fix is upstream.',
    ],
    keyPoints: [
      'Gives the full order: origin and importance, layers, specificity, source order',
      'Describes specificity as three separate counters, not one number',
      'Distinguishes inheritance from the cascade with a concrete example',
      'Frames !important as a symptom of over-specific selectors',
    ],
    followUps: ['What problem do cascade layers actually solve?', 'How would you make a design system overridable by product code?'],
  },
  {
    id: 'hm-061',
    round: 'hm',
    category: 'Web fundamentals',
    question: 'An absolutely positioned element lands somewhere you did not expect, and raising its z-index does nothing. Explain what is going on.',
    answer: [
      'Answer the position half with the containing block: an absolutely positioned element is placed relative to its nearest ancestor that establishes a containing block, which is any ancestor with a position other than static, and also any ancestor with a transform, filter, will-change on those, or containment. That last group is what surprises people, because adding a transform for an animation silently reparents every absolutely positioned descendant.',
      'Answer the z-index half with stacking contexts: z-index only orders an element among its siblings inside the stacking context it belongs to. If an ancestor forms its own stacking context, the whole subtree is painted as one unit, so no value on a descendant can lift it above something outside. This is why a 9999 sometimes does nothing at all.',
      'Name what creates a stacking context, since the answer is only useful if you can find the culprit: a positioned element with a z-index other than auto, opacity below 1, transform, filter, mix-blend-mode, isolation, and a few others. Add how you would locate it in practice, by walking up the ancestors in devtools looking for the first one with any of those properties.',
      'Close with the structural fix rather than a bigger number: render overlays in a portal at the top level of the document so they are never trapped in a subtree, and keep a small named scale for the few layers that genuinely exist. That is the answer that shows you have debugged this before rather than read about it.',
    ],
    keyPoints: [
      'Explains the containing block including transform and filter, not just position',
      'States that z-index orders siblings within one stacking context',
      'Lists the common stacking context creators and how to find them in devtools',
      'Prescribes portals and a layer scale rather than escalating z-index',
    ],
    followUps: ['How do you keep a tooltip inside a scrolling container from being clipped?', 'What are the accessibility implications of portalling an overlay?'],
  },
  {
    id: 'hm-062',
    round: 'hm',
    category: 'Web fundamentals',
    question: 'What determines the value of this in a JavaScript function, and why do people get it wrong?',
    answer: [
      'Give the rule as a precedence order, since that is what makes it predictable: new binding first, then an explicit bind, call or apply, then the object the function was called as a method of, then the default, which is undefined in modules and strict mode. The key sentence is that it is decided by how the function is called, not where it was written, for every function except arrows.',
      'Explain arrows as the exception that makes the rest usable: an arrow has no binding of its own and closes over the enclosing scope, which is why they are correct by default in callbacks and why converting one to a regular function for the sake of a name can silently break it. Class fields assigned an arrow behave the same way, which is the pattern most codebases have settled on.',
      'Name the specific way people get it wrong, because the interviewer is checking for real experience: passing a method as a callback detaches it from its object, so the receiver is lost by the time it runs. That is the same underlying cause behind a handler that works when called directly and throws when passed to addEventListener or to a promise chain.',
      'Close with the honest position rather than an exhaustive taxonomy: in modern code this rarely comes up because arrows and modules make the common cases correct, and the remaining places it matters are event handlers, prototype-based library code, and anything that reassigns methods. Saying that is more credible than reciting all four rules with equal weight.',
    ],
    keyPoints: [
      'Gives the precedence order and states that the call site decides',
      'Explains arrows as lexical rather than as a style preference',
      'Names detaching a method as a callback as the common real failure',
      'Puts the rule in modern context instead of reciting it exhaustively',
    ],
    followUps: ['How would you fix a handler that loses its receiver?', 'Where do closures cause problems in a long-lived page?'],
  },
  {
    id: 'hm-063',
    round: 'hm',
    category: 'Web fundamentals',
    question: 'Why does it matter whether a control is a button element or a div with a click handler? Give me the full answer.',
    answer: [
      'List what the element gives you rather than appealing to correctness: a role and an accessible name in the accessibility tree, keyboard activation on Enter and Space, membership in the tab order, a focus ring, disabled semantics, and form submission behaviour. A div gets none of those, so recreating a button means writing all of them and keeping them working.',
      'Explain the accessibility tree as the mechanism, since that is the part that shows depth: assistive technology does not read your CSS, it reads a parallel tree the browser builds from the elements and attributes, where each node has a role, a name, and a state. Semantic elements populate that tree correctly for free, and ARIA is a way to patch it when no element fits, not a way to add behaviour.',
      'Make the practical point that the roles are not equivalent: a button submits or acts, a link navigates, and they respond to different keys, so swapping one for the other breaks user expectations even when both are styled identically. The same reasoning covers headings giving the page an outline that people navigate by, and lists communicating item counts.',
      'Close with the honest counterweight so it does not read as dogma: the reason people reach for a div is styling frustration, and modern CSS removes most of that, so the answer to "the button is hard to style" is a reset rather than a different element. If a genuinely novel control has no native equivalent, then you take on the full ARIA pattern deliberately and test it with a keyboard and a screen reader, rather than adding role="button" and calling it done.',
    ],
    keyPoints: [
      'Enumerates the concrete behaviours the native element provides',
      'Explains the accessibility tree as role, name and state',
      'Distinguishes button from link semantics rather than treating them as styling',
      'Acknowledges the styling motivation and answers it with a reset',
    ],
    followUps: ['What does it actually take to build an accessible custom dropdown?', 'How would you test this beyond an automated audit?'],
  },
  {
    id: 'hm-064',
    round: 'hm',
    category: 'Web fundamentals',
    question: 'Explain event propagation, and when you would use delegation.',
    answer: [
      'Describe all three phases, not two: an event travels from the document down to the target, which is capture, fires on the target, then travels back up, which is bubbling. Listeners default to the bubble phase, and passing capture true opts into the way down. Say that some events do not bubble, focus and blur being the common ones people trip on, with focusin and focusout as the bubbling counterparts.',
      'Define delegation in terms of that model: one listener on a common ancestor inspects event.target to work out which descendant was interacted with. The benefit is not primarily performance, it is that content added or removed later needs no listener bookkeeping, which is what makes it correct for lists that change.',
      'Be precise about stopping things, because this is where subtle bugs come from: preventDefault cancels the default action, stopPropagation halts the journey and therefore breaks any delegated listener above you, and stopImmediatePropagation also blocks other listeners on the same element. Calling stopPropagation defensively is a common cause of a feature two layers up mysteriously not firing.',
      'Close with the cases where delegation is the wrong tool: when you need the listener on a specific element for a non-bubbling event, when the handler must be removed independently, or when a framework already owns the binding and delegation would fight it. Add passive listeners for scroll and touch as a related point, since a non-passive listener there blocks scrolling until your handler returns.',
    ],
    keyPoints: [
      'Covers capture, target and bubble, and names events that do not bubble',
      'Justifies delegation by dynamic content rather than only by performance',
      'Distinguishes preventDefault, stopPropagation and stopImmediatePropagation',
      'Names cases where delegation is the wrong choice',
    ],
    followUps: ['How would delegation interact with a framework that already delegates?', 'What breaks if a third-party script calls stopPropagation above you?'],
  },
  {
    id: 'hm-065',
    round: 'hm',
    category: 'Web fundamentals',
    question: 'Which CSS properties are cheap to animate, and why?',
    answer: [
      'Answer with the pipeline rather than a memorised list: style, layout, paint, composite. A property that changes geometry forces layout and everything after it. A property that changes appearance skips layout but repaints. Transform and opacity can be handled by the compositor on already-painted layers, which is why they are the cheap pair, and why the list is a consequence rather than a rule to memorise.',
      'Give the substitution that follows: animate transform instead of top and left, and opacity instead of visibility toggles or colour fades where possible. Say that this is why a movement animation implemented with left stutters on a busy main thread while the same animation with translate stays smooth, because the compositor keeps running when the main thread is blocked.',
      'Be accurate about will-change rather than recommending it broadly: it promotes an element to its own layer ahead of time, which costs memory and can hurt if applied to many elements or left on permanently. It is a targeted fix for a measured problem, applied just before the animation and removed after, not a general performance attribute.',
      'Close on measurement, since the interviewer is listening for whether you guess or check: the performance panel shows which frames dropped and whether the cost was layout, paint or script, and paint flashing shows what is actually repainting. The useful answer to "is this animation expensive" is a recording, not an opinion about the property list.',
    ],
    keyPoints: [
      'Derives the cheap properties from the render pipeline rather than listing them',
      'Explains why compositor animations survive a blocked main thread',
      'Treats will-change as a targeted fix with real memory cost',
      'Ends on measurement rather than assertion',
    ],
    followUps: ['How would you animate height, which cannot be composited?', 'What would you check first if an animation is smooth locally and janky in production?'],
  },
  {
    id: 'hm-066',
    round: 'hm',
    category: 'Web fundamentals',
    question: 'How do script loading attributes and stylesheet placement affect when a page becomes usable?',
    answer: [
      'Start from why it matters: a classic script tag in the head blocks the parser, so the document stops being built until the script is fetched and executed. Everything else in this area is a way of not doing that, which is a cleaner framing than listing the attributes and their differences one by one.',
      'Give the three behaviours precisely: defer fetches in parallel and executes after parsing, in document order, which is the sensible default for application code. Async fetches in parallel and executes as soon as it arrives, out of order, which suits independent third-party scripts and is wrong for anything with dependencies. Module scripts are deferred by default, which is why modern bundles rarely need the attribute spelled out.',
      'Cover stylesheets as the other half, because scripts are only half the answer: a stylesheet in the head is render-blocking by design, since rendering unstyled content and then restyling it is worse than waiting. The lever is not to move it but to keep the critical set small and load the rest without blocking, and to preload the fonts and assets that first paint genuinely depends on.',
      'Close by connecting it to what users actually feel: parser-blocking work delays first paint, and deferred script that is nevertheless enormous delays interactivity, so a page can paint quickly and still ignore clicks. Naming both failure modes, and that they are fixed differently, is what makes this a staff answer rather than a recital of three attributes.',
    ],
    keyPoints: [
      'Frames the whole area around not blocking the parser',
      'States defer, async and module semantics including execution order',
      'Covers render-blocking CSS and the critical set, not only scripts',
      'Separates delayed first paint from delayed interactivity as distinct failures',
    ],
    followUps: ['How would you decide what belongs in the critical CSS?', 'A third-party tag is slowing first paint. What are your options?'],
  },

  // Situational (8)
  {
    id: 'hm-067',
    round: 'hm',
    category: 'Situational',
    question: 'A teammate is blocked on something you could unblock in an hour, but that hour pushes your own committed work past the sprint. What do you do?',
    answer: [
      'Answer the question they are actually asking, which is whether you optimise for your own visible output or for the team throughput. Say plainly that one person blocked for a day costs the team more than your item landing a day later, so you unblock them, and then say the part that makes it a senior answer rather than a generous one: you make the trade-off visible instead of absorbing it silently.',
      'Describe the mechanics concretely, because this is where the answer stops being a platitude: you tell them roughly when you can help so they are not waiting on an unknown, you say in standup or in the team channel that your item is now at risk and why, and you let the person who owns the priorities decide if that is the wrong call. Nobody is surprised at the end of the sprint.',
      'Add the judgement that stops it becoming a pattern, since a hiring manager is also listening for whether you can be diverted indefinitely: if the same unblocking keeps recurring, the hour is not the problem, the missing documentation or the single point of knowledge is. Fixing the cause is the higher-leverage version of the same instinct, and worth naming as the thing you would do after the second or third time.',
      'Close with a short concrete instance if you have one: [a time you paused your own work to unblock someone, what it cost, and what you did afterwards so it did not recur]. Keep it to a few sentences, because the question is situational and the story is supporting evidence rather than the answer.',
    ],
    keyPoints: [
      'Chooses team throughput over personal output and says why in cost terms',
      'Makes the trade-off visible rather than absorbing the slip quietly',
      'Lets the priority owner overrule the decision with the information',
      'Names fixing the recurring cause as the higher-leverage follow-up',
    ],
    followUps: ['What if it happens every week with the same person?', 'When would you not stop to help?'],
  },
  {
    id: 'hm-068',
    round: 'hm',
    category: 'Situational',
    question: 'The team decides on an approach you argued against. How do you behave in the weeks after the decision?',
    answer: [
      'State the position first, because any hedging here reads badly: you commit, fully and visibly. A decision that half the team is quietly undermining costs more than either option would have, and the person who keeps relitigating it in code review and side channels is the most expensive person in the room even when they turn out to be right.',
      'Then describe what committing actually looks like, since everyone says the word: you argue your case once, properly and in the open, with the reasoning and the evidence you have. Once the call is made you support it in front of others, you do not re-run the argument on every related pull request, and you do not attach a knowing comment to every problem the approach causes.',
      'Distinguish committing from silence, which is the nuance that makes this answer credible: you write down what you expect to go wrong and what would tell you it is going wrong, and you agree when the team will look at it again. That turns a disagreement into a hypothesis with a review date rather than into resentment, and it means being right later becomes useful information instead of a told-you-so.',
      'Draw the one line worth drawing: this holds for judgement calls about design, tooling and sequencing, which is nearly all of them. It does not hold for something unsafe, illegal, or that puts user data at genuine risk, where escalating is the correct action rather than the disloyal one. Say that boundary explicitly, because a candidate who commits to literally anything is a different kind of concern.',
    ],
    keyPoints: [
      'Commits visibly rather than complying while undermining',
      'Argues once in the open rather than relitigating in review',
      'Records expected failure signals and a review point, not resentment',
      'Names the narrow boundary where escalation replaces commitment',
    ],
    followUps: ['What if six months later it is clearly going wrong?', 'How do you disagree in a way that does not cost you the room?'],
  },
  {
    id: 'hm-069',
    round: 'hm',
    category: 'Situational',
    question: 'You join the team and find the codebase well below the standard you are used to. What do you do in your first month?',
    answer: [
      'Lead with restraint and say why it is not passivity: you are the person with the least context in the room, and most of what looks wrong is either a constraint you cannot see yet or a deliberate trade-off someone made under pressure. The first month is for finding out which, and a newcomer who opens with a quality verdict spends the rest of the year paying for it.',
      'Describe what you do instead of critiquing: ship something real, because you learn more about a codebase from one end-to-end change than from a week of reading, and it earns you the standing to have the conversation later. Ask about the history of the parts that surprise you, with genuine curiosity rather than as a rhetorical device, and write down what you find while you can still see it, since the strangeness becomes invisible within a couple of months.',
      'Then give the escalation path in priority order, because a hiring manager wants to know you would eventually act: raise anything that is a live risk to users or data immediately regardless of your tenure, and hold the rest until you can present it as a pattern with a cost attached rather than as a list of complaints. One well-evidenced proposal that fixes a recurring pain lands; a broad critique of the code style does not.',
      'Close on how you would introduce change: through the work rather than alongside it, improving what you touch and making the better pattern easy to copy, and picking the single highest-value thing to argue for rather than all of them at once. If you have an instance, keep it brief: [a time you joined something messy and what you changed first].',
    ],
    keyPoints: [
      'Assumes missing context before assuming poor judgement',
      'Ships something real first to earn standing and understanding',
      'Escalates genuine user or data risk immediately regardless of tenure',
      'Introduces change through the work rather than as a separate critique',
    ],
    followUps: ['What would you raise in week one regardless?', 'How do you avoid becoming the person who complains about the codebase?'],
  },
  {
    id: 'hm-070',
    round: 'hm',
    category: 'Situational',
    question: 'Deploys keep breaking in the same way. Nobody owns the problem and everyone works around it. What do you do?',
    answer: [
      'Start by making the cost legible, because that is the actual blocker rather than the technical fix. A recurring problem everybody routes around has no owner precisely because its cost is spread thin and invisible. Counting it, even roughly, over the last month or quarter turns a shared irritation into a number, and a number is something a manager can prioritise against a feature.',
      'Then investigate the cause rather than the instances, and be specific about the difference: three broken deploys with the same shape usually share one missing check, one flaky step, or one manual action that someone forgets. Fixing the shared cause once is cheaper than the workaround everyone is already paying for, and that comparison is the argument you take to the team.',
      'Describe how you would get it done without becoming the self-appointed owner of everything: propose it in the open with the cost and the estimate, ask for a small explicit slice of time rather than doing it invisibly at night, and make the fix something the team can maintain rather than something only you understand. Volunteering to do it alone and unrecorded teaches the organisation that these things are free.',
      'Close with the check that separates improvement from tinkering: define beforehand what tells you it worked, and go back and look. If the same failure does not recur next month, say so publicly, because that is what makes the next improvement easier to get funded. If it does recur, you diagnosed the wrong cause and that is worth saying too.',
    ],
    keyPoints: [
      'Quantifies the recurring cost to make it prioritisable',
      'Targets the shared cause rather than the individual incidents',
      'Asks for explicit time rather than doing it invisibly',
      'Defines a success signal and revisits it afterwards',
    ],
    followUps: ['What if you are told there is no time for it?', 'How do you decide this is worth fixing and something else is not?'],
  },
  {
    id: 'hm-071',
    round: 'hm',
    category: 'Situational',
    question: 'How do you keep improving when the work itself does not force you to?',
    answer: [
      'Answer honestly and specifically rather than listing content, because everyone claims to read and watch things. Say what you actually do: [the specific habit, whether that is building something small end to end, reading source of a library you depend on, or taking on the unfamiliar part of a project deliberately]. One concrete habit described in detail is worth more than five named resources.',
      'Distinguish two different kinds of improvement, since conflating them is what makes the answer vague: depth in what you already do, which mostly comes from post-mortems and from reading code written by people better than you, and breadth into what you do not, which needs deliberate choice because the work will never hand it to you. Say which you have been doing lately and why.',
      'Make it visible at team scale, because this is a hiring manager question and the interesting half is whether your learning stays yours: what you do with it, whether that is a short write-up, a change to how the team does something, or a session where you show what you found. Learning that never leaves one head is a hobby, and saying so shows you understand what they are assessing.',
      'Close with the failure mode you avoid, which reads as self-aware rather than boastful: chasing every new tool is not improvement, it is churn, and the discipline is deciding what not to adopt. Naming one thing you deliberately did not adopt, and why, is a strong close: [a technology you evaluated and passed on, with the reasoning].',
    ],
    keyPoints: [
      'Gives one concrete habit rather than a list of resources',
      'Separates deepening existing skill from deliberately adding breadth',
      'Explains how learning is fed back to the team rather than kept private',
      'Names deciding what not to adopt as part of the discipline',
    ],
    followUps: ['What have you learned recently that changed how you work?', 'How would you help a team that has stopped learning?'],
  },
  {
    id: 'hm-072',
    round: 'hm',
    category: 'Situational',
    question: 'The same complaint comes up in retro for the third time and nothing has changed. What do you do?',
    answer: [
      'Name why it keeps happening rather than proposing a better retro: an item that recurs is usually one of three things, either too vague to act on, owned by nobody, or genuinely outside the team control. They need different responses, and diagnosing which one it is takes a single direct question in the room rather than another round of discussion.',
      'For the vague version, the fix is to convert it into one specific change with a named owner and a date, and to accept a smaller change that will actually happen over a broad one that will not. Say directly that a retro producing five aspirations is worse than one producing a single completed action, because the former teaches the team that retro output is decorative.',
      'For the version outside the team control, be equally direct: keep raising it upward with the accumulated cost attached, and stop putting it on the retro board where it demoralises everyone weekly. Telling the team plainly that this one is not ours to fix, and that you are carrying it elsewhere, is more respectful than letting it recur as a ritual complaint.',
      'Close with what you do personally rather than what the process should do, since a hiring manager is assessing you not the ceremony: you take one of them yourself, do it, and report back, because the fastest way to restore belief that retro leads anywhere is one visible completed item. Then the next one gets a real owner because the team has seen it work.',
    ],
    keyPoints: [
      'Diagnoses why the item recurs instead of redesigning the ceremony',
      'Converts vague items into one owned, dated, smaller action',
      'Escalates out-of-team items upward and removes them from the board',
      'Takes and completes one personally to restore belief in the process',
    ],
    followUps: ['What if the blocker is the manager running the retro?', 'How do you tell a genuine process problem from ordinary friction?'],
  },
  {
    id: 'hm-073',
    round: 'hm',
    category: 'Situational',
    question: 'You spot a serious risk in an area nobody has asked you to look at and that is on no roadmap. What do you do?',
    answer: [
      'Start with verification rather than escalation, because credibility is the currency you spend here: confirm it is real, establish how it would actually be triggered, and work out roughly what it would cost if it happened. A raised alarm that turns out to be theoretical makes the next one, which may be real, much harder to raise.',
      'Then match the response to the severity honestly. Something exploitable or actively losing data goes to the right person immediately, through whatever the security or incident channel is, and it goes today. Something that will hurt in six months is written up as a short note with the risk, the trigger and the rough cost, and given to the person who owns that area, because handing it to an owner is the proactive move and quietly fixing someone else area is not.',
      'Say what you do when it is nobody area, since that is the real version of this question: you either take it and say publicly that you are taking it, or you make sure it lands with someone who can decide, and you get an explicit answer either way. The failure mode is mentioning it once in a channel, seeing no reply, and treating that as having handled it.',
      'Close with the part that shows judgement rather than zeal: accept that the answer may be a deliberate not now, and that a documented, understood, accepted risk is a legitimate outcome. What you avoid is the undocumented version where it is simply forgotten. If you have an instance, keep it to two sentences: [a risk you found outside your remit, and what happened to it].',
    ],
    keyPoints: [
      'Verifies and estimates cost before raising, to preserve credibility',
      'Matches urgency to severity rather than escalating everything equally',
      'Routes it to an owner or takes it openly instead of fixing it silently',
      'Accepts an explicit deferral as a valid outcome, but not silence',
    ],
    followUps: ['What if you raise it and nothing happens?', 'How do you decide when to just fix it yourself?'],
  },
  {
    id: 'hm-074',
    round: 'hm',
    category: 'Situational',
    question: 'You pick up a ticket with a thin, ambiguous description and the person who wrote it is away for two days. What do you do?',
    answer: [
      'Reject both extremes explicitly, since the question is designed to see which one you fall into: sitting idle for two days wastes them, and building your best guess for two days risks throwing all of it away. The answer is to find out how much of the work does not depend on the ambiguity, which is usually most of it.',
      'Describe the sequence concretely: write down what you believe the ticket means and specifically what you are unsure about, look for the answer where it may already exist, in the code, the designs, related tickets or whoever else touched this area, and then start on the parts that are true under every reading of the ambiguity. Ambiguity is rarely uniform across a task.',
      'Say what you do with the assumption you cannot resolve: state it in writing on the ticket, proceed on it deliberately, and structure the work so that reversing it is cheap if you guessed wrong. That is the difference between assuming and guessing, and it is what lets the author correct you in one comment when they return rather than discovering it at review.',
      'Close on the follow-through, because proactivity without it is just speed: when they are back, confirm the assumption before it is baked in, and if the description was thin in a way that will recur, say so once, kindly and with a concrete suggestion. Fixing the pattern is worth more than absorbing it silently a second time.',
    ],
    keyPoints: [
      'Rejects both waiting idle and building the whole guess',
      'Looks for the answer in existing artefacts before assuming',
      'Starts with the work that is invariant under the ambiguity',
      'Documents the assumption and keeps the reversal cheap',
    ],
    followUps: ['What if the whole task depends on the ambiguous part?', 'How do you raise the thin-description pattern without it sounding like blame?'],
  },

  // Questions to ask them (4)
  {
    id: 'hm-075',
    round: 'hm',
    category: 'Questions to ask them',
    question: 'Why is "What would make you say at ninety days that this hire is going well?" a good question to ask the hiring manager, and what separates a strong answer from a concerning one?',
    answer: [
      'It is a good question because it converts a vague role description into a concrete expectation you can be measured against, and because the manager has to answer as themselves rather than from the job posting. It also signals that you intend to be evaluated, which is a different posture from asking what the role involves.',
      'A strong answer is specific and mostly about outcomes rather than activity: a particular area you would own, a specific thing that would be working better, or a relationship you would have built. It usually includes something about the team as well as the code, because a senior hire who ships alone and changes nothing around them has not succeeded at this level.',
      'A concerning answer is either entirely output-based, meaning volume of tickets, which suggests the role is more junior than advertised, or so vague that it is clear nobody has thought about what this person is for. Both are worth probing with a follow-up rather than nodding through.',
      'Listen also for whether the answer matches what the rest of the loop implied. If the interviews have all been about architecture and the manager describes success as clearing a backlog, that gap is real information about the role, and it is better to find it now than in month three.',
    ],
    keyPoints: [
      'Turns the role description into a concrete, measurable expectation',
      'Strong answers name outcomes and include team impact, not only output',
      'Pure ticket-volume answers suggest a more junior role than advertised',
      'Checks the answer against what the rest of the loop implied',
    ],
    followUps: ['What would you ask if the answer is vague?', 'How would you use this answer in your first weeks if you joined?'],
  },
  {
    id: 'hm-076',
    round: 'hm',
    category: 'Questions to ask them',
    question: 'Why is "How does work reach the team, and how much say do engineers have in how it is built?" a good question to ask the hiring manager, and what separates a strong answer from a concerning one?',
    answer: [
      'It is the question that reveals whether the role is genuinely senior, because autonomy over the how is what distinguishes a staff-level seat from a well-paid implementation seat. It is also hard to answer with a slogan, since it asks about a process the manager lives with daily.',
      'A strong answer describes a real path, naming who decides what gets built and how much engineering input happens before that decision is fixed, and admits the friction in it. Managers who describe their own process honestly, including where it is imperfect, are usually describing something that exists rather than something aspirational.',
      'A concerning answer is fully finished specifications arriving with deadlines already attached and no described route for engineering to influence scope, or the opposite extreme where nobody owns priorities and the team switches direction constantly. Both predict a lot of your energy going into the process rather than the work.',
      'A good follow-up gets you the specifics: ask for the last thing the team pushed back on and what happened. The answer to that is usually more informative than the description of the process, because it is a real instance rather than a policy.',
    ],
    keyPoints: [
      'Targets autonomy over the how, which defines the seniority of the seat',
      'Strong answers describe a real path and admit its friction',
      'Fixed specs with fixed dates, or no priorities at all, are both warning signs',
      'Follows up by asking for the last real instance of pushback',
    ],
    followUps: ['What would you ask a peer engineer to sanity-check this answer?', 'How much fixed scope would be a dealbreaker for you?'],
  },
  {
    id: 'hm-077',
    round: 'hm',
    category: 'Questions to ask them',
    question: 'Why is "What slows this team down more than it should?" a good question to ask the hiring manager, and what separates a strong answer from a concerning one?',
    answer: [
      'It is a good question because it invites an honest answer without requiring the manager to criticise anyone, and because the response is usually the closest thing you will get to a description of your actual first year. Whatever they name is likely to be near the top of what you would work on.',
      'A strong answer is specific and self-aware: a named bottleneck, some sense of why it has persisted, and ideally what has already been tried. A manager who can describe their team weakness precisely is usually one who can also describe your development precisely, which matters more over two years than the technology stack does.',
      'A concerning answer is that nothing does, which is not true of any team, or an answer that locates every problem in another department with no reflection on what this team owns. Both suggest the retrospective culture is thinner than the process diagram implies.',
      'It also gives you a natural opening to say what you would do about it, which is a far better use of the last minutes than a rehearsed closing statement. Keep that brief and provisional, since you have known about the problem for thirty seconds, and ask a question rather than delivering a solution.',
    ],
    keyPoints: [
      'Elicits an honest constraint without asking the manager to blame anyone',
      'Strong answers are specific, self-aware and include what has been tried',
      '"Nothing" or "another department" both indicate weak reflection',
      'Creates an opening to respond briefly and provisionally, not to pitch',
    ],
    followUps: ['How would you respond if what they name is something you have fixed before?', 'What if the answer is something you would find intolerable?'],
  },
  {
    id: 'hm-078',
    round: 'hm',
    category: 'Questions to ask them',
    question: 'Why is "Who would I be working with day to day, and where does this role sit among them?" a good question to ask the hiring manager, and what separates a strong answer from a concerning one?',
    answer: [
      'It is a good question because team shape determines your day far more than the stack does, and because a manager describing their own team tells you how they think about people. It also surfaces the thing job descriptions systematically omit, which is whether this role is filling a gap, replacing someone, or adding capacity.',
      'A strong answer describes real people and real seams: who reviews whose code, where the boundary with backend, design or product sits, and who you would most often be blocked by or unblocking. Detail here means the manager is close enough to the work to know it, which is a good sign in itself.',
      'A concerning answer is an org chart with no texture, or a description where every dependency lives in another team with no described relationship, which usually means slow work regardless of how good the team is. Also listen for whether this seat exists because someone left, which is worth asking about directly and gently.',
      'Follow up with the composition question that matters at this level: how many people are at what experience level, since a team of mostly junior engineers is a very different job from a team of peers, and both can be good. Knowing which one it is before you accept is worth more than any answer about the technology.',
    ],
    keyPoints: [
      'Team shape determines the day-to-day more than the stack does',
      'Strong answers name real seams: review, boundaries, dependencies',
      'A textureless org chart or all-external dependencies predict slow work',
      'Follows up on seniority mix and on why the seat is open',
    ],
    followUps: ['How would the answer change what you asked in the rest of the loop?', 'What would you want to know about the person who held the role before?'],
  },
];
