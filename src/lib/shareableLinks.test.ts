/**
 * Shareable Links Tests
 * 
 * Tests for URL generation utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getShareableUrl,
  getShareableAbsoluteUrl,
  ENTITY_LABELS,
  type ShareableEntity,
} from './shareableLinks';

describe('getShareableUrl', () => {
  it('should generate correct URL for asset', () => {
    const url = getShareableUrl('asset', 'abc-123');
    expect(url).toBe('/go/asset/abc-123');
  });

  it('should generate correct URL for team', () => {
    const url = getShareableUrl('team', 'team-uuid');
    expect(url).toBe('/go/team/team-uuid');
  });

  it('should generate correct URL for user', () => {
    const url = getShareableUrl('user', 'user-uuid');
    expect(url).toBe('/go/user/user-uuid');
  });

  it('should generate correct URL for ticket', () => {
    const url = getShareableUrl('ticket', 'ticket-uuid');
    expect(url).toBe('/go/ticket/ticket-uuid');
  });

  it('should generate correct URL for okr_org_objective', () => {
    const url = getShareableUrl('okr_org_objective', 'obj-uuid');
    expect(url).toBe('/go/okr_org_objective/obj-uuid');
  });

  it('should generate correct URL for okr_team_objective', () => {
    const url = getShareableUrl('okr_team_objective', 'team-obj-uuid');
    expect(url).toBe('/go/okr_team_objective/team-obj-uuid');
  });

  it('should generate correct URL for okr_org_kr', () => {
    const url = getShareableUrl('okr_org_kr', 'org-kr-uuid');
    expect(url).toBe('/go/okr_org_kr/org-kr-uuid');
  });

  it('should generate correct URL for okr_team_kr', () => {
    const url = getShareableUrl('okr_team_kr', 'team-kr-uuid');
    expect(url).toBe('/go/okr_team_kr/team-kr-uuid');
  });

  it('should generate correct URL for keyring', () => {
    const url = getShareableUrl('keyring', 'keyring-uuid');
    expect(url).toBe('/go/keyring/keyring-uuid');
  });

  it('should generate correct URL for gift', () => {
    const url = getShareableUrl('gift', 'gift-uuid');
    expect(url).toBe('/go/gift/gift-uuid');
  });

  it('should generate correct URL for kpi', () => {
    const url = getShareableUrl('kpi', 'kpi-uuid');
    expect(url).toBe('/go/kpi/kpi-uuid');
  });

  it('should handle UUID-format IDs correctly', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const url = getShareableUrl('asset', uuid);
    expect(url).toBe(`/go/asset/${uuid}`);
  });

  it('should handle empty ID', () => {
    const url = getShareableUrl('asset', '');
    expect(url).toBe('/go/asset/');
  });

  it('should handle ID with special characters', () => {
    // Note: IDs shouldn't have special chars, but we test for robustness
    const url = getShareableUrl('asset', 'abc/123');
    expect(url).toBe('/go/asset/abc/123');
  });
});

describe('getShareableAbsoluteUrl', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    // Mock window.location.origin
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          origin: 'https://hub.jetimob.com',
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('should generate absolute URL with origin', () => {
    const url = getShareableAbsoluteUrl('asset', 'abc-123');
    expect(url).toBe('https://hub.jetimob.com/go/asset/abc-123');
  });

  it('should generate absolute URL for ticket', () => {
    const url = getShareableAbsoluteUrl('ticket', 'ticket-uuid');
    expect(url).toBe('https://hub.jetimob.com/go/ticket/ticket-uuid');
  });

  it('should handle different origins', () => {
    Object.defineProperty(global, 'window', {
      value: {
        location: {
          origin: 'http://localhost:3000',
        },
      },
      writable: true,
    });
    
    const url = getShareableAbsoluteUrl('team', 'team-123');
    expect(url).toBe('http://localhost:3000/go/team/team-123');
  });

  it('should handle undefined window gracefully', () => {
    // @ts-expect-error - Testing edge case
    delete global.window;
    
    const url = getShareableAbsoluteUrl('asset', 'abc-123');
    expect(url).toBe('/go/asset/abc-123');
    
    // Restore
    global.window = originalWindow;
  });
});

describe('ENTITY_LABELS', () => {
  it('should have label for asset', () => {
    expect(ENTITY_LABELS.asset).toBe('Item do Inventário');
  });

  it('should have label for team', () => {
    expect(ENTITY_LABELS.team).toBe('Time');
  });

  it('should have label for user', () => {
    expect(ENTITY_LABELS.user).toBe('Usuário');
  });

  it('should have label for ticket', () => {
    expect(ENTITY_LABELS.ticket).toBe('Ticket');
  });

  it('should have label for okr_org_objective', () => {
    expect(ENTITY_LABELS.okr_org_objective).toBe('Objetivo Organizacional');
  });

  it('should have label for okr_team_objective', () => {
    expect(ENTITY_LABELS.okr_team_objective).toBe('Objetivo de Time');
  });

  it('should have label for okr_org_kr', () => {
    expect(ENTITY_LABELS.okr_org_kr).toBe('KR Organizacional');
  });

  it('should have label for okr_team_kr', () => {
    expect(ENTITY_LABELS.okr_team_kr).toBe('KR de Time');
  });

  it('should have label for keyring', () => {
    expect(ENTITY_LABELS.keyring).toBe('Chaveiro');
  });

  it('should have label for gift', () => {
    expect(ENTITY_LABELS.gift).toBe('Brinde');
  });

  it('should have label for kpi', () => {
    expect(ENTITY_LABELS.kpi).toBe('KPI');
  });

  it('should have labels for all ShareableEntity types', () => {
    const entities: ShareableEntity[] = [
      'asset',
      'team',
      'user',
      'ticket',
      'okr_org_objective',
      'okr_team_objective',
      'okr_org_kr',
      'okr_team_kr',
      'keyring',
      'gift',
      'kpi',
    ];
    
    entities.forEach(entity => {
      expect(ENTITY_LABELS[entity]).toBeDefined();
      expect(typeof ENTITY_LABELS[entity]).toBe('string');
      expect(ENTITY_LABELS[entity].length).toBeGreaterThan(0);
    });
  });
});
