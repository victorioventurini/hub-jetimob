/**
 * Initiative Type Tests
 * 
 * Tests for initiative helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
  getInitiativeStatusLabel,
  getInitiativeStatusColor,
  getInitiativePriorityLabel,
  getInitiativePriorityColor,
  type InitiativeStatus,
  type InitiativePriority,
} from './initiative';

// ============================================================
// getInitiativeStatusLabel Tests
// ============================================================

describe('getInitiativeStatusLabel', () => {
  it('should return correct label for planned', () => {
    expect(getInitiativeStatusLabel('planned')).toBe('Planejada');
  });

  it('should return correct label for in_progress', () => {
    expect(getInitiativeStatusLabel('in_progress')).toBe('Em progresso');
  });

  it('should return correct label for blocked', () => {
    expect(getInitiativeStatusLabel('blocked')).toBe('Bloqueada');
  });

  it('should return correct label for completed', () => {
    expect(getInitiativeStatusLabel('completed')).toBe('Concluída');
  });

  it('should handle all valid statuses', () => {
    const statuses: InitiativeStatus[] = ['planned', 'in_progress', 'blocked', 'completed'];
    const expectedLabels = ['Planejada', 'Em progresso', 'Bloqueada', 'Concluída'];
    
    statuses.forEach((status, index) => {
      expect(getInitiativeStatusLabel(status)).toBe(expectedLabels[index]);
    });
  });
});

// ============================================================
// getInitiativeStatusColor Tests
// ============================================================

describe('getInitiativeStatusColor', () => {
  it('should return a string for each status', () => {
    const statuses: InitiativeStatus[] = ['planned', 'in_progress', 'blocked', 'completed'];
    
    statuses.forEach(status => {
      const color = getInitiativeStatusColor(status);
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });

  it('should return a fallback for unknown status', () => {
    // @ts-expect-error - Testing invalid input
    const color = getInitiativeStatusColor('unknown_status');
    expect(color).toBe('bg-muted text-muted-foreground');
  });
});

// ============================================================
// getInitiativePriorityLabel Tests
// ============================================================

describe('getInitiativePriorityLabel', () => {
  it('should return correct label for low priority', () => {
    expect(getInitiativePriorityLabel('low')).toBe('Baixa');
  });

  it('should return correct label for medium priority', () => {
    expect(getInitiativePriorityLabel('medium')).toBe('Média');
  });

  it('should return correct label for high priority', () => {
    expect(getInitiativePriorityLabel('high')).toBe('Alta');
  });

  it('should return Média as default for null', () => {
    expect(getInitiativePriorityLabel(null)).toBe('Média');
  });

  it('should handle all valid priorities', () => {
    const priorities: InitiativePriority[] = ['low', 'medium', 'high'];
    const expectedLabels = ['Baixa', 'Média', 'Alta'];
    
    priorities.forEach((priority, index) => {
      expect(getInitiativePriorityLabel(priority)).toBe(expectedLabels[index]);
    });
  });
});

// ============================================================
// getInitiativePriorityColor Tests
// ============================================================

describe('getInitiativePriorityColor', () => {
  it('should return muted color for low priority', () => {
    const color = getInitiativePriorityColor('low');
    expect(color).toContain('muted');
  });

  it('should return semantic warning token for medium priority', () => {
    const color = getInitiativePriorityColor('medium');
    expect(color).toContain('warning');
  });

  it('should return semantic destructive token for high priority', () => {
    const color = getInitiativePriorityColor('high');
    expect(color).toContain('destructive');
  });

  it('should return muted color for null priority', () => {
    const color = getInitiativePriorityColor(null);
    expect(color).toContain('muted');
  });

  it('should return semantic token classes', () => {
    expect(getInitiativePriorityColor('medium')).toMatch(/text-/);
    expect(getInitiativePriorityColor('high')).toMatch(/text-/);
  });
});

// ============================================================
// Type Structure Tests
// ============================================================

describe('Initiative type structure', () => {
  it('should accept valid Initiative object', () => {
    const initiative = {
      id: 'init-123',
      name: 'Implement feature X',
      description: 'A detailed description',
      kr_id: 'kr-456',
      bu_id: 'bu-789',
      owner_user_id: 'user-001',
      status: 'in_progress' as InitiativeStatus,
      priority: 'high' as InitiativePriority,
      start_date: '2026-01-01',
      expected_end_date: '2026-03-31',
      progress: 45,
      contributors: ['user-002', 'user-003'],
      notes: 'Some notes here',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
      deleted_at: null,
    };

    expect(initiative.id).toBe('init-123');
    expect(initiative.status).toBe('in_progress');
    expect(initiative.priority).toBe('high');
    expect(initiative.contributors).toHaveLength(2);
  });

  it('should accept Initiative with optional owner data', () => {
    const initiativeWithOwner = {
      id: 'init-123',
      name: 'Test',
      description: null,
      kr_id: 'kr-456',
      bu_id: null,
      owner_user_id: 'user-001',
      status: 'planned' as InitiativeStatus,
      priority: null,
      start_date: null,
      expected_end_date: null,
      progress: null,
      contributors: null,
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null,
      owner: {
        id: 'user-001',
        display_name: 'John Doe',
        first_name: 'John',
        last_name: 'Doe',
        photo_url: 'https://example.com/photo.jpg',
      },
    };

    expect(initiativeWithOwner.owner?.display_name).toBe('John Doe');
    expect(initiativeWithOwner.priority).toBeNull();
  });
});

describe('CreateInitiativeInput type structure', () => {
  it('should require only mandatory fields', () => {
    const minimalInput = {
      name: 'New Initiative',
      kr_id: 'kr-123',
      owner_user_id: 'user-456',
    };

    expect(minimalInput.name).toBe('New Initiative');
    expect(minimalInput.kr_id).toBe('kr-123');
    expect(minimalInput.owner_user_id).toBe('user-456');
  });

  it('should accept all optional fields', () => {
    const fullInput = {
      name: 'Full Initiative',
      kr_id: 'kr-123',
      owner_user_id: 'user-456',
      description: 'Description here',
      bu_id: 'bu-789',
      status: 'in_progress' as InitiativeStatus,
      priority: 'high' as InitiativePriority,
      start_date: '2026-01-01',
      expected_end_date: '2026-03-31',
      progress: 25,
      contributors: ['user-001'],
      notes: 'Notes',
    };

    expect(fullInput.status).toBe('in_progress');
    expect(fullInput.priority).toBe('high');
    expect(fullInput.contributors).toHaveLength(1);
  });
});

describe('UpdateInitiativeInput type structure', () => {
  it('should require only id', () => {
    const minimalUpdate = {
      id: 'init-123',
    };

    expect(minimalUpdate.id).toBe('init-123');
  });

  it('should accept partial updates', () => {
    const partialUpdate = {
      id: 'init-123',
      status: 'completed' as InitiativeStatus,
      progress: 100,
    };

    expect(partialUpdate.status).toBe('completed');
    expect(partialUpdate.progress).toBe(100);
  });
});
