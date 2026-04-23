/**
 * Tests for getEffectiveKrRagStatus — canonical "started but not_started in DB" correction.
 */
import { describe, it, expect } from 'vitest';
import { getEffectiveKrRagStatus } from './effectiveStatus';

describe('getEffectiveKrRagStatus', () => {
  it('upgrades not_started → green when currentValue diverges from baseline', () => {
    expect(getEffectiveKrRagStatus('not_started', 0, 5)).toBe('green');
    expect(getEffectiveKrRagStatus('not_started', 100, 50)).toBe('green');
  });

  it('keeps not_started when currentValue equals baseline', () => {
    expect(getEffectiveKrRagStatus('not_started', 0, 0)).toBe('not_started');
    expect(getEffectiveKrRagStatus('not_started', 42, 42)).toBe('not_started');
  });

  it('does not modify other RAG statuses', () => {
    expect(getEffectiveKrRagStatus('green', 0, 0)).toBe('green');
    expect(getEffectiveKrRagStatus('yellow', 0, 0)).toBe('yellow');
    expect(getEffectiveKrRagStatus('red', 0, 0)).toBe('red');
    // Even with divergence, non-not_started statuses are preserved.
    expect(getEffectiveKrRagStatus('red', 0, 50)).toBe('red');
  });
});
