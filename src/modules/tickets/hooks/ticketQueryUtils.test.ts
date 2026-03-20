/**
 * Tests for ticketQueryUtils
 * 
 * Tests pure utility functions: normalizeTicketRelations, fetchMessagesCounts, fetchMentions
 */
import { describe, it, expect } from 'vitest';
import { normalizeTicketRelations } from './ticketQueryUtils';
import type { MentionInfo } from './ticketQueryUtils';

describe('normalizeTicketRelations', () => {
  const baseTicket = {
    id: 'ticket-1',
    title: 'Test ticket',
    status: 'waiting',
    created_by: { id: 'user-1', display_name: 'Ana Costa', photo_url: null },
    owner: { id: 'user-2', display_name: 'Bruno Lima', photo_url: null },
    external_company: { id: 'comp-1', name: 'Acme Corp' },
    category: { id: 'cat-1', name: 'Suporte' },
    subcategory: { id: 'sub-1', name: 'Bug' },
    assigned_contact: { id: 'contact-1', name: 'Carlos', email: 'c@test.com' },
  };

  it('should pass through single-object relations unchanged', () => {
    const result = normalizeTicketRelations(baseTicket);
    expect(result.created_by).toEqual({ id: 'user-1', display_name: 'Ana Costa', photo_url: null });
    expect(result.owner).toEqual({ id: 'user-2', display_name: 'Bruno Lima', photo_url: null });
    expect(result.external_company).toEqual({ id: 'comp-1', name: 'Acme Corp' });
    expect(result.category).toEqual({ id: 'cat-1', name: 'Suporte' });
    expect(result.subcategory).toEqual({ id: 'sub-1', name: 'Bug' });
  });

  it('should unwrap array relations to first element', () => {
    const ticket = {
      ...baseTicket,
      created_by: [{ id: 'user-1', display_name: 'Ana Costa', photo_url: null }],
      owner: [{ id: 'user-2', display_name: 'Bruno Lima', photo_url: null }],
      external_company: [{ id: 'comp-1', name: 'Acme Corp' }],
      category: [{ id: 'cat-1', name: 'Suporte' }],
      subcategory: [{ id: 'sub-1', name: 'Bug' }],
      assigned_contact: [{ id: 'contact-1', name: 'Carlos', email: 'c@test.com' }],
    };
    const result = normalizeTicketRelations(ticket);
    expect(result.created_by).toEqual({ id: 'user-1', display_name: 'Ana Costa', photo_url: null });
    expect(result.owner).toEqual({ id: 'user-2', display_name: 'Bruno Lima', photo_url: null });
    expect(result.assigned_contact).toEqual({ id: 'contact-1', name: 'Carlos', email: 'c@test.com' });
  });

  it('should return null for empty array relations', () => {
    const ticket = {
      ...baseTicket,
      created_by: [],
      owner: [],
      external_company: [],
    };
    const result = normalizeTicketRelations(ticket);
    expect(result.created_by).toBeNull();
    expect(result.owner).toBeNull();
    expect(result.external_company).toBeNull();
  });

  it('should merge messages count from map', () => {
    const messagesMap = new Map([
      ['ticket-1', { count: 5, last_at: '2026-03-20T10:00:00Z' }],
    ]);
    const result = normalizeTicketRelations(baseTicket, messagesMap);
    expect(result.messages_count).toBe(5);
    expect(result.last_message_at).toBe('2026-03-20T10:00:00Z');
  });

  it('should default messages count to 0 when not in map', () => {
    const messagesMap = new Map<string, { count: number; last_at: string | null }>();
    const result = normalizeTicketRelations(baseTicket, messagesMap);
    expect(result.messages_count).toBe(0);
    expect(result.last_message_at).toBeNull();
  });

  it('should merge mentions from map', () => {
    const mentions: MentionInfo[] = [
      { id: 'user-3', display_name: 'Diana', photo_url: null, type: 'user' },
    ];
    const mentionsMap = new Map([['ticket-1', mentions]]);
    const result = normalizeTicketRelations(baseTicket, undefined, mentionsMap);
    expect(result.mentions_list).toEqual(mentions);
  });

  it('should default mentions to empty array', () => {
    const result = normalizeTicketRelations(baseTicket);
    expect(result.mentions_list).toEqual([]);
  });
});
