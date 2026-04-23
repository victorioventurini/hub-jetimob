/**
 * Tests for unified participant types & helpers.
 *
 * Validates type guards, initials extraction, profile path routing,
 * and DB row mapping for internal/external participants.
 */
import { describe, it, expect } from 'vitest';
import {
  isInternalParticipant,
  isExternalParticipant,
  getParticipantInitials,
  getParticipantProfilePath,
  mapToUnifiedParticipant,
  toDisplayInfo,
  type UnifiedParticipant,
} from './participantTypes';

const internal: UnifiedParticipant = {
  userType: 'internal',
  participantId: 'p-1',
  authUserId: 'auth-1',
  displayName: 'Ana Silva',
  email: 'ana@x.com',
  photoUrl: 'https://x/a.png',
  buId: 'bu-1',
  companyId: null,
  companyName: null,
  teamName: 'Eng',
  jobTitle: 'Dev',
};

const external: UnifiedParticipant = {
  ...internal,
  userType: 'external',
  participantId: 'pc-1',
  authUserId: null,
  displayName: 'Bob Cliente',
  companyId: 'c-1',
  companyName: 'Acme',
  teamName: null,
  jobTitle: null,
};

describe('isInternalParticipant', () => {
  it('returns true for internal', () => {
    expect(isInternalParticipant(internal)).toBe(true);
  });
  it('returns false for external', () => {
    expect(isInternalParticipant(external)).toBe(false);
  });
});

describe('isExternalParticipant', () => {
  it('returns true for external', () => {
    expect(isExternalParticipant(external)).toBe(true);
  });
  it('returns false for internal', () => {
    expect(isExternalParticipant(internal)).toBe(false);
  });
});

describe('getParticipantInitials', () => {
  it('returns ?? for empty string', () => {
    expect(getParticipantInitials('')).toBe('??');
  });

  it('returns first 2 chars uppercase for single name', () => {
    expect(getParticipantInitials('Ana')).toBe('AN');
  });

  it('returns first letter of first + last for full name', () => {
    expect(getParticipantInitials('Ana Silva')).toBe('AS');
  });

  it('uses first and LAST name for 3+ parts', () => {
    expect(getParticipantInitials('Ana Maria Silva Santos')).toBe('AS');
  });

  it('handles extra whitespace', () => {
    expect(getParticipantInitials('  Ana   Silva  ')).toBe('AS');
  });

  it('uppercases lowercase input', () => {
    expect(getParticipantInitials('ana silva')).toBe('AS');
  });

  it('handles single-char single name', () => {
    expect(getParticipantInitials('A')).toBe('A');
  });
});

describe('getParticipantProfilePath', () => {
  it('routes internal to /users/:id', () => {
    expect(getParticipantProfilePath(internal)).toBe('/users/p-1');
  });

  it('routes external to /contacts/:id', () => {
    expect(getParticipantProfilePath(external)).toBe('/contacts/pc-1');
  });
});

describe('mapToUnifiedParticipant', () => {
  it('maps a complete DB row correctly', () => {
    const row = {
      user_type: 'internal',
      participant_id: 'p-1',
      auth_user_id: 'auth-1',
      display_name: 'Ana',
      email: 'a@x.com',
      photo_url: 'https://x/a.png',
      bu_id: 'bu-1',
      company_id: null,
      company_name: null,
      team_name: 'Eng',
      job_title: 'Dev',
    };
    const out = mapToUnifiedParticipant(row);
    expect(out).toEqual({
      userType: 'internal',
      participantId: 'p-1',
      authUserId: 'auth-1',
      displayName: 'Ana',
      email: 'a@x.com',
      photoUrl: 'https://x/a.png',
      buId: 'bu-1',
      companyId: null,
      companyName: null,
      teamName: 'Eng',
      jobTitle: 'Dev',
    });
  });

  it('preserves nullable fields from external row', () => {
    const row = {
      user_type: 'external',
      participant_id: 'pc-1',
      auth_user_id: null,
      display_name: 'Bob',
      email: 'b@x.com',
      photo_url: null,
      bu_id: null,
      company_id: 'c-1',
      company_name: 'Acme',
      team_name: null,
      job_title: null,
    };
    const out = mapToUnifiedParticipant(row);
    expect(out.userType).toBe('external');
    expect(out.authUserId).toBeNull();
    expect(out.companyName).toBe('Acme');
    expect(out.teamName).toBeNull();
  });
});

describe('toDisplayInfo', () => {
  it('strips heavy fields, keeps display essentials', () => {
    const out = toDisplayInfo(external);
    expect(out).toEqual({
      participantId: 'pc-1',
      userType: 'external',
      displayName: 'Bob Cliente',
      photoUrl: 'https://x/a.png',
      companyName: 'Acme',
    });
    // Confirm heavy fields are NOT present
    expect((out as any).email).toBeUndefined();
    expect((out as any).jobTitle).toBeUndefined();
  });
});
