/**
 * Tests for participantKeys — Unified Participant Layer
 */
import { describe, it, expect } from 'vitest';
import { participantKeys } from './participantKeys';

describe('participantKeys', () => {
  it('all() returns a tuple scoped by buId', () => {
    expect(participantKeys.all('bu-1')).toEqual(['participants', 'bu-1']);
    expect(participantKeys.all(null)).toEqual(['participants', null]);
  });

  it('listPrefix returns prefix without filters', () => {
    expect(participantKeys.listPrefix('bu-1')).toEqual(['participants', 'list', 'bu-1']);
  });

  it('list spreads listPrefix and appends filters', () => {
    const filters = { q: 'alice', includeExternal: true };
    expect(participantKeys.list('bu-1', filters)).toEqual([
      'participants',
      'list',
      'bu-1',
      filters,
    ]);
  });

  it('detail uses participant root namespace', () => {
    expect(participantKeys.detail('p1')).toEqual(['participant', 'p1']);
  });

  it('resolve includes both participantId and buId', () => {
    expect(participantKeys.resolve('p1', 'bu-1')).toEqual([
      'participant',
      'resolve',
      'p1',
      'bu-1',
    ]);
  });

  it('contactHoverCard scoped by contactId', () => {
    expect(participantKeys.contactHoverCard('c1')).toEqual([
      'participant',
      'contact-hover',
      'c1',
    ]);
  });
});
