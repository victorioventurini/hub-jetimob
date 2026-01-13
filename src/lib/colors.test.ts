import { describe, it, expect } from 'vitest';
import { 
  RAG_STATUS_COLORS, 
  SURFACE_COLORS, 
  TICKET_STATUS_STYLES,
  ASSET_STATUS_STYLES,
  getStatusStyle 
} from './colors';

describe('RAG_STATUS_COLORS', () => {
  it('should have all required statuses', () => {
    expect(RAG_STATUS_COLORS).toHaveProperty('green');
    expect(RAG_STATUS_COLORS).toHaveProperty('yellow');
    expect(RAG_STATUS_COLORS).toHaveProperty('red');
    expect(RAG_STATUS_COLORS).toHaveProperty('not_started');
  });

  it('should have consistent structure for each status', () => {
    Object.values(RAG_STATUS_COLORS).forEach((config) => {
      expect(config).toHaveProperty('dot');
      expect(config).toHaveProperty('text');
      expect(config).toHaveProperty('badge');
      expect(config).toHaveProperty('border');
    });
  });

  it('should use semantic tokens (no hardcoded colors)', () => {
    Object.values(RAG_STATUS_COLORS).forEach((config) => {
      expect(config.dot).toMatch(/^bg-status-|^bg-muted/);
      expect(config.badge).toMatch(/status-|muted/);
    });
  });
});

describe('SURFACE_COLORS', () => {
  it('should have all permission surfaces', () => {
    expect(SURFACE_COLORS).toHaveProperty('view');
    expect(SURFACE_COLORS).toHaveProperty('operate');
    expect(SURFACE_COLORS).toHaveProperty('administer');
    expect(SURFACE_COLORS).toHaveProperty('base');
    expect(SURFACE_COLORS).toHaveProperty('restricted');
  });

  it('should use semantic tokens', () => {
    Object.entries(SURFACE_COLORS).forEach(([key, config]) => {
      if (key === 'base') {
        expect(config.badge).toMatch(/muted/);
      } else {
        expect(config.badge).toMatch(/surface-/);
      }
    });
  });
});

describe('TICKET_STATUS_STYLES', () => {
  it('should have all ticket statuses', () => {
    expect(TICKET_STATUS_STYLES).toHaveProperty('waiting');
    expect(TICKET_STATUS_STYLES).toHaveProperty('paused');
    expect(TICKET_STATUS_STYLES).toHaveProperty('in_progress');
    expect(TICKET_STATUS_STYLES).toHaveProperty('done');
    expect(TICKET_STATUS_STYLES).toHaveProperty('discarded');
  });
});

describe('ASSET_STATUS_STYLES', () => {
  it('should have all asset statuses', () => {
    expect(ASSET_STATUS_STYLES).toHaveProperty('available');
    expect(ASSET_STATUS_STYLES).toHaveProperty('loaned');
    expect(ASSET_STATUS_STYLES).toHaveProperty('lost');
    expect(ASSET_STATUS_STYLES).toHaveProperty('retired');
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
