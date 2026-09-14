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

  test('hoe appears in every loop except senior', () => {
    for (const role of roles) {
      if (role.id === 'senior') expect(role.rounds).not.toContain('hoe');
      else expect(role.rounds, role.id).toContain('hoe');
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
