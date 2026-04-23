/**
 * Tests for auth-related query key factories not yet covered.
 */
import { describe, it, expect } from 'vitest';
import {
  authKeys,
  profilesKeys,
  identityKeys,
  onboardingKeys,
  myProfileKeys,
  publicProfileKeys,
} from './auth';

describe('authKeys', () => {
  it('builds identity / onboardingCheck / userRole keys', () => {
    expect(authKeys.identity('u1')).toEqual(['auth', 'identity', 'u1']);
    expect(authKeys.onboardingCheck('u1')).toEqual(['auth', 'onboarding-check', 'u1']);
    expect(authKeys.userRole('u1')).toEqual(['auth', 'user-role', 'u1']);
  });
});

describe('profilesKeys', () => {
  it('exposes list/detail/hoverCard scoped helpers', () => {
    expect(profilesKeys.all('bu-1')).toEqual(['profiles', 'bu-1']);
    expect(profilesKeys.list('bu-1', { active: true })).toEqual([
      'profiles',
      'list',
      'bu-1',
      { active: true },
    ]);
    expect(profilesKeys.detail('u1', 'bu-1')).toEqual(['profiles', 'detail', 'u1', 'bu-1']);
    expect(profilesKeys.hoverCard('u1')).toEqual(['profiles', 'hover-card', 'u1', undefined]);
  });

  it('me() and buMembers/buProfiles helpers are stable', () => {
    expect(profilesKeys.me()).toEqual(['profiles', 'me']);
    expect(profilesKeys.buProfiles('bu-1')).toEqual(['profiles', 'bu', 'bu-1']);
    expect(profilesKeys.buMembers('bu-1')).toEqual(['profiles', 'bu-members', 'bu-1']);
  });
});

describe('identityKeys', () => {
  it('separates impersonated vs normal permission caches', () => {
    const real = identityKeys.permissions('bu-1', 'u-1');
    const impersonated = identityKeys.impersonatedPermissions('bu-1', 'u-1');
    expect(real).not.toEqual(impersonated);
    expect(impersonated).toContain('impersonated');
  });

  it('impersonatedRole / impersonatedAuthUser are namespaced separately', () => {
    expect(identityKeys.impersonatedRole('bu-1', 'u-1')).toContain('impersonated');
    expect(identityKeys.impersonatedAuthUser('u-1')).toEqual([
      'identity',
      'impersonated-auth-user',
      'u-1',
    ]);
  });

  it('modules key includes both userId and buId', () => {
    expect(identityKeys.modules('u-1', 'bu-1')).toEqual(['identity', 'modules', 'u-1', 'bu-1']);
  });
});

describe('onboardingKeys & myProfileKeys', () => {
  it('onboardingKeys.check is user-scoped', () => {
    expect(onboardingKeys.check('u-1')).toEqual(['onboarding-check', 'u-1']);
  });

  it('myProfileKeys exposes prefix helper', () => {
    expect(myProfileKeys.profilePrefix()).toEqual(['my-profile']);
    expect(myProfileKeys.profile('u-1')).toEqual(['my-profile', 'u-1']);
    expect(myProfileKeys.team('t-1')).toEqual(['profile-team', 't-1']);
  });
});

describe('publicProfileKeys', () => {
  it('builds keys per public-profile resource type', () => {
    expect(publicProfileKeys.profile('p1', 'bu-1')).toEqual(['public-profile', 'p1', 'bu-1']);
    expect(publicProfileKeys.okrs('u1', 'bu-1')).toEqual(['user-okrs', 'u1', 'bu-1', null]);
    expect(publicProfileKeys.kpis('u1', 'bu-1')).toEqual(['user-kpis', 'u1', 'bu-1']);
    expect(publicProfileKeys.contributedKpis('u1', 'bu-1')).toEqual(['user-contributed-kpis', 'u1', 'bu-1']);
    expect(publicProfileKeys.squads('u1', 'bu-1')).toEqual(['user-squads', 'u1', 'bu-1']);
    expect(publicProfileKeys.buMemberships('p1')).toEqual(['user-bu-memberships', 'p1']);
  });

  it('okrs key differentiates by cycleId', () => {
    const noCycle = publicProfileKeys.okrs('u1', 'bu-1');
    const withCycle = publicProfileKeys.okrs('u1', 'bu-1', 'cycle-1');
    expect(noCycle).toEqual(['user-okrs', 'u1', 'bu-1', null]);
    expect(withCycle).toEqual(['user-okrs', 'u1', 'bu-1', 'cycle-1']);
    expect(noCycle).not.toEqual(withCycle);
  });
});
