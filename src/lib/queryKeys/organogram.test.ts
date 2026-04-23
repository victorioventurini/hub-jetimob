/**
 * Tests for organogramKeys
 */
import { describe, it, expect } from 'vitest';
import { organogramKeys } from './organogram';

describe('organogramKeys', () => {
  it('all is BU-scoped', () => {
    expect(organogramKeys.all('bu-1')).toEqual(['organogram', 'bu-1']);
    expect(organogramKeys.all(null)).toEqual(['organogram', null]);
  });

  it('data and ceo namespaces are distinct', () => {
    expect(organogramKeys.data('bu-1')).toEqual(['organogram', 'data', 'bu-1']);
    expect(organogramKeys.ceo('bu-1')).toEqual(['organogram', 'ceo', 'bu-1']);
    expect(organogramKeys.data('bu-1')).not.toEqual(organogramKeys.ceo('bu-1'));
  });

  it('keys differ across BUs', () => {
    expect(organogramKeys.all('bu-1')).not.toEqual(organogramKeys.all('bu-2'));
  });
});
