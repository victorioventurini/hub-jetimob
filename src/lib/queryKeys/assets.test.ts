/**
 * Wave 2 — Tests for assets query keys (deep namespace structure).
 */
import { describe, it, expect } from 'vitest';
import { assetsKeys } from './assets';

describe('assetsKeys.inventory', () => {
  it('all/list/detail/movements/history', () => {
    expect(assetsKeys.inventory.all('bu1')).toEqual(['assets', 'inventory', 'bu1']);
    expect(assetsKeys.inventory.list('bu1', { status: 'active' })).toEqual([
      'assets', 'inventory', 'list', 'bu1', { status: 'active' },
    ]);
    expect(assetsKeys.inventory.detail('a1')).toEqual(['assets', 'inventory', 'detail', 'a1']);
    expect(assetsKeys.inventory.movements('a1')).toEqual(['assets', 'inventory', 'movements', 'a1']);
    expect(assetsKeys.inventory.history('a1')).toEqual(['assets', 'inventory', 'history', 'a1']);
  });
});

describe('assetsKeys.groups', () => {
  it('todos namespaces', () => {
    expect(assetsKeys.groups.all('bu1')).toEqual(['assets', 'groups', 'bu1']);
    expect(assetsKeys.groups.detail('g1')).toEqual(['assets', 'groups', 'detail', 'g1']);
    expect(assetsKeys.groups.items('g1')).toEqual(['assets', 'groups', 'items', 'g1']);
    expect(assetsKeys.groups.byAsset('a1')).toEqual(['assets', 'groups', 'byAsset', 'a1']);
  });
});

describe('assetsKeys.keys', () => {
  it('keyrings com filters', () => {
    expect(assetsKeys.keys.keyrings('bu1', { search: 'X' })).toEqual([
      'asset-keyrings', 'bu1', { search: 'X' },
    ]);
  });
  it('clavicularies/movements/history/all', () => {
    expect(assetsKeys.keys.all('bu1')).toEqual(['asset-keys', 'bu1']);
    expect(assetsKeys.keys.clavicularies('bu1')).toEqual(['asset-clavicularies', 'bu1']);
    expect(assetsKeys.keys.movements('k1')).toEqual(['assets', 'keys', 'movements', 'k1']);
    expect(assetsKeys.keys.history('k1')).toEqual(['assets', 'keys', 'history', 'k1']);
  });
});

describe('assetsKeys.gifts', () => {
  it('items/batches/movements/all', () => {
    expect(assetsKeys.gifts.all('bu1')).toEqual(['assets', 'gifts', 'bu1']);
    expect(assetsKeys.gifts.items('bu1', { search: 'mug' })).toEqual([
      'asset-gift-items', 'bu1', { search: 'mug' },
    ]);
    expect(assetsKeys.gifts.batches('bu1')).toEqual(['asset-gift-batches', 'bu1']);
    expect(assetsKeys.gifts.movements('g1')).toEqual(['assets', 'gifts', 'movements', 'g1']);
  });
});

describe('assetsKeys.recommendations', () => {
  it('estrutura completa', () => {
    expect(assetsKeys.recommendations.all('bu1')).toEqual(['assets', 'recommendations', 'bu1']);
    expect(assetsKeys.recommendations.detail('r1')).toEqual(['assets', 'recommendations', 'detail', 'r1']);
    expect(assetsKeys.recommendations.byOwner('bu1', 'u1')).toEqual([
      'assets', 'recommendations', 'bu1', 'owner', 'u1',
    ]);
    expect(assetsKeys.recommendations.best({ teamId: 't1' })).toEqual([
      'assets', 'recommendations', 'best', { teamId: 't1' },
    ]);
    expect(assetsKeys.recommendations.lastValue('r1')).toEqual([
      'assets', 'recommendations', 'lastValue', 'r1',
    ]);
  });
});

describe('assetsKeys.phoneLines', () => {
  it('todos níveis', () => {
    expect(assetsKeys.phoneLines.all('bu1')).toEqual(['assets', 'phone-lines', 'bu1']);
    expect(assetsKeys.phoneLines.list('bu1', { active: true })).toEqual([
      'assets', 'phone-lines', 'list', 'bu1', { active: true },
    ]);
    expect(assetsKeys.phoneLines.carriers('bu1')).toEqual(['assets', 'phone-lines', 'carriers', 'bu1']);
    expect(assetsKeys.phoneLines.history('p1')).toEqual(['assets', 'phone-lines', 'history', 'p1']);
  });
});

describe('assetsKeys — flat keys', () => {
  it('categories/locations/permissions', () => {
    expect(assetsKeys.categories('bu1')).toEqual(['assets', 'categories', 'bu1']);
    expect(assetsKeys.locations('bu1')).toEqual(['assets', 'locations', 'bu1']);
    expect(assetsKeys.locationsOptions('bu1')).toEqual(['assets', 'locations-options', 'bu1']);
    expect(assetsKeys.permissions('bu1')).toEqual(['assets', 'permissions', 'bu1']);
    expect(assetsKeys.profilesForPermissions('bu1')).toEqual([
      'profiles-for-assets-permissions', 'bu1',
    ]);
  });
});
