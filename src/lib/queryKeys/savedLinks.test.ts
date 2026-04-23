/**
 * Tests for savedLinksKeys
 */
import { describe, it, expect } from 'vitest';
import { savedLinksKeys } from './savedLinks';

describe('savedLinksKeys', () => {
  it('all is a stable tuple', () => {
    expect(savedLinksKeys.all).toEqual(['saved-links']);
  });

  it('list scopes by buId and module slug', () => {
    expect(savedLinksKeys.list('bu-1', 'okrs')).toEqual([
      'saved-links',
      'list',
      'bu-1',
      'okrs',
    ]);
  });

  it('favorite scopes by buId and module slug', () => {
    expect(savedLinksKeys.favorite('bu-1', 'kpis')).toEqual([
      'saved-links',
      'favorite',
      'bu-1',
      'kpis',
    ]);
  });

  it('byBu enables broad invalidation per BU', () => {
    expect(savedLinksKeys.byBu('bu-1')).toEqual(['saved-links', 'bu-1']);
  });

  it('list keys differ across modules', () => {
    expect(savedLinksKeys.list('bu-1', 'a')).not.toEqual(savedLinksKeys.list('bu-1', 'b'));
  });
});
