/**
 * Tests for query key factories — structural validation
 */
import { describe, it, expect } from 'vitest';
import { ticketsKeys } from './tickets';
import { assetsKeys } from './assets';
import { okrsKeys } from './okrs';
import { teamsKeys, squadsKeys } from './teams';
import { authKeys, profilesKeys, identityKeys } from './auth';
import { areasKeys } from './areas';

describe('ticketsKeys', () => {
  it('should generate stable keys with buId', () => {
    const key = ticketsKeys.all('bu-1');
    expect(key).toEqual(['tickets', 'bu-1']);
  });

  it('should accept null buId', () => {
    const key = ticketsKeys.all(null);
    expect(key).toEqual(['tickets', null]);
  });
});

describe('assetsKeys', () => {
  it('should have inventory sub-keys', () => {
    expect(assetsKeys.inventory).toBeDefined();
    const key = assetsKeys.inventory.all('bu-1');
    expect(key[0]).toBe('assets');
  });
});

describe('okrsKeys', () => {
  it('should generate org objectives key', () => {
    const key = okrsKeys.orgObjectives('bu-1');
    expect(key).toContain('bu-1');
  });
});

describe('teamsKeys', () => {
  it('should generate all teams key', () => {
    expect(teamsKeys.all('bu-1')).toEqual(['teams', 'bu-1']);
  });

  it('should generate list key with includeInactive', () => {
    expect(teamsKeys.list('bu-1', true)).toEqual(['teams', 'list', 'bu-1', true]);
    expect(teamsKeys.list('bu-1', false)).toEqual(['teams', 'list', 'bu-1', false]);
  });
});

describe('squadsKeys', () => {
  it('should generate all squads key', () => {
    expect(squadsKeys.all('bu-1')).toEqual(['squads', 'bu-1']);
  });

  it('should generate byTeam key', () => {
    expect(squadsKeys.byTeam('team-1')).toEqual(['squads', 'byTeam', 'team-1']);
  });
});

describe('authKeys', () => {
  it('should generate identity key', () => {
    expect(authKeys.identity('user-1')).toEqual(['auth', 'identity', 'user-1']);
  });

  it('should handle null userId', () => {
    expect(authKeys.identity(null)).toEqual(['auth', 'identity', null]);
  });
});

describe('profilesKeys', () => {
  it('should generate all profiles key', () => {
    expect(profilesKeys.all('bu-1')).toEqual(['profiles', 'bu-1']);
  });
});

describe('identityKeys', () => {
  it('should generate profile key', () => {
    expect(identityKeys.profile('user-1')).toEqual(['identity', 'profile', 'user-1']);
  });

  it('should generate permissions key', () => {
    const key = identityKeys.permissions('bu-1', 'user-1');
    expect(key).toContain('bu-1');
    expect(key).toContain('user-1');
  });
});

describe('areasKeys', () => {
  it('should generate all areas key', () => {
    expect(areasKeys.all('bu-1')).toEqual(['areas', 'bu-1']);
  });
});
