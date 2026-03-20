/**
 * Tests for brand anonymization utility
 */
import { describe, it, expect } from 'vitest';
import { getBrandDisplayName, getBrandColor } from './anonymize';
import { SPONSOR_BRAND_ID, COMPETITORS_MOCK } from '../mocks/sponsor';

describe('getBrandDisplayName', () => {
  it('should return "Porto Seguro" for sponsor brand regardless of view mode', () => {
    expect(getBrandDisplayName(SPONSOR_BRAND_ID, 'sponsor')).toBe('Porto Seguro');
    expect(getBrandDisplayName(SPONSOR_BRAND_ID, 'admin')).toBe('Porto Seguro');
  });

  it('should return anonymous name in sponsor mode', () => {
    const competitor = COMPETITORS_MOCK[0];
    expect(getBrandDisplayName(competitor.id, 'sponsor')).toBe(competitor.anonymousName);
  });

  it('should return real name in admin mode', () => {
    const competitor = COMPETITORS_MOCK[0];
    expect(getBrandDisplayName(competitor.id, 'admin')).toBe(competitor.realName);
  });

  it('should return "Desconhecido" for unknown brand', () => {
    expect(getBrandDisplayName('unknown-id', 'sponsor')).toBe('Desconhecido');
    expect(getBrandDisplayName('unknown-id', 'admin')).toBe('Desconhecido');
  });
});

describe('getBrandColor', () => {
  it('should return sponsor color for sponsor brand', () => {
    expect(getBrandColor(SPONSOR_BRAND_ID)).toBe('hsl(210, 80%, 45%)');
  });

  it('should return competitor color for known competitor', () => {
    const competitor = COMPETITORS_MOCK[0];
    expect(getBrandColor(competitor.id)).toBe(competitor.color);
  });

  it('should return muted for unknown brand', () => {
    expect(getBrandColor('unknown-id')).toBe('hsl(var(--muted))');
  });
});
