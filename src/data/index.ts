import type { Question, Round, RoundId } from '../types';
import { hr } from './hr';
import { hm } from './hm';
import { coding } from './coding';
import { caseStudy } from './case';
import { debrief } from './debrief';
import { hoe } from './hoe';

export const ROUND_IDS = ['hr', 'hm', 'coding', 'case', 'debrief', 'hoe'] as const satisfies readonly RoundId[];

export const rounds: Round[] = [
  { id: 'hr', title: 'HR screen', blurb: 'Motivation, logistics, compensation framing, German employment basics.' },
  { id: 'hm', title: 'Hiring manager', blurb: 'Technical depth and behavioral stories at staff scope.' },
  { id: 'coding', title: 'Live coding', blurb: 'Pairing on a build, debugging unfamiliar code, and reviewing a PR out loud.' },
  { id: 'case', title: 'Case study', blurb: 'Scoping, building and presenting the take-home.' },
  { id: 'debrief', title: 'Case study debrief', blurb: 'The panel grills your trade-offs, edge cases and what you would change.' },
  { id: 'hoe', title: 'Head of engineering', blurb: 'Vision, org impact, culture, and the questions you ask them.' },
];

export const questions: Question[] = [...hr, ...hm, ...coding, ...caseStudy, ...debrief, ...hoe];

export function questionsByRound(id: RoundId): Question[] {
  return questions.filter((q) => q.round === id);
}
