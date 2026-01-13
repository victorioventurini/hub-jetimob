import { describe, it, expect } from 'vitest';
import { 
  RAG_STATUS_COLORS, 
  SURFACE_COLORS, 
  TICKET_STATUS_STYLES,
  ASSET_STATUS_STYLES,
  CONFIDENCE_COLORS,
  HEALTH_STATUS_COLORS,
  FEEDBACK_STYLES,
  AUDIT_STATUS_STYLES,
  getStatusStyle 
} from './colors';

describe('RAG_STATUS_COLORS', () => {
  it('should have all required statuses', () => {
    expect(RAG_STATUS_COLORS).toHaveProperty('green');
    expect(RAG_STATUS_COLORS).toHaveProperty('yellow');
    expect(RAG_STATUS_COLORS).toHaveProperty('red');
    expect(RAG_STATUS_COLORS).toHaveProperty('not_started');
  });

  it('should use semantic tokens', () => {
    Object.values(RAG_STATUS_COLORS).forEach((config) => {
      expect(config.dot).toMatch(/^bg-status-|^bg-muted/);
    });
  });
});

describe('CONFIDENCE_COLORS', () => {
  it('should have high/medium/low', () => {
    expect(CONFIDENCE_COLORS).toHaveProperty('high');
    expect(CONFIDENCE_COLORS).toHaveProperty('medium');
    expect(CONFIDENCE_COLORS).toHaveProperty('low');
  });
});

describe('HEALTH_STATUS_COLORS', () => {
  it('should have all health statuses', () => {
    expect(HEALTH_STATUS_COLORS).toHaveProperty('healthy');
    expect(HEALTH_STATUS_COLORS).toHaveProperty('attention');
    expect(HEALTH_STATUS_COLORS).toHaveProperty('risk');
    expect(HEALTH_STATUS_COLORS).toHaveProperty('critical');
  });
});

describe('SURFACE_COLORS', () => {
  it('should have all permission surfaces', () => {
    expect(SURFACE_COLORS).toHaveProperty('view');
    expect(SURFACE_COLORS).toHaveProperty('operate');
    expect(SURFACE_COLORS).toHaveProperty('administer');
    expect(SURFACE_COLORS).toHaveProperty('restricted');
  });
});

describe('FEEDBACK_STYLES', () => {
  it('should have warning/suggestion/success', () => {
    expect(FEEDBACK_STYLES).toHaveProperty('warning');
    expect(FEEDBACK_STYLES).toHaveProperty('suggestion');
    expect(FEEDBACK_STYLES).toHaveProperty('success');
  });
});

describe('AUDIT_STATUS_STYLES', () => {
  it('should have PASS/FAIL/PARTIAL', () => {
    expect(AUDIT_STATUS_STYLES).toHaveProperty('PASS');
    expect(AUDIT_STATUS_STYLES).toHaveProperty('FAIL');
    expect(AUDIT_STATUS_STYLES).toHaveProperty('PARTIAL');
  });
});

describe('getStatusStyle', () => {
  it('should return correct style for valid status', () => {
    const result = getStatusStyle(TICKET_STATUS_STYLES, 'done', 'waiting');
    expect(result).toBe(TICKET_STATUS_STYLES.done);
  });

  it('should return fallback for invalid status', () => {
    const result = getStatusStyle(TICKET_STATUS_STYLES, 'invalid', 'waiting');
    expect(result).toBe(TICKET_STATUS_STYLES.waiting);
  });
});
