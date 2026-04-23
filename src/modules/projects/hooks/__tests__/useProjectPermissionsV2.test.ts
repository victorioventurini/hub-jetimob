import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectPermissionsV2 } from '../useProjectPermissionsV2';

// Mock dependencies
const mockHas = vi.fn((_key: string) => false);
const mockIsWildcard = false;
const mockPermissionsLoading = false;
const mockIsAdmin = false;
const mockUserRole = 'member';
const mockBuLoading = false;
const mockIsImpersonating = false;

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    has: mockHas,
    hasAny: vi.fn(() => false),
    isWildcard: mockIsWildcard,
    isLoading: mockPermissionsLoading,
    isImpersonating: mockIsImpersonating,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAdmin: mockIsAdmin,
  }),
}));

vi.mock('@/contexts/BuContext', () => ({
  useBu: () => ({
    userRole: mockUserRole,
    isLoading: mockBuLoading,
  }),
}));

vi.mock('@/contexts/ImpersonationContext', () => ({
  useOptionalImpersonation: () => ({
    isImpersonating: mockIsImpersonating,
  }),
}));

const OWNER = 'owner-profile-id';
const OTHER = 'other-profile-id';

describe('useProjectPermissionsV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHas.mockReturnValue(false);
  });

  it('denies all when no permissions', () => {
    const { result } = renderHook(() => useProjectPermissionsV2());

    expect(result.current.hasFullAccess).toBe(false);
    expect(result.current.canViewProjects).toBe(false);
    expect(result.current.canCreateProject).toBe(false);
    expect(result.current.canEditProject).toBe(false);
    expect(result.current.canDeleteProject).toBe(false);
    expect(result.current.canDeleteOwnProject).toBe(false);
    expect(result.current.canViewMilestones).toBe(false);
    expect(result.current.canCreateMilestone).toBe(false);
    expect(result.current.canEditMilestone).toBe(false);
    expect(result.current.canEditProjectRecord(OWNER, OWNER)).toBe(false);
    expect(result.current.canDeleteProjectRecord(OWNER, OWNER)).toBe(false);
  });

  it('grants view-only with read permission', () => {
    mockHas.mockImplementation((key: string) =>
      key === 'projects.project.read:bu' || key === 'projects.milestone.read:bu'
    );

    const { result } = renderHook(() => useProjectPermissionsV2());

    expect(result.current.canViewProjects).toBe(true);
    expect(result.current.canViewMilestones).toBe(true);
    expect(result.current.canCreateProject).toBe(false);
    expect(result.current.canEditProject).toBe(false);
    expect(result.current.canDeleteProject).toBe(false);
  });

  describe('row-aware helpers (self_or_owner)', () => {
    it('owner with update:self_or_owner CAN edit own project', () => {
      mockHas.mockImplementation((key: string) => key === 'projects.project.update:self_or_owner');
      const { result } = renderHook(() => useProjectPermissionsV2());

      expect(result.current.canEditOwnProject).toBe(true);
      expect(result.current.canEditProjectRecord(OWNER, OWNER)).toBe(true);
    });

    it('non-owner with update:self_or_owner CANNOT edit other project', () => {
      mockHas.mockImplementation((key: string) => key === 'projects.project.update:self_or_owner');
      const { result } = renderHook(() => useProjectPermissionsV2());

      expect(result.current.canEditProjectRecord(OWNER, OTHER)).toBe(false);
    });

    it('owner with delete:self_or_owner CAN archive own project', () => {
      mockHas.mockImplementation((key: string) => key === 'projects.project.delete:self_or_owner');
      const { result } = renderHook(() => useProjectPermissionsV2());

      expect(result.current.canDeleteOwnProject).toBe(true);
      expect(result.current.canDeleteProjectRecord(OWNER, OWNER)).toBe(true);
    });

    it('non-owner with delete:self_or_owner CANNOT archive other project', () => {
      mockHas.mockImplementation((key: string) => key === 'projects.project.delete:self_or_owner');
      const { result } = renderHook(() => useProjectPermissionsV2());

      expect(result.current.canDeleteProjectRecord(OWNER, OTHER)).toBe(false);
    });

    it('user with update:bu CAN edit any project', () => {
      mockHas.mockImplementation((key: string) => key === 'projects.project.update:bu');
      const { result } = renderHook(() => useProjectPermissionsV2());

      expect(result.current.canEditProject).toBe(true);
      expect(result.current.canEditProjectRecord(OWNER, OTHER)).toBe(true);
    });

    it('returns false when actorProfileId is null', () => {
      mockHas.mockImplementation((key: string) =>
        key === 'projects.project.update:self_or_owner' ||
        key === 'projects.project.delete:self_or_owner'
      );
      const { result } = renderHook(() => useProjectPermissionsV2());

      expect(result.current.canEditProjectRecord(OWNER, null)).toBe(false);
      expect(result.current.canDeleteProjectRecord(OWNER, null)).toBe(false);
    });

    it('returns false when ownerId is null', () => {
      mockHas.mockImplementation((key: string) =>
        key === 'projects.project.update:self_or_owner' ||
        key === 'projects.project.delete:self_or_owner'
      );
      const { result } = renderHook(() => useProjectPermissionsV2());

      expect(result.current.canEditProjectRecord(null, OWNER)).toBe(false);
      expect(result.current.canDeleteProjectRecord(null, OWNER)).toBe(false);
    });
  });

  it('returns isLoading when permissions are loading', () => {
    const { result } = renderHook(() => useProjectPermissionsV2());
    expect(result.current.isLoading).toBeDefined();
  });
});
