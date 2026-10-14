import type { Role, RoleId } from '../types';

export const ROLE_IDS = ['senior', 'staff', 'lead', 'architect', 'fs-senior', 'fs-staff'] as const satisfies readonly RoleId[];

export const roles: Role[] = [
  { id: 'senior', title: 'Senior frontend', rounds: ['hr', 'hm', 'coding', 'algo', 'design', 'case', 'debrief'] },
  { id: 'staff', title: 'Staff frontend', rounds: ['hr', 'hm', 'coding', 'algo', 'design', 'case', 'debrief', 'hoe'] },
  { id: 'lead', title: 'Lead frontend', rounds: ['hr', 'hm', 'coding', 'algo', 'design', 'lead', 'hoe'] },
  { id: 'architect', title: 'Frontend architect', rounds: ['hr', 'hm', 'arch', 'design', 'case', 'debrief', 'hoe'] },
  { id: 'fs-senior', title: 'Senior full-stack', rounds: ['hr', 'hm', 'coding', 'algo', 'backend', 'design', 'case', 'debrief'] },
  { id: 'fs-staff', title: 'Staff full-stack', rounds: ['hr', 'hm', 'coding', 'algo', 'backend', 'design', 'case', 'debrief', 'hoe'] },
];

export const DEFAULT_ROLE: RoleId = 'staff';
