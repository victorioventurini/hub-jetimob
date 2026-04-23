/**
 * Tests for partnersKeys — global partner management keys
 */
import { describe, it, expect } from 'vitest';
import { partnersKeys } from './partners';

describe('partnersKeys', () => {
  it('all() is the global root', () => {
    expect(partnersKeys.all()).toEqual(['partners']);
  });

  it('list accepts optional filters object', () => {
    expect(partnersKeys.list()).toEqual(['partners', 'list', undefined]);
    expect(partnersKeys.list({ active: true })).toEqual(['partners', 'list', { active: true }]);
  });

  it('detail returns unique key per partnerId', () => {
    expect(partnersKeys.detail('p1')).not.toEqual(partnersKeys.detail('p2'));
    expect(partnersKeys.detail(null)).toEqual(['partners', 'detail', null]);
  });

  it('byDocument / byBu / buAssociations build expected paths', () => {
    expect(partnersKeys.byDocument('12345')).toEqual(['partners', 'by-document', '12345']);
    expect(partnersKeys.byBu('bu-1')).toEqual(['partners', 'by-bu', 'bu-1']);
    expect(partnersKeys.buAssociations('p1')).toEqual(['partners', 'bu-associations', 'p1']);
  });

  it('services/servicesByBu carry partnerId/buId', () => {
    expect(partnersKeys.services('p1')).toEqual(['partners', 'services', 'p1']);
    expect(partnersKeys.servicesByBu('bu-1', 'p1')).toEqual([
      'partners',
      'services-by-bu',
      'bu-1',
      'p1',
    ]);
    expect(partnersKeys.servicesByBu('bu-1')).toEqual([
      'partners',
      'services-by-bu',
      'bu-1',
      undefined,
    ]);
  });
});
