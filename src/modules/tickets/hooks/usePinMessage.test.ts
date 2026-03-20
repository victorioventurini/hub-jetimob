/**
 * Tests for canUserPinMessages (pure function)
 */
import { describe, it, expect } from 'vitest';
import { canUserPinMessages } from './usePinMessage';

const internalTicket = {
  created_by_user_id: 'creator-1',
  owner_user_id: 'owner-1',
  assigned_contact_id: null,
  type: 'internal' as const,
};

const externalTicket = {
  created_by_user_id: 'creator-1',
  owner_user_id: 'owner-1',
  assigned_contact_id: 'contact-1',
  type: 'external' as const,
};

describe('canUserPinMessages', () => {
  it('should return false when profileId is null', () => {
    expect(canUserPinMessages(internalTicket, null)).toBe(false);
  });

  it('should allow ticket creator to pin', () => {
    expect(canUserPinMessages(internalTicket, 'creator-1')).toBe(true);
  });

  it('should allow ticket owner to pin', () => {
    expect(canUserPinMessages(internalTicket, 'owner-1')).toBe(true);
  });

  it('should deny random user on internal ticket', () => {
    expect(canUserPinMessages(internalTicket, 'random-user')).toBe(false);
  });

  it('should allow assigned contact on external ticket', () => {
    expect(canUserPinMessages(externalTicket, 'random-user', 'contact-1')).toBe(true);
  });

  it('should deny wrong contact on external ticket', () => {
    expect(canUserPinMessages(externalTicket, 'random-user', 'contact-wrong')).toBe(false);
  });

  it('should deny contact on internal ticket', () => {
    const ticket = { ...internalTicket, assigned_contact_id: 'contact-1' };
    expect(canUserPinMessages(ticket, 'random-user', 'contact-1')).toBe(false);
  });

  it('should allow creator even on external ticket', () => {
    expect(canUserPinMessages(externalTicket, 'creator-1')).toBe(true);
  });

  it('should handle null owner_user_id', () => {
    const ticket = { ...internalTicket, owner_user_id: null };
    expect(canUserPinMessages(ticket, 'creator-1')).toBe(true);
    expect(canUserPinMessages(ticket, 'random-user')).toBe(false);
  });
});
