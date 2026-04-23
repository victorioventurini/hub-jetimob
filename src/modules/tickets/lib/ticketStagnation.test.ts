/**
 * Tests for ticket stagnation logic
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isTicketStagnant, getDaysSinceLastInteraction, STAGNATION_THRESHOLD_DAYS } from './ticketStagnation';

const NOW = new Date('2025-01-20T12:00:00Z');

function daysAgo(n: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('ticketStagnation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('STAGNATION_THRESHOLD_DAYS', () => {
    it('exposes the canonical threshold of 8 days', () => {
      expect(STAGNATION_THRESHOLD_DAYS).toBe(8);
    });
  });

  describe('isTicketStagnant', () => {
    it('returns false for tickets with status "done"', () => {
      const t = { status: 'done' as const, last_message_at: daysAgo(30), updated_at: daysAgo(30) };
      expect(isTicketStagnant(t)).toBe(false);
    });

    it('returns false for tickets with status "discarded"', () => {
      const t = { status: 'discarded' as const, last_message_at: daysAgo(30), updated_at: daysAgo(30) };
      expect(isTicketStagnant(t)).toBe(false);
    });

    it('returns false when no interaction timestamps exist', () => {
      const t = { status: 'in_progress' as const, last_message_at: null as any, updated_at: null as any };
      expect(isTicketStagnant(t)).toBe(false);
    });

    it('returns false when last interaction is recent (< 8 days)', () => {
      const t = { status: 'in_progress' as const, last_message_at: daysAgo(3), updated_at: daysAgo(1) };
      expect(isTicketStagnant(t)).toBe(false);
    });

    it('returns true when last_message_at is >= 8 days old', () => {
      const t = { status: 'in_progress' as const, last_message_at: daysAgo(10), updated_at: daysAgo(1) };
      expect(isTicketStagnant(t)).toBe(true);
    });

    it('falls back to updated_at when last_message_at is null', () => {
      const t = { status: 'waiting' as const, last_message_at: null as any, updated_at: daysAgo(15) };
      expect(isTicketStagnant(t)).toBe(true);
    });

    it('returns true exactly at threshold boundary (8 days)', () => {
      const t = { status: 'in_progress' as const, last_message_at: daysAgo(8), updated_at: daysAgo(8) };
      expect(isTicketStagnant(t)).toBe(true);
    });
  });

  describe('getDaysSinceLastInteraction', () => {
    it('returns 0 when no timestamps available', () => {
      expect(getDaysSinceLastInteraction({ last_message_at: null as any, updated_at: null as any })).toBe(0);
    });

    it('uses last_message_at when present', () => {
      expect(getDaysSinceLastInteraction({ last_message_at: daysAgo(5), updated_at: daysAgo(20) })).toBe(5);
    });

    it('falls back to updated_at when last_message_at is missing', () => {
      expect(getDaysSinceLastInteraction({ last_message_at: null as any, updated_at: daysAgo(12) })).toBe(12);
    });
  });
});
