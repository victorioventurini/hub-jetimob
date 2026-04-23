/**
 * Tests for permissionsKeys — RBAC cache key contracts
 */
import { describe, it, expect } from 'vitest';
import { permissionsKeys } from './permissions';

describe('permissionsKeys — global', () => {
  it('catalog/groups/aliases are stable', () => {
    expect(permissionsKeys.catalog()).toEqual(['permissions', 'catalog']);
    expect(permissionsKeys.groups()).toEqual(['permissions', 'groups']);
    expect(permissionsKeys.aliases()).toEqual(['permissions', 'aliases']);
  });

  it('groupPermissions accepts null', () => {
    expect(permissionsKeys.groupPermissions(null)).toEqual(['permissions', 'group-permissions', null]);
    expect(permissionsKeys.groupPermissions('g1')).toEqual(['permissions', 'group-permissions', 'g1']);
  });
});

describe('permissionsKeys — V2 templates', () => {
  it('templatesV2 / templateItemsV2 produce expected shapes', () => {
    expect(permissionsKeys.templatesV2()).toEqual(['permissions', 'templates-v2']);
    expect(permissionsKeys.templateItemsV2('t1')).toEqual(['permissions', 'template-items-v2', 't1']);
  });

  it('userTemplatesV2 includes both buId and userId', () => {
    expect(permissionsKeys.userTemplatesV2('bu-1', 'u-1')).toEqual([
      'permissions',
      'user-templates-v2',
      'bu-1',
      'u-1',
    ]);
  });

  it('effectivePreview keys differ by mode', () => {
    const a = permissionsKeys.effectivePreview('bu', 'u', 'preview');
    const b = permissionsKeys.effectivePreview('bu', 'u', 'apply');
    expect(a).not.toEqual(b);
  });
});

describe('permissionsKeys — BU-scoped', () => {
  it('buConfigs/buUsers/userGroups/userOverrides include buId', () => {
    expect(permissionsKeys.buConfigs('bu-1')).toEqual(['permissions', 'bu-configs', 'bu-1']);
    expect(permissionsKeys.buUsers('bu-1')).toEqual(['permissions', 'bu-users', 'bu-1']);
    expect(permissionsKeys.userGroups('bu-1', 'u-1')).toContain('bu-1');
    expect(permissionsKeys.userOverrides('bu-1', 'u-1')).toContain('u-1');
  });

  it('userEffective and myPermissions follow consistent shape', () => {
    expect(permissionsKeys.userEffective('bu-1', 'u-1')).toEqual([
      'permissions',
      'user-effective',
      'bu-1',
      'u-1',
    ]);
    expect(permissionsKeys.myPermissions('bu-1', 'u-1')).toEqual([
      'permissions',
      'my',
      'bu-1',
      'u-1',
    ]);
  });

  it('migration helpers use migration-status / user-migration', () => {
    expect(permissionsKeys.migrationStatus('bu-1')[1]).toBe('migration-status');
    expect(permissionsKeys.userMigration('bu-1', 'u-1')[1]).toBe('user-migration');
  });

  it('audit key is buId-scoped', () => {
    expect(permissionsKeys.audit('bu-1')).toEqual(['permissions', 'audit', 'bu-1']);
  });
});
