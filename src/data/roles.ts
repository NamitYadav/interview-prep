import type { Role, RoleId } from '../types';

export const ROLE_IDS = ['senior', 'staff', 'lead', 'architect'] as const satisfies readonly RoleId[];

export const roles: Role[] = [
  { id: 'senior', title: 'Senior frontend', blurb: 'Individual-contributor loop, no head-of-engineering round.', rounds: ['hr', 'hm', 'coding', 'design', 'case', 'debrief'] },
  { id: 'staff', title: 'Staff frontend', blurb: 'The original loop: seven rounds ending with head of engineering.', rounds: ['hr', 'hm', 'coding', 'design', 'case', 'debrief', 'hoe'] },
  { id: 'lead', title: 'Lead frontend', blurb: 'People and delivery scope in place of the case study.', rounds: ['hr', 'hm', 'coding', 'design', 'lead', 'hoe'] },
  { id: 'architect', title: 'Frontend architect', blurb: 'Architecture deep-dive in place of live coding.', rounds: ['hr', 'hm', 'arch', 'design', 'case', 'debrief', 'hoe'] },
];

export const DEFAULT_ROLE: RoleId = 'staff';
