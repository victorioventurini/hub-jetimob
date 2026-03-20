/**
 * Tests for webhook utility functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { simulateWebhookSend, buildOpportunityWebhookPayload } from './webhook';

describe('simulateWebhookSend', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1704067200000);
  });
  afterEach(() => vi.restoreAllMocks());

  it('should return a WebhookLog with required fields', () => {
    const payload = { test: true };
    const log = simulateWebhookSend(payload);

    expect(log.id).toMatch(/^wh-/);
    expect(log.timestamp).toBeDefined();
    expect(log.payload).toEqual(payload);
    expect([200, 500]).toContain(log.statusCode);
    expect(typeof log.success).toBe('boolean');
    expect(log.responseTime).toBeGreaterThanOrEqual(80);
    expect(log.responseTime).toBeLessThanOrEqual(480);
  });

  it('should return success=true when statusCode=200', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // > 0.15 → success
    const log = simulateWebhookSend({});
    expect(log.success).toBe(true);
    expect(log.statusCode).toBe(200);
  });

  it('should return success=false when statusCode=500', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.15 → failure
    const log = simulateWebhookSend({});
    expect(log.success).toBe(false);
    expect(log.statusCode).toBe(500);
  });

  it('should preserve the full payload', () => {
    const payload = { id: 'opp-1', score: 85, nested: { a: 1 } };
    const log = simulateWebhookSend(payload);
    expect(log.payload).toEqual(payload);
  });
});

describe('buildOpportunityWebhookPayload', () => {
  it('should build payload with event_type', () => {
    const result = buildOpportunityWebhookPayload(
      { id: 'opp-1' },
      { id: 'part-1' },
      { id: 'evt-1' }
    );
    expect(result.event_type).toBe('opportunity.created');
    expect(result.timestamp).toBeDefined();
  });

  it('should nest data with opportunity, participant, event', () => {
    const opp = { id: 'opp-1', score: 90 };
    const part = { id: 'part-1', name: 'Ana' };
    const evt = { id: 'evt-1', city: 'POA' };

    const result = buildOpportunityWebhookPayload(opp, part, evt);
    const data = result.data as Record<string, unknown>;

    expect(data.opportunity).toEqual(opp);
    expect(data.participant).toEqual(part);
    expect(data.event).toEqual(evt);
  });
});
