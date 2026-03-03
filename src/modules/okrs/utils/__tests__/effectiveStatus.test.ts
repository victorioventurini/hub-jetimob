/**
 * Tests for getEffectiveKrRagStatus canonical utility
 */

import { describe, it, expect } from 'vitest';
import { getEffectiveKrRagStatus } from '../effectiveStatus';

describe('getEffectiveKrRagStatus', () => {
  it('returns not_started when baseline equals current_value', () => {
    expect(getEffectiveKrRagStatus('not_started', 0, 0)).toBe('not_started');
    expect(getEffectiveKrRagStatus('not_started', 100, 100)).toBe('not_started');
  });

  it('returns green when status is not_started but current_value differs from baseline', () => {
    expect(getEffectiveKrRagStatus('not_started', 0, 10)).toBe('green');
    expect(getEffectiveKrRagStatus('not_started', 100, 50)).toBe('green');
    expect(getEffectiveKrRagStatus('not_started', 0, 0.5)).toBe('green');
  });

  it('passes through non-not_started statuses unchanged', () => {
    expect(getEffectiveKrRagStatus('green', 0, 0)).toBe('green');
    expect(getEffectiveKrRagStatus('yellow', 0, 50)).toBe('yellow');
    expect(getEffectiveKrRagStatus('red', 0, 10)).toBe('red');
  });
});
