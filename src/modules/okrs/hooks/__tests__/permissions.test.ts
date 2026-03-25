/**
 * OKR Permission Hooks — Integration Tests
 * 
 * Tests for useCanEditKr, useCanEditTeamObjective, useCanEditInitiative,
 * useCanManageTeamOkr, and useCanManageOrgOkr.
 * 
 * These hooks use useMemo over useProfileId, useManageableTeams, and usePermissions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCanEditKr } from '../useCanEditKr';
import { useCanEditTeamObjective } from '../useCanEditTeamObjective';
import { useCanEditInitiative } from '../useCanEditInitiative';
import { useCanManageTeamOkr, useCanManageOrgOkr } from '../useCanManageTeamOkr';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockProfileId = vi.fn<() => string | null>(() => 'profile-001');
const mockManageableTeams = vi.fn(() => ({
  teams: [] as { id: string }[],
  isLoading: false,
}));
const mockPermissions = vi.fn(() => ({
  has: (_key: string) => false,
  hasAny: (_keys: string[]) => false,
  hasAll: (_keys: string[]) => false,
  isWildcard: false,
  isLoading: false,
  permissions: [] as string[],
  isImpersonating: false,
}));

vi.mock('@/hooks/useIdentity', () => ({
  useProfileId: () => mockProfileId(),
}));

vi.mock('../useManageableTeams', () => ({
  useManageableTeams: () => mockManageableTeams(),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockPermissions(),
}));

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockProfileId.mockReturnValue('profile-001');
  mockManageableTeams.mockReturnValue({ teams: [], isLoading: false });
  mockPermissions.mockReturnValue({
    has: () => false,
    hasAny: () => false,
    hasAll: () => false,
    isWildcard: false,
    isLoading: false,
    permissions: [],
    isImpersonating: false,
  });
});

// ─── useCanEditKr ──────────────────────────────────────────────────────────────

describe('useCanEditKr', () => {
  it('returns canEdit=true when user is KR owner', () => {
    const kr = { team_id: 'team-1', owner_user_id: 'profile-001', co_responsibles: [] };
    const { result } = renderHook(() => useCanEditKr(kr));
    expect(result.current.canEdit).toBe(true);
  });

  it('returns canEdit=true when user is co-responsible', () => {
    const kr = { team_id: 'team-1', owner_user_id: 'other', co_responsibles: ['profile-001'] };
    const { result } = renderHook(() => useCanEditKr(kr));
    expect(result.current.canEdit).toBe(true);
  });

  it('returns canEdit=true when user is team leader (canManage)', () => {
    mockManageableTeams.mockReturnValue({ teams: [{ id: 'team-1' }], isLoading: false });
    const kr = { team_id: 'team-1', owner_user_id: 'other', co_responsibles: [] };
    const { result } = renderHook(() => useCanEditKr(kr));
    expect(result.current.canEdit).toBe(true);
  });

  it('returns canEdit=false when user has no relation to KR', () => {
    const kr = { team_id: 'team-1', owner_user_id: 'other', co_responsibles: ['someone-else'] };
    const { result } = renderHook(() => useCanEditKr(kr));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns canEdit=false when kr is null', () => {
    const { result } = renderHook(() => useCanEditKr(null));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns canEdit=false when profileId is null', () => {
    mockProfileId.mockReturnValue(null);
    const kr = { team_id: 'team-1', owner_user_id: 'profile-001', co_responsibles: [] };
    const { result } = renderHook(() => useCanEditKr(kr));
    expect(result.current.canEdit).toBe(false);
  });
});

// ─── useCanEditTeamObjective ───────────────────────────────────────────────────

describe('useCanEditTeamObjective', () => {
  it('returns canEdit=true when user is objective owner', () => {
    const obj = { team_id: 'team-1', owner_user_id: 'profile-001' };
    const { result } = renderHook(() => useCanEditTeamObjective(obj));
    expect(result.current.canEdit).toBe(true);
  });

  it('returns canEdit=true when user is team leader', () => {
    mockManageableTeams.mockReturnValue({ teams: [{ id: 'team-1' }], isLoading: false });
    const obj = { team_id: 'team-1', owner_user_id: 'other' };
    const { result } = renderHook(() => useCanEditTeamObjective(obj));
    expect(result.current.canEdit).toBe(true);
  });

  it('returns canEdit=false when user is neither owner nor leader', () => {
    const obj = { team_id: 'team-1', owner_user_id: 'other' };
    const { result } = renderHook(() => useCanEditTeamObjective(obj));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns canEdit=false when objective is null', () => {
    const { result } = renderHook(() => useCanEditTeamObjective(null));
    expect(result.current.canEdit).toBe(false);
  });
});

// ─── useCanEditInitiative ──────────────────────────────────────────────────────

describe('useCanEditInitiative', () => {
  it('returns canEdit=true when user is initiative owner', () => {
    const init = { owner_user_id: 'profile-001', contributors: [] };
    const { result } = renderHook(() => useCanEditInitiative(init, 'team-1'));
    expect(result.current.canEdit).toBe(true);
  });

  it('returns canEdit=true when user is contributor', () => {
    const init = { owner_user_id: 'other', contributors: ['profile-001'] };
    const { result } = renderHook(() => useCanEditInitiative(init, 'team-1'));
    expect(result.current.canEdit).toBe(true);
  });

  it('returns canEdit=true when user is team leader of KR team', () => {
    mockManageableTeams.mockReturnValue({ teams: [{ id: 'team-1' }], isLoading: false });
    const init = { owner_user_id: 'other', contributors: [] };
    const { result } = renderHook(() => useCanEditInitiative(init, 'team-1'));
    expect(result.current.canEdit).toBe(true);
  });

  it('returns canEdit=false when user has no relation', () => {
    const init = { owner_user_id: 'other', contributors: ['someone-else'] };
    const { result } = renderHook(() => useCanEditInitiative(init, 'team-1'));
    expect(result.current.canEdit).toBe(false);
  });

  it('returns canEdit=false when initiative is null', () => {
    const { result } = renderHook(() => useCanEditInitiative(null, 'team-1'));
    expect(result.current.canEdit).toBe(false);
  });
});

// ─── useCanManageTeamOkr ───────────────────────────────────────────────────────

describe('useCanManageTeamOkr', () => {
  it('returns canManage=true when user is admin (wildcard)', () => {
    mockPermissions.mockReturnValue({
      has: () => false, hasAny: () => false, hasAll: () => false,
      isWildcard: true, isLoading: false, permissions: ['*'], isImpersonating: false,
    });
    const { result } = renderHook(() => useCanManageTeamOkr('team-1'));
    expect(result.current.canManage).toBe(true);
  });

  it('returns canManage=true when teamId is in manageable teams', () => {
    mockManageableTeams.mockReturnValue({ teams: [{ id: 'team-1' }, { id: 'team-2' }], isLoading: false });
    const { result } = renderHook(() => useCanManageTeamOkr('team-1'));
    expect(result.current.canManage).toBe(true);
  });

  it('returns canManage=false when teamId is not in manageable teams', () => {
    mockManageableTeams.mockReturnValue({ teams: [{ id: 'team-2' }], isLoading: false });
    const { result } = renderHook(() => useCanManageTeamOkr('team-1'));
    expect(result.current.canManage).toBe(false);
  });

  it('returns canManage=false when teamId is null', () => {
    const { result } = renderHook(() => useCanManageTeamOkr(null));
    expect(result.current.canManage).toBe(false);
  });
});

// ─── useCanManageOrgOkr ────────────────────────────────────────────────────────

describe('useCanManageOrgOkr', () => {
  it('returns canManage=true when user is admin (wildcard)', () => {
    mockPermissions.mockReturnValue({
      has: () => false, hasAny: () => false, hasAll: () => false,
      isWildcard: true, isLoading: false, permissions: ['*'], isImpersonating: false,
    });
    const { result } = renderHook(() => useCanManageOrgOkr());
    expect(result.current.canManage).toBe(true);
  });

  it('returns canManage=true when user has okrs.org_objective.update:bu permission', () => {
    mockPermissions.mockReturnValue({
      has: ((key: string) => key === 'okrs.org_objective.update:bu') as (key: string) => boolean,
      hasAny: () => false, hasAll: () => false,
      isWildcard: false, isLoading: false,
      permissions: ['okrs.org_objective.update:bu'], isImpersonating: false,
    });
    const { result } = renderHook(() => useCanManageOrgOkr());
    expect(result.current.canManage).toBe(true);
  });

  it('returns canManage=false when user lacks permission', () => {
    const { result } = renderHook(() => useCanManageOrgOkr());
    expect(result.current.canManage).toBe(false);
  });
});
