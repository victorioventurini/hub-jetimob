/**
 * Wave 2 — Tests for tickets query keys.
 */
import { describe, it, expect } from 'vitest';
import { ticketsKeys } from './tickets';

describe('ticketsKeys', () => {
  it('all', () => {
    expect(ticketsKeys.all('bu1')).toEqual(['tickets', 'bu1']);
    expect(ticketsKeys.all(null)).toEqual(['tickets', null]);
  });

  it('listPrefix vs list', () => {
    expect(ticketsKeys.listPrefix('bu1')).toEqual(['tickets', 'list', 'bu1']);
    expect(ticketsKeys.list('bu1', { status: 'open' })).toEqual([
      'tickets', 'list', 'bu1', { status: 'open' },
    ]);
  });

  it('myTickets prefix vs detail', () => {
    expect(ticketsKeys.myTicketsPrefix('bu1')).toEqual(['my-tickets', 'bu1']);
    expect(ticketsKeys.myTickets('bu1', 'p1')).toEqual(['my-tickets', 'bu1', 'p1']);
  });

  it('detail/messages/attachments', () => {
    expect(ticketsKeys.detail('t1')).toEqual(['ticket', 't1']);
    expect(ticketsKeys.messages('t1')).toEqual(['tickets', 'messages', 't1']);
    expect(ticketsKeys.attachments('t1')).toEqual(['ticket-attachments', 't1']);
  });

  it('categories/subcategories com escopo', () => {
    expect(ticketsKeys.categories('bu1', 'public')).toEqual([
      'tickets', 'categories', 'bu1', 'public',
    ]);
    expect(ticketsKeys.subcategories('bu1', 'cat1')).toEqual([
      'tickets', 'subcategories', 'bu1', 'cat1',
    ]);
  });

  it('partnerContactByEmail normaliza para lowercase', () => {
    expect(ticketsKeys.partnerContactByEmail('FOO@Bar.com')).toEqual([
      'partner-contact-by-email', 'foo@bar.com',
    ]);
    expect(ticketsKeys.partnerContactByEmail(null)).toEqual([
      'partner-contact-by-email', undefined,
    ]);
  });

  it('attachmentUrl com path', () => {
    expect(ticketsKeys.attachmentUrl('path/file.pdf')).toEqual([
      'ticket-attachment-url', 'path/file.pdf',
    ]);
  });

  it('summary com teamId opcional', () => {
    expect(ticketsKeys.summary('bu1')).toEqual(['tickets', 'summary', 'bu1', undefined]);
    expect(ticketsKeys.summary('bu1', 't1')).toEqual(['tickets', 'summary', 'bu1', 't1']);
  });

  it('partner prefix helpers', () => {
    expect(ticketsKeys.partnerServicesPrefix()).toEqual(['partner-services']);
    expect(ticketsKeys.partnerCategoriesPrefix()).toEqual(['partner-categories']);
    expect(ticketsKeys.partnerSubcategoriesPrefix()).toEqual(['partner-subcategories']);
    expect(ticketsKeys.contactCapabilitiesPrefix()).toEqual(['contact-capabilities']);
    expect(ticketsKeys.companyContactCapabilitiesPrefix()).toEqual(['company-contact-capabilities']);
  });

  it('routing rules', () => {
    expect(ticketsKeys.routingRules('bu1')).toEqual(['tickets', 'routing-rules', 'bu1']);
    expect(ticketsKeys.internalRoutingRules('bu1')).toEqual(['tickets', 'internal-routing-rules', 'bu1']);
  });

  it('viewers e companyFallbackContacts', () => {
    expect(ticketsKeys.viewers('t1')).toEqual(['ticket-viewers', 't1']);
    expect(ticketsKeys.companyFallbackContacts('bu1', 'c1')).toEqual([
      'company-fallback-contacts', 'bu1', 'c1',
    ]);
  });
});
