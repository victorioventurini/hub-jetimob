/**
 * Tests for useProjectPermissionsV2 hook.
 *
 * Mirrors useAssetPermissionsV2 pattern:
 * - hasFullAccess respects impersonation (only isWildcard counts)
 * - Granular flags per resource (project, milestone)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@/test/test-utils';

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/BuContext', () => ({
  useBu: vi.fn(),
}));

vi.mock('@/contexts/ImpersonationContext', () => ({
  useOptionalImpersonation: vi.fn(),
}));

import { useProjectPermissionsV2 } from './useProjectPermissionsV2';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useBu } from '@/contexts/BuContext';
import { useOptionalImpersonation } from '@/contexts/ImpersonationContext';

const mockUsePermissions = vi.mocked(usePermissions);
const mockUseAuth = vi.mocked(useAuth);
const mockUseBu = vi.mocked(useBu);
const mockUseImpersonation = vi.mocked(useOptionalImpersonation);

function setupMocks(opts: {
  permissions?: string[];
  isWildcard?: boolean;
  isAdmin?: boolean;
  userRole?: string;
  isImpersonating?: boolean;
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
    isImpersonating: opts.isImpersonating ?? false,
  });
  mockUseAuth.mockReturnValue({
    user: null,
    session: null,
    profile: null,
    role: opts.isAdmin ? 'super_admin' : 'collaborator',
    isLoading: false,
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
    isAdmin: opts.isAdmin ?? false,
  } as any);
  mockUseBu.mockReturnValue({
    currentBu: { id: 'bu-1', name: 'Test BU' } as any,
    userRole: opts.userRole ?? 'collaborator',
    isLoading: false,
    userBus: [],
    setCurrentBu: vi.fn(),
    buMembership: null,
  } as any);
  mockUseImpersonation.mockReturnValue({
    isImpersonating: opts.isImpersonating ?? false,
    impersonatedUserId: null,
    startImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
  } as any);
}

describe('useProjectPermissionsV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grants full access to admin users', () => {
    setupMocks({ isAdmin: true });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.hasFullAccess).toBe(true);
    expect(result.current.canViewProjects).toBe(true);
    expect(result.current.canCreateProject).toBe(true);
    expect(result.current.canEditProject).toBe(true);
    expect(result.current.canDeleteProject).toBe(true);
    expect(result.current.canViewMilestones).toBe(true);
    expect(result.current.canCreateMilestone).toBe(true);
    expect(result.current.canEditMilestone).toBe(true);
  });

  it('grants full access to BU admins via userRole', () => {
    setupMocks({ userRole: 'admin' });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.hasFullAccess).toBe(true);
  });

  it('grants full access to wildcard users', () => {
    setupMocks({ isWildcard: true });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.hasFullAccess).toBe(true);
  });

  it('denies all by default for users without permissions', () => {
    setupMocks({});
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.hasFullAccess).toBe(false);
    expect(result.current.canViewProjects).toBe(false);
    expect(result.current.canCreateProject).toBe(false);
    expect(result.current.canEditProject).toBe(false);
    expect(result.current.canDeleteProject).toBe(false);
  });

  it('grants view-only with project read permission', () => {
    setupMocks({ permissions: ['projects.project.read:bu'] });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.canViewProjects).toBe(true);
    expect(result.current.canCreateProject).toBe(false);
    expect(result.current.canEditProject).toBe(false);
  });

  it('grants create with create permission', () => {
    setupMocks({ permissions: ['projects.project.create:bu'] });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.canCreateProject).toBe(true);
    expect(result.current.canViewProjects).toBe(false);
  });

  it('grants edit own with self_or_owner permission', () => {
    setupMocks({ permissions: ['projects.project.update:self_or_owner'] });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.canEditOwnProject).toBe(true);
    expect(result.current.canEditProject).toBe(false);
  });

  it('grants delete own with delete:self_or_owner permission', () => {
    setupMocks({ permissions: ['projects.project.delete:self_or_owner'] });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.canDeleteProject).toBe(true);
  });

  it('grants milestone create with milestone create permission', () => {
    setupMocks({ permissions: ['projects.milestone.create:bu'] });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.canCreateMilestone).toBe(true);
    expect(result.current.canViewMilestones).toBe(false);
  });

  it('uses only isWildcard during impersonation (caller admin does NOT grant access)', () => {
    setupMocks({ isAdmin: true, isImpersonating: true, isWildcard: false });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.hasFullAccess).toBe(false);
  });

  it('grants full access during impersonation when impersonated user is wildcard', () => {
    setupMocks({ isAdmin: true, isImpersonating: true, isWildcard: true });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.hasFullAccess).toBe(true);
  });

  it('ignores BU userRole=admin during impersonation', () => {
    setupMocks({ userRole: 'admin', isImpersonating: true, isWildcard: false });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.hasFullAccess).toBe(false);
  });

  it('reports loading state', () => {
    setupMocks({ isLoading: true });
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.isLoading).toBe(true);
  });
});
