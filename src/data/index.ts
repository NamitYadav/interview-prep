import type { Question, Round, RoundId, Route } from '../types';
import { hr } from './hr';
import { hm } from './hm';
import { coding } from './coding';
import { design } from './design';
import { caseStudy } from './case';
import { debrief } from './debrief';
import { hoe } from './hoe';

export const ROUND_IDS = ['hr', 'hm', 'coding', 'design', 'case', 'debrief', 'hoe'] as const satisfies readonly RoundId[];

export const ROUTES = [...ROUND_IDS, 'weak', 'notes', 'stories', 'mock'] as const satisfies readonly Route[];

export const rounds: Round[] = [
  { id: 'hr', title: 'HR screen', blurb: 'Motivation, logistics, compensation framing, German employment basics.', targetSeconds: 90 },
  { id: 'hm', title: 'Hiring manager', blurb: 'Live code review on HTML, CSS and JS, situational judgement, and staff-scope stories.', targetSeconds: 150 },
  { id: 'coding', title: 'Live coding', blurb: 'Pairing on a build, debugging unfamiliar code, and reviewing a PR out loud.', targetSeconds: 180 },
  { id: 'design', title: 'Frontend system design', blurb: 'One prompt, 45 minutes: requirements, architecture, trade-offs, out loud.', targetSeconds: 300 },
  { id: 'case', title: 'Case study', blurb: 'Scoping, building and presenting the take-home.', targetSeconds: 150 },
  { id: 'debrief', title: 'Case study debrief', blurb: 'The panel grills your trade-offs, edge cases and what you would change.', targetSeconds: 120 },
  { id: 'hoe', title: 'Head of engineering', blurb: 'Vision, org impact, culture, and the questions you ask them.', targetSeconds: 150 },
];

export const questions: Question[] = [...hr, ...hm, ...coding, ...design, ...caseStudy, ...debrief, ...hoe];

export function questionsByRound(id: RoundId): Question[] {
  return questions.filter((q) => q.round === id);
}
