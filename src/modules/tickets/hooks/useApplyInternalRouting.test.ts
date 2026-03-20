/**
 * Tests for matchInternalRoutingRule (pure function)
 */
import { describe, it, expect } from 'vitest';
import { matchInternalRoutingRule } from './useApplyInternalRouting';
import type { TicketInternalRoutingRule } from '../types';

function makeRule(overrides: Partial<TicketInternalRoutingRule> = {}): TicketInternalRoutingRule {
  return {
    id: 'rule-1',
    bu_id: 'bu-1',
    category_id: 'cat-1',
    subcategory_id: null,
    assignee_user_ids: ['user-a'],
    assignee_team_ids: [],
    assignee_squad_ids: [],
    watcher_user_ids: ['user-w'],
    watcher_team_ids: [],
    watcher_squad_ids: [],
    priority: 1,
    notes: null,
    created_at: '2026-01-01',
    created_by: null,
    updated_at: '2026-01-01',
    deleted_at: null,
    ...overrides,
  };
}

describe('matchInternalRoutingRule', () => {
  it('should return null for empty rules', () => {
    expect(matchInternalRoutingRule([], 'cat-1', null)).toBeNull();
  });

  it('should return null when categoryId is null', () => {
    expect(matchInternalRoutingRule([makeRule()], null, null)).toBeNull();
  });

  it('should return null when categoryId is undefined', () => {
    expect(matchInternalRoutingRule([makeRule()], undefined, undefined)).toBeNull();
  });

  it('should match by category_id when no subcategory', () => {
    const rules = [makeRule({ category_id: 'cat-1', subcategory_id: null })];
    const result = matchInternalRoutingRule(rules, 'cat-1', null);
    expect(result).toEqual({
      ownerUserId: 'user-a',
      assigneeUserIds: ['user-a'],
      watcherUserIds: ['user-w'],
    });
  });

  it('should prioritize subcategory match over category match', () => {
    const rules = [
      makeRule({ id: 'r1', category_id: 'cat-1', subcategory_id: null, assignee_user_ids: ['user-cat'] }),
      makeRule({ id: 'r2', category_id: 'cat-1', subcategory_id: 'sub-1', assignee_user_ids: ['user-sub'], watcher_user_ids: [] }),
    ];
    const result = matchInternalRoutingRule(rules, 'cat-1', 'sub-1');
    expect(result?.ownerUserId).toBe('user-sub');
    expect(result?.assigneeUserIds).toEqual(['user-sub']);
  });

  it('should fall back to category match when subcategory has no match', () => {
    const rules = [
      makeRule({ category_id: 'cat-1', subcategory_id: null, assignee_user_ids: ['user-cat'] }),
    ];
    const result = matchInternalRoutingRule(rules, 'cat-1', 'sub-nonexistent');
    expect(result?.ownerUserId).toBe('user-cat');
  });

  it('should return null when subcategory match has empty assignees', () => {
    const rules = [
      makeRule({ category_id: 'cat-1', subcategory_id: 'sub-1', assignee_user_ids: [] }),
    ];
    const result = matchInternalRoutingRule(rules, 'cat-1', 'sub-1');
    // Falls through to category match, which doesn't exist without subcategory_id=null
    expect(result).toBeNull();
  });

  it('should use first assignee as ownerUserId', () => {
    const rules = [
      makeRule({ assignee_user_ids: ['user-first', 'user-second', 'user-third'] }),
    ];
    const result = matchInternalRoutingRule(rules, 'cat-1', null);
    expect(result?.ownerUserId).toBe('user-first');
    expect(result?.assigneeUserIds).toHaveLength(3);
  });

  it('should not match different category', () => {
    const rules = [makeRule({ category_id: 'cat-2' })];
    expect(matchInternalRoutingRule(rules, 'cat-1', null)).toBeNull();
  });
});
