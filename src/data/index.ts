import type { Question, Role, RoleId, Round, RoundId, Route } from '../types';
import { hr } from './hr';
import { hm } from './hm';
import { coding } from './coding';
import { design } from './design';
import { caseStudy } from './case';
import { debrief } from './debrief';
import { hoe } from './hoe';
import { lead } from './lead';
import { arch } from './arch';
import { roles } from './roles';

export const ROUND_IDS = ['hr', 'hm', 'coding', 'design', 'case', 'debrief', 'hoe', 'lead', 'arch'] as const satisfies readonly RoundId[];

export const ROUTES = [...ROUND_IDS, 'weak', 'notes', 'stories', 'mock', 'search', 'print'] as const satisfies readonly Route[];

export const rounds: Round[] = [
  { id: 'hr', title: 'HR screen', blurb: 'Motivation, logistics, compensation framing, German employment basics.', targetSeconds: 90 },
  { id: 'hm', title: 'Hiring manager', blurb: 'Live code review on HTML, CSS and JS, situational judgement, and staff-scope stories.', targetSeconds: 150 },
  { id: 'coding', title: 'Live coding', blurb: 'Pairing on a build, debugging unfamiliar code, and reviewing a PR out loud.', targetSeconds: 180 },
  { id: 'design', title: 'Frontend system design', blurb: 'One prompt, 45 minutes: requirements, architecture, trade-offs, out loud.', targetSeconds: 300 },
  { id: 'case', title: 'Case study', blurb: 'Scoping, building and presenting the take-home.', targetSeconds: 150 },
  { id: 'debrief', title: 'Case study debrief', blurb: 'The panel grills your trade-offs, edge cases and what you would change.', targetSeconds: 120 },
  { id: 'hoe', title: 'Head of engineering', blurb: 'Vision, org impact, culture, and the questions you ask them.', targetSeconds: 150 },
  { id: 'lead', title: 'Tech lead round', blurb: 'People management, delivery, hiring, conflict, and running a team\'s technical direction.', targetSeconds: 150 },
  { id: 'arch', title: 'Architecture deep-dive', blurb: 'Cross-team platform decisions, migration strategy, ADRs, design-system governance, build/runtime architecture.', targetSeconds: 240 },
];

// Only forRole() reads this directly; there is no unscoped per-round accessor on
// purpose — one would show another role's questions and nothing would fail.
export const questions: Question[] = [...hr, ...hm, ...coding, ...design, ...caseStudy, ...debrief, ...hoe, ...lead, ...arch];

// Categories whose questions are naturally answered with a real story rather than
// a technical explanation — QuestionCard offers the story bank pre-reveal for these.
export const STORY_CATEGORIES: ReadonlySet<string> = new Set([
  'From your CV',
  'Motivation & fit',
  'Leadership & influence',
  'Situational',
  'Delivery & process',
  'Culture & values',
  'Org & impact',
  'Questions to ask them',
  'Vision & strategy',
  'People & growth',
  'Conflict & stakeholders',
]);

export const isStoryPrompt = (q: Question): boolean => STORY_CATEGORIES.has(q.category);

export interface RoleQuestions {
  role: Role;
  rounds: Round[];
  questions: Question[];
  byRound(r: RoundId): Question[];
}

const roleCache = new Map<RoleId, RoleQuestions>();

export function forRole(id: RoleId): RoleQuestions {
  const cached = roleCache.get(id);
  if (cached) return cached;

  const role = roles.find((r) => r.id === id)!;
  const scopedRounds = role.rounds.map((r) => rounds.find((round) => round.id === r)!);
  const scopedQuestions = questions.filter(
    (q) => role.rounds.includes(q.round) && (q.roles === undefined || q.roles.includes(id)),
  );
  const scopedByRound = new Map<RoundId, Question[]>(
    role.rounds.map((r) => [r, scopedQuestions.filter((q) => q.round === r)]),
  );

  const result: RoleQuestions = {
    role,
    rounds: scopedRounds,
    questions: scopedQuestions,
    byRound: (r) => scopedByRound.get(r) ?? [],
  };
  roleCache.set(id, result);
  return result;
}
