import { describe, expect, test } from 'vitest';
import { ROUND_IDS } from './index';
import { DEFAULT_ROLE, ROLE_IDS, roles } from './roles';

describe('role catalogue', () => {
  test('every role has a non-empty rounds list that includes hr', () => {
    for (const role of roles) {
      expect(role.rounds.length, role.id).toBeGreaterThan(0);
      expect(role.rounds, role.id).toContain('hr');
    }
  });

  test('every role round references a real catalogue round', () => {
    for (const role of roles) {
      for (const r of role.rounds) expect(ROUND_IDS, `${role.id}:${r}`).toContain(r);
    }
  });

  test('hoe appears in every loop except the two senior ones', () => {
    for (const role of roles) {
      if (role.id === 'senior' || role.id === 'fs-senior') expect(role.rounds, role.id).not.toContain('hoe');
      else expect(role.rounds, role.id).toContain('hoe');
    }
  });

  test('only the full-stack loops have a backend round, and they keep live coding', () => {
    for (const role of roles) {
      const fullStack = role.id === 'fs-senior' || role.id === 'fs-staff';
      expect(role.rounds.includes('backend'), role.id).toBe(fullStack);
      if (fullStack) expect(role.rounds, role.id).toContain('coding');
    }
  });

  test('DEFAULT_ROLE is staff and is a valid role id', () => {
    expect(DEFAULT_ROLE).toBe('staff');
    expect(ROLE_IDS).toContain(DEFAULT_ROLE);
  });

  test('roles.map(id) matches ROLE_IDS', () => {
    expect(roles.map((r) => r.id).sort()).toEqual([...ROLE_IDS].sort());
  });
});

import { forRole } from './index';

describe('forRole', () => {
  test('rounds come back in the role\'s own order, not catalogue order', () => {
    const lead = forRole('lead');
    expect(lead.rounds.map((r) => r.id)).toEqual(['hr', 'hm', 'coding', 'design', 'lead', 'hoe']);
  });

  test('questions are limited to the role\'s rounds', () => {
    const senior = forRole('senior');
    expect(senior.questions.some((q) => q.round === 'hoe')).toBe(false);
    expect(senior.questions.some((q) => q.round === 'hr')).toBe(true);
  });

  test('an untagged question appears for every role whose loop has its round', () => {
    const staff = forRole('staff');
    const architect = forRole('architect');
    const untaggedHr = staff.questions.find((q) => q.round === 'hr' && q.roles === undefined);
    expect(untaggedHr).toBeDefined();
    expect(architect.questions.some((q) => q.id === untaggedHr!.id)).toBe(true);
  });

  // Exercised by Task 9's real `roles`-tagged questions (hm.ts, design.ts).
  test('a tagged question appears only for the roles listed', () => {
    const tagged = forRole('staff').questions.find((q) => q.roles !== undefined);
    expect(tagged).toBeDefined();
    for (const id of ['senior', 'staff', 'lead', 'architect'] as const) {
      const present = forRole(id).questions.some((q) => q.id === tagged!.id);
      expect(present, id).toBe((tagged!.roles as string[]).includes(id));
    }
  });

  test('byRound scopes to both the round and the role', () => {
    const senior = forRole('senior');
    expect(senior.byRound('hoe')).toEqual([]);
    expect(senior.byRound('hr').length).toBeGreaterThan(0);
  });

  test('calling forRole twice with the same id returns the same memoised object', () => {
    expect(forRole('staff')).toBe(forRole('staff'));
  });

  // Full-stack loops are "the frontend loop plus backend". The existing roles tags all
  // list staff, so a missed 'fs-staff' on one of them would silently drop a staff-scope
  // question from Staff full-stack — this compares the two sets id for id.
  test.each([['fs-staff', 'staff'], ['fs-senior', 'senior']] as const)(
    '%s sees exactly what %s sees, plus backend',
    (fs, fe) => {
      const fsIds = forRole(fs).questions.filter((q) => q.round !== 'backend').map((q) => q.id);
      expect(fsIds).toEqual(forRole(fe).questions.map((q) => q.id));
      expect(forRole(fs).byRound('backend').length).toBeGreaterThanOrEqual(36);
    },
  );

  test('full-stack round order puts backend between live coding and system design', () => {
    expect(forRole('fs-staff').rounds.map((r) => r.id)).toEqual(['hr', 'hm', 'coding', 'backend', 'design', 'case', 'debrief', 'hoe']);
  });
});
