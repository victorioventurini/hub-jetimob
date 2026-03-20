/**
 * Tests for ticketFieldDefinitions constants
 */
import { describe, it, expect } from 'vitest';
import { TICKET_STALE_TIME, DEFAULT_LIMIT, TICKET_FIELDS } from './ticketFieldDefinitions';

describe('TICKET_STALE_TIME', () => {
  it('should have list stale time of 2 minutes', () => {
    expect(TICKET_STALE_TIME.list).toBe(2 * 60 * 1000);
  });

  it('should have detail stale time of 1 minute', () => {
    expect(TICKET_STALE_TIME.detail).toBe(60 * 1000);
  });
});

describe('DEFAULT_LIMIT', () => {
  it('should be 1000', () => {
    expect(DEFAULT_LIMIT).toBe(1000);
  });
});

describe('TICKET_FIELDS', () => {
  it('should not use select("*") pattern', () => {
    Object.entries(TICKET_FIELDS).forEach(([key, value]) => {
      expect(value).not.toContain('*');
    });
  });

  it('ticketList should contain required fields', () => {
    const required = ['id', 'bu_id', 'type', 'title', 'status', 'created_at'];
    required.forEach(field => {
      expect(TICKET_FIELDS.ticketList).toContain(field);
    });
  });

  it('ticketDetail should contain required fields', () => {
    const required = ['id', 'bu_id', 'type', 'title', 'status', 'created_at', 'visibility'];
    required.forEach(field => {
      expect(TICKET_FIELDS.ticketDetail).toContain(field);
    });
  });

  it('should include FK joins for relations', () => {
    expect(TICKET_FIELDS.ticketList).toContain('external_company:external_companies');
    expect(TICKET_FIELDS.ticketList).toContain('category:ticket_categories');
    expect(TICKET_FIELDS.ticketList).toContain('created_by:profiles');
    expect(TICKET_FIELDS.ticketList).toContain('owner:profiles');
  });
});
