/**
 * Tests for useCanManageTeamOkr & useCanManageOrgOkr hooks.
 *
 * Validates:
 * - Wildcard (admin) grants access to any team
 * - Leaders can manage their teams (and descendants) only
 * - Non-leaders cannot manage even if member
 * - Org OKR requires specific permission key
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test/test-utils';

vi.mock('./useManageableTeams', () => ({
  useManageableTeams: vi.fn(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/contexts/BuContext', () => ({
  useBu: vi.fn(),
}));

import { useCanManageTeamOkr, useCanManageOrgOkr } from './useCanManageTeamOkr';
import { useManageableTeams } from './useManageableTeams';
import { usePermissions } from '@/hooks/usePermissions';
import { useBu } from '@/contexts/BuContext';

const mockUseManageableTeams = vi.mocked(useManageableTeams);
const mockUsePermissions = vi.mocked(usePermissions);
const mockUseBu = vi.mocked(useBu);

function setupPermissions(opts: {
  permissions?: string[];
  isWildcard?: boolean;
  isLoading?: boolean;
} = {}) {
  const perms = opts.permissions ?? [];
  mockUsePermissions.mockReturnValue({
    permissions: perms,
    has: (k: string) => opts.isWildcard || perms.includes(k),
    hasAny: (keys: string[]) => opts.isWildcard || keys.some(k => perms.includes(k)),
    hasAll: (keys: string[]) => opts.isWildcard || keys.every(k => perms.includes(k)),
    isWildcard: opts.isWildcard ?? false,
    isLoading: opts.isLoading ?? false,
    isImpersonating: false,
  });
}

function setupTeams(teams: { id: string; name?: string }[], isLoading = false) {
  mockUseManageableTeams.mockReturnValue({
    teams: teams as any,
    isLoading,
    hasManageableTeams: teams.length > 0,
  } as any);
}

function setupBu(userRole: string | null = null) {
  mockUseBu.mockReturnValue({ userRole } as any);
}

describe('useCanManageTeamOkr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants access to wildcard (admin) for any team', () => {
    setupPermissions({ isWildcard: true });
    setupTeams([]);
    const { result } = renderHook(() => useCanManageTeamOkr('team-xyz'));
    expect(result.current.canManage).toBe(true);
  });

  it('grants access to wildcard even with null teamId', () => {
    setupPermissions({ isWildcard: true });
    setupTeams([]);
    const { result } = renderHook(() => useCanManageTeamOkr(null));
    expect(result.current.canManage).toBe(true);
  });

  it('denies when teamId is null and not wildcard', () => {
    setupPermissions({});
    setupTeams([{ id: 'team-1' }]);
    const { result } = renderHook(() => useCanManageTeamOkr(null));
    expect(result.current.canManage).toBe(false);
  });

  it('denies when teamId is undefined and not wildcard', () => {
    setupPermissions({});
    setupTeams([{ id: 'team-1' }]);
    const { result } = renderHook(() => useCanManageTeamOkr(undefined));
    expect(result.current.canManage).toBe(false);
  });

  it('grants when team is in manageable list (leader)', () => {
    setupPermissions({});
    setupTeams([{ id: 'team-1' }, { id: 'team-2' }]);
    const { result } = renderHook(() => useCanManageTeamOkr('team-2'));
    expect(result.current.canManage).toBe(true);
  });

  it('denies when team is NOT in manageable list', () => {
    setupPermissions({});
    setupTeams([{ id: 'team-1' }]);
    const { result } = renderHook(() => useCanManageTeamOkr('team-other'));
    expect(result.current.canManage).toBe(false);
  });

  it('denies when manageable list is empty (collaborator)', () => {
    setupPermissions({});
    setupTeams([]);
    const { result } = renderHook(() => useCanManageTeamOkr('team-1'));
    expect(result.current.canManage).toBe(false);
  });

  it('reports loading state from useManageableTeams', () => {
    setupPermissions({});
    setupTeams([], true);
    const { result } = renderHook(() => useCanManageTeamOkr('team-1'));
    expect(result.current.isLoading).toBe(true);
  });

  it('does NOT use isWildcard during impersonation when impersonated user is not wildcard', () => {
    // usePermissions already accounts for impersonation: isWildcard=false here
    setupPermissions({ isWildcard: false });
    setupTeams([{ id: 'team-1' }]);
    const { result } = renderHook(() => useCanManageTeamOkr('team-other'));
    expect(result.current.canManage).toBe(false);
  });
});

describe('useCanManageOrgOkr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTeams([]);
    setupBu();
  });

  it('grants access to wildcard', () => {
    setupPermissions({ isWildcard: true });
    const { result } = renderHook(() => useCanManageOrgOkr());
    expect(result.current.canManage).toBe(true);
  });

  it('grants access with an org_objective BU admin permission', () => {
    setupPermissions({ permissions: ['okrs.org_objective.create:bu'] });
    const { result } = renderHook(() => useCanManageOrgOkr());
    expect(result.current.canManage).toBe(true);
  });

  it('grants access when current BU membership role is admin', () => {
    setupPermissions({});
    setupBu('admin');
    const { result } = renderHook(() => useCanManageOrgOkr());
    expect(result.current.canManage).toBe(true);
  });

  it('denies without the specific permission', () => {
    setupPermissions({ permissions: ['okrs.team_objective.update:team'] });
    const { result } = renderHook(() => useCanManageOrgOkr());
    expect(result.current.canManage).toBe(false);
  });

  it('denies for users with no permissions', () => {
    setupPermissions({});
    const { result } = renderHook(() => useCanManageOrgOkr());
    expect(result.current.canManage).toBe(false);
  });

  it('reports loading state', () => {
    setupPermissions({ isLoading: true });
    const { result } = renderHook(() => useCanManageOrgOkr());
    expect(result.current.isLoading).toBe(true);
  });
});
