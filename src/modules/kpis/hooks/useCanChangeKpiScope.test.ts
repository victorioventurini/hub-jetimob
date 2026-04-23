/**
 * Tests for useCanChangeKpiScope hook.
 *
 * Validates v2.91.0 hierarchical scope-change rules:
 * - Admin/Wildcard: free org ↔ area ↔ team
 * - Team Leader: can move team-scoped KPI between teams they lead
 * - Cannot edit org/area scope as non-admin
 * - Collaborator: cannot change scope at all
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test/test-utils';

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/hooks/useTeamManagement', () => ({
  useTeamManagement: vi.fn(),
}));

import { useCanChangeKpiScope } from './useCanChangeKpiScope';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeamManagement } from '@/hooks/useTeamManagement';

const mockUsePermissions = vi.mocked(usePermissions);
const mockUseTeamManagement = vi.mocked(useTeamManagement);

function setup(opts: {
  isWildcard?: boolean;
  permissions?: string[];
  manageableTeamIds?: string[];
  permLoading?: boolean;
  teamLoading?: boolean;
} = {}) {
  const perms = opts.permissions ?? [];
  mockUsePermissions.mockReturnValue({
    permissions: perms,
    has: (k: string) => opts.isWildcard || perms.includes(k),
    hasAny: () => false,
    hasAll: () => false,
    isWildcard: opts.isWildcard ?? false,
    isLoading: opts.permLoading ?? false,
    isImpersonating: false,
  });
  const manageable = opts.manageableTeamIds ?? [];
  mockUseTeamManagement.mockReturnValue({
    manageableTeamIds: manageable,
    canManageTeam: (id: string) => manageable.includes(id),
    isLoading: opts.teamLoading ?? false,
  } as any);
}

describe('useCanChangeKpiScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false for null kpi', () => {
    setup({ isWildcard: true });
    const { result } = renderHook(() => useCanChangeKpiScope(null));
    expect(result.current.canChangeScope).toBe(false);
    expect(result.current.allowedScopes).toEqual([]);
  });

  it('grants full access for wildcard admin', () => {
    setup({ isWildcard: true });
    const { result } = renderHook(() =>
      useCanChangeKpiScope({ id: 'k1', scope: 'org' })
    );
    expect(result.current.canChangeScope).toBe(true);
    expect(result.current.allowedScopes).toEqual(['org', 'area', 'team']);
    expect(result.current.allowedTeamIds).toEqual([]); // empty = all
  });

  it('grants full access with kpis.settings.manage:bu permission', () => {
    setup({ permissions: ['kpis.settings.manage:bu'] });
    const { result } = renderHook(() =>
      useCanChangeKpiScope({ id: 'k1', scope: 'team', team_id: 't1' })
    );
    expect(result.current.canChangeScope).toBe(true);
    expect(result.current.allowedScopes).toContain('org');
  });

  it('denies non-admin from changing org-scoped KPI', () => {
    setup({ manageableTeamIds: ['t1', 't2'] });
    const { result } = renderHook(() =>
      useCanChangeKpiScope({ id: 'k1', scope: 'org' })
    );
    expect(result.current.canChangeScope).toBe(false);
  });

  it('denies non-admin from changing area-scoped KPI', () => {
    setup({ manageableTeamIds: ['t1'] });
    const { result } = renderHook(() =>
      useCanChangeKpiScope({ id: 'k1', scope: 'area' })
    );
    expect(result.current.canChangeScope).toBe(false);
  });

  it('allows team leader to move team KPI between manageable teams', () => {
    setup({ manageableTeamIds: ['t1', 't2', 't3'] });
    const { result } = renderHook(() =>
      useCanChangeKpiScope({ id: 'k1', scope: 'team', team_id: 't1' })
    );
    expect(result.current.canChangeScope).toBe(true);
    expect(result.current.allowedScopes).toEqual(['team']); // cannot promote
    expect(result.current.allowedTeamIds).toEqual(['t1', 't2', 't3']);
  });

  it('denies team leader for KPIs of teams they do NOT manage', () => {
    setup({ manageableTeamIds: ['t1'] });
    const { result } = renderHook(() =>
      useCanChangeKpiScope({ id: 'k1', scope: 'team', team_id: 't-other' })
    );
    expect(result.current.canChangeScope).toBe(false);
  });

  it('denies collaborator (no manageable teams, no permissions)', () => {
    setup({});
    const { result } = renderHook(() =>
      useCanChangeKpiScope({ id: 'k1', scope: 'team', team_id: 't1' })
    );
    expect(result.current.canChangeScope).toBe(false);
  });

  it('reports loading state from permissions', () => {
    setup({ permLoading: true });
    const { result } = renderHook(() =>
      useCanChangeKpiScope({ id: 'k1', scope: 'team', team_id: 't1' })
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('reports loading state from team management', () => {
    setup({ teamLoading: true });
    const { result } = renderHook(() =>
      useCanChangeKpiScope({ id: 'k1', scope: 'team', team_id: 't1' })
    );
    expect(result.current.isLoading).toBe(true);
  });
});
